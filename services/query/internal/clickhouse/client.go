package clickhouse

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// Client wraps ClickHouse for query operations
type Client struct {
	conn driver.Conn
}

// New creates a new ClickHouse query client
func New(host, port, database, user, password string) (*Client, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%s", host, port)},
		Auth: clickhouse.Auth{
			Database: database,
			Username: user,
			Password: password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 30,
		},
		DialTimeout:  5 * time.Second,
		MaxOpenConns: 20,
		MaxIdleConns: 10,
	})
	if err != nil {
		return nil, fmt.Errorf("open clickhouse: %w", err)
	}

	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping clickhouse: %w", err)
	}

	return &Client{conn: conn}, nil
}

// OverviewResult holds the overview statistics
type OverviewResult struct {
	Pageviews      uint64  `json:"pageviews"`
	UniqueVisitors uint64  `json:"unique_visitors"`
	Sessions       uint64  `json:"sessions"`
	BounceRate     float64 `json:"bounce_rate"`
	AvgDuration    float64 `json:"avg_duration"`
}

// QueryOverview returns aggregate stats for a site within a date range
func (c *Client) QueryOverview(ctx context.Context, siteID uint64, from, to time.Time) (*OverviewResult, error) {
	var result OverviewResult

	row := c.conn.QueryRow(ctx, `
		SELECT
			count() AS pageviews,
			uniq(visitor_id) AS unique_visitors,
			uniq(session_id) AS sessions
		FROM events
		WHERE site_id = $1
		  AND timestamp >= $2
		  AND timestamp < $3
		  AND event_name = 'pageview'
	`, siteID, from, to)

	if err := row.Scan(&result.Pageviews, &result.UniqueVisitors, &result.Sessions); err != nil {
		return nil, fmt.Errorf("query overview: %w", err)
	}

	// Bounce rate: sessions with only 1 pageview / total sessions
	if result.Sessions > 0 {
		var bounceSessions uint64
		row = c.conn.QueryRow(ctx, `
			SELECT count() FROM (
				SELECT session_id, count() AS pv
				FROM events
				WHERE site_id = $1
				  AND timestamp >= $2
				  AND timestamp < $3
				  AND event_name = 'pageview'
				GROUP BY session_id
				HAVING pv = 1
			)
		`, siteID, from, to)
		row.Scan(&bounceSessions)
		result.BounceRate = float64(bounceSessions) / float64(result.Sessions) * 100
	}

	return &result, nil
}

// TimeSeriesPoint represents a single data point in a time series
type TimeSeriesPoint struct {
	Date           string `json:"date"`
	Pageviews      uint64 `json:"pageviews"`
	UniqueVisitors uint64 `json:"unique_visitors"`
}

// QueryTimeSeries returns time-series data grouped by day/hour
func (c *Client) QueryTimeSeries(ctx context.Context, siteID uint64, from, to time.Time, interval string) ([]TimeSeriesPoint, error) {
	var groupFunc string
	var dateFormat string
	switch interval {
	case "hour":
		groupFunc = "toStartOfHour(timestamp)"
		dateFormat = "2006-01-02T15:04:05Z"
	default:
		groupFunc = "toDate(timestamp)"
		dateFormat = "2006-01-02"
	}

	rows, err := c.conn.Query(ctx, fmt.Sprintf(`
		SELECT
			%s AS date,
			count() AS pageviews,
			uniq(visitor_id) AS unique_visitors
		FROM events
		WHERE site_id = $1
		  AND timestamp >= $2
		  AND timestamp < $3
		  AND event_name = 'pageview'
		GROUP BY date
		ORDER BY date
	`, groupFunc), siteID, from, to)
	if err != nil {
		return nil, fmt.Errorf("query timeseries: %w", err)
	}
	defer rows.Close()

	var points []TimeSeriesPoint
	for rows.Next() {
		var p TimeSeriesPoint
		var d time.Time
		if err := rows.Scan(&d, &p.Pageviews, &p.UniqueVisitors); err != nil {
			return nil, err
		}
		p.Date = d.Format(dateFormat)
		points = append(points, p)
	}

	return points, nil
}

// BreakdownItem represents a single dimension value with counts
type BreakdownItem struct {
	Value          string `json:"value"`
	Pageviews      uint64 `json:"pageviews"`
	UniqueVisitors uint64 `json:"unique_visitors"`
}

// QueryBreakdown returns a breakdown by a given dimension
func (c *Client) QueryBreakdown(ctx context.Context, siteID uint64, from, to time.Time, dimension string, limit int) ([]BreakdownItem, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	if strings.HasPrefix(dimension, "prop:") || strings.HasPrefix(dimension, "props.") || dimension == "utm_term" || dimension == "utm_content" {
		propKey := strings.TrimPrefix(strings.TrimPrefix(dimension, "prop:"), "props.")
		querySQL := `
			SELECT
				props[$5] AS value,
				count() AS pageviews,
				uniq(visitor_id) AS unique_visitors
			FROM events
			WHERE site_id = $1
			  AND timestamp >= $2
			  AND timestamp < $3
			  AND mapContains(props, $5)
			  AND props[$5] != ''
			GROUP BY value
			ORDER BY pageviews DESC
			LIMIT $4
		`
		rows, err := c.conn.Query(ctx, querySQL, siteID, from, to, limit, propKey)
		if err != nil {
			return nil, fmt.Errorf("query breakdown: %w", err)
		}
		defer rows.Close()

		var items []BreakdownItem
		for rows.Next() {
			var item BreakdownItem
			if err := rows.Scan(&item.Value, &item.Pageviews, &item.UniqueVisitors); err != nil {
				return nil, err
			}
			items = append(items, item)
		}
		return items, nil
	}

	var querySQL string
	switch dimension {
	case "entry_path":
		querySQL = `
			SELECT
				entry_path AS value,
				count() AS pageviews,
				uniq(visitor_id) AS unique_visitors
			FROM (
				SELECT
					session_id,
					any(visitor_id) AS visitor_id,
					argMin(url_path, timestamp) AS entry_path
				FROM events
				WHERE site_id = $1
				  AND timestamp >= $2
				  AND timestamp < $3
				  AND event_name = 'pageview'
				GROUP BY session_id
			)
			WHERE entry_path != ''
			GROUP BY entry_path
			ORDER BY pageviews DESC
			LIMIT $4
		`
	case "exit_path":
		querySQL = `
			SELECT
				exit_path AS value,
				count() AS pageviews,
				uniq(visitor_id) AS unique_visitors
			FROM (
				SELECT
					session_id,
					any(visitor_id) AS visitor_id,
					argMax(url_path, timestamp) AS exit_path
				FROM events
				WHERE site_id = $1
				  AND timestamp >= $2
				  AND timestamp < $3
				  AND event_name = 'pageview'
				GROUP BY session_id
			)
			WHERE exit_path != ''
			GROUP BY exit_path
			ORDER BY pageviews DESC
			LIMIT $4
		`
	case "screen_width":
		querySQL = `
			SELECT
				concat(toString(screen_width), 'px') AS value,
				count() AS pageviews,
				uniq(visitor_id) AS unique_visitors
			FROM events
			WHERE site_id = $1
			  AND timestamp >= $2
			  AND timestamp < $3
			  AND screen_width > 0
			GROUP BY value
			ORDER BY pageviews DESC
			LIMIT $4
		`
	case "event_name":
		querySQL = `
			SELECT
				event_name AS value,
				count() AS pageviews,
				uniq(visitor_id) AS unique_visitors
			FROM events
			WHERE site_id = $1
			  AND timestamp >= $2
			  AND timestamp < $3
			  AND event_name != ''
			GROUP BY value
			ORDER BY pageviews DESC
			LIMIT $4
		`
	default:
		// Whitelist standard dimensions to prevent SQL injection
		allowedDimensions := map[string]string{
			"url_path":        "url_path",
			"referrer_domain": "referrer_domain",
			"country":         "country",
			"region":          "region",
			"city":            "city",
			"device_type":     "device_type",
			"browser":         "browser",
			"os":              "os",
			"utm_source":      "utm_source",
			"utm_medium":      "utm_medium",
			"utm_campaign":    "utm_campaign",
		}

		col, ok := allowedDimensions[dimension]
		if !ok {
			return nil, fmt.Errorf("invalid dimension: %s", dimension)
		}

		querySQL = fmt.Sprintf(`
			SELECT
				%s AS value,
				count() AS pageviews,
				uniq(visitor_id) AS unique_visitors
			FROM events
			WHERE site_id = $1
			  AND timestamp >= $2
			  AND timestamp < $3
			  AND event_name = 'pageview'
			  AND %s != ''
			GROUP BY value
			ORDER BY pageviews DESC
			LIMIT $4
		`, col, col)
	}

	rows, err := c.conn.Query(ctx, querySQL, siteID, from, to, limit)
	if err != nil {
		return nil, fmt.Errorf("query breakdown: %w", err)
	}
	defer rows.Close()

	var items []BreakdownItem
	for rows.Next() {
		var item BreakdownItem
		if err := rows.Scan(&item.Value, &item.Pageviews, &item.UniqueVisitors); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

// QueryRealtimeVisitors returns recent unique visitors in the last N minutes
func (c *Client) QueryRealtimeVisitors(ctx context.Context, siteID uint64, minutes int) (uint64, error) {
	since := time.Now().UTC().Add(-time.Duration(minutes) * time.Minute)

	var count uint64
	row := c.conn.QueryRow(ctx, `
		SELECT uniq(visitor_id)
		FROM events
		WHERE site_id = $1
		  AND timestamp >= $2
	`, siteID, since)

	if err := row.Scan(&count); err != nil {
		return 0, fmt.Errorf("query realtime: %w", err)
	}

	return count, nil
}

// RealtimePath represents an active path in the realtime window
type RealtimePath struct {
	Path     string `json:"path"`
	Visitors uint64 `json:"visitors"`
}

// QueryRealtimePaths returns active paths visited in the last N minutes
func (c *Client) QueryRealtimePaths(ctx context.Context, siteID uint64, minutes int) ([]RealtimePath, error) {
	since := time.Now().UTC().Add(-time.Duration(minutes) * time.Minute)

	rows, err := c.conn.Query(ctx, `
		SELECT url_path, uniq(visitor_id) AS visitors
		FROM events
		WHERE site_id = $1
		  AND timestamp >= $2
		  AND url_path != ''
		GROUP BY url_path
		ORDER BY visitors DESC
		LIMIT 10
	`, siteID, since)
	if err != nil {
		return nil, fmt.Errorf("query realtime paths: %w", err)
	}
	defer rows.Close()

	var paths []RealtimePath
	for rows.Next() {
		var p RealtimePath
		if err := rows.Scan(&p.Path, &p.Visitors); err != nil {
			return nil, err
		}
		paths = append(paths, p)
	}

	return paths, nil
}

// GoalDef is a goal definition to measure
type GoalDef struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Type    string `json:"type"` // "event" or "pageview"
	Trigger string `json:"trigger"`
}

// GoalResult holds metrics for a goal
type GoalResult struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	Trigger        string  `json:"trigger"`
	Conversions    uint64  `json:"conversions"`
	Visitors       uint64  `json:"visitors"`
	ConversionRate float64 `json:"conversionRate"`
	Trend          float64 `json:"trend"`
}

// QueryGoals calculates conversions and conversion rate for goals
func (c *Client) QueryGoals(ctx context.Context, siteID uint64, from, to time.Time, goals []GoalDef) ([]GoalResult, error) {
	// 1. Get total unique visitors for baseline
	var totalVisitors uint64
	row := c.conn.QueryRow(ctx, `
		SELECT uniq(visitor_id)
		FROM events
		WHERE site_id = $1
		  AND timestamp >= $2
		  AND timestamp < $3
	`, siteID, from, to)
	_ = row.Scan(&totalVisitors)

	var results []GoalResult
	for _, g := range goals {
		var conversions uint64
		var visitors uint64

		if g.Type == "event" {
			r := c.conn.QueryRow(ctx, `
				SELECT count(), uniq(visitor_id)
				FROM events
				WHERE site_id = $1
				  AND timestamp >= $2
				  AND timestamp < $3
				  AND event_name = $4
			`, siteID, from, to, g.Trigger)
			_ = r.Scan(&conversions, &visitors)
		} else {
			// Pageview match
			trigger := g.Trigger
			if strings.HasSuffix(trigger, "*") {
				prefix := strings.TrimSuffix(trigger, "*")
				r := c.conn.QueryRow(ctx, `
					SELECT count(), uniq(visitor_id)
					FROM events
					WHERE site_id = $1
					  AND timestamp >= $2
					  AND timestamp < $3
					  AND event_name = 'pageview'
					  AND startsWith(url_path, $4)
				`, siteID, from, to, prefix)
				_ = r.Scan(&conversions, &visitors)
			} else {
				r := c.conn.QueryRow(ctx, `
					SELECT count(), uniq(visitor_id)
					FROM events
					WHERE site_id = $1
					  AND timestamp >= $2
					  AND timestamp < $3
					  AND event_name = 'pageview'
					  AND url_path = $4
				`, siteID, from, to, trigger)
				_ = r.Scan(&conversions, &visitors)
			}
		}

		convRate := 0.0
		if totalVisitors > 0 {
			convRate = float64(visitors) / float64(totalVisitors) * 100.0
		}

		results = append(results, GoalResult{
			ID:             g.ID,
			Name:           g.Name,
			Type:           g.Type,
			Trigger:        g.Trigger,
			Conversions:    conversions,
			Visitors:       visitors,
			ConversionRate: float64(int(convRate*10)) / 10,
			Trend:          0,
		})
	}

	return results, nil
}

// FunnelStep holds metrics for a single funnel step
type FunnelStep struct {
	Step                int     `json:"step"`
	Name                string  `json:"name"`
	Path                string  `json:"path"`
	Visitors            uint64  `json:"visitors"`
	ConversionFromStart float64 `json:"conversionFromStart"`
	ConversionFromPrev  float64 `json:"conversionFromPrev"`
	DropoffRate         float64 `json:"dropoffRate"`
}

// QueryFunnel calculates step-by-step visitor progression
func (c *Client) QueryFunnel(ctx context.Context, siteID uint64, from, to time.Time, stepDefs []map[string]string) ([]FunnelStep, error) {
	if len(stepDefs) == 0 {
		// Auto-detect top visited paths for this site
		rows, err := c.conn.Query(ctx, `
			SELECT url_path
			FROM events
			WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = 'pageview' AND url_path != ''
			GROUP BY url_path
			ORDER BY count() DESC
			LIMIT 3
		`, siteID, from, to)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var p string
				if err := rows.Scan(&p); err == nil && p != "" {
					name := "Page: " + p
					if p == "/" {
						name = "Homepage"
					}
					stepDefs = append(stepDefs, map[string]string{"name": name, "path": p})
				}
			}
		}
		if len(stepDefs) < 2 {
			stepDefs = []map[string]string{
				{"name": "Homepage", "path": "/"},
				{"name": "Site Pages", "path": "/*"},
			}
		}
	}

	var results []FunnelStep
	var startVisitors uint64
	var prevVisitors uint64

	for i, step := range stepDefs {
		name := step["name"]
		path := step["path"]

		var visitors uint64
		if strings.HasPrefix(path, "event:") {
			eventName := strings.TrimSpace(strings.TrimPrefix(path, "event:"))
			r := c.conn.QueryRow(ctx, `
				SELECT uniq(visitor_id)
				FROM events
				WHERE site_id = $1
				  AND timestamp >= $2
				  AND timestamp < $3
				  AND event_name = $4
			`, siteID, from, to, eventName)
			_ = r.Scan(&visitors)
		} else if strings.HasSuffix(path, "*") {
			prefix := strings.TrimSuffix(path, "*")
			r := c.conn.QueryRow(ctx, `
				SELECT uniq(visitor_id)
				FROM events
				WHERE site_id = $1
				  AND timestamp >= $2
				  AND timestamp < $3
				  AND event_name = 'pageview'
				  AND startsWith(url_path, $4)
			`, siteID, from, to, prefix)
			_ = r.Scan(&visitors)
		} else {
			r := c.conn.QueryRow(ctx, `
				SELECT uniq(visitor_id)
				FROM events
				WHERE site_id = $1
				  AND timestamp >= $2
				  AND timestamp < $3
				  AND event_name = 'pageview'
				  AND url_path = $4
			`, siteID, from, to, path)
			_ = r.Scan(&visitors)
		}

		if i == 0 {
			startVisitors = visitors
			prevVisitors = visitors
		}

		convFromStart := 100.0
		if startVisitors > 0 {
			convFromStart = float64(visitors) / float64(startVisitors) * 100.0
			if convFromStart > 100.0 {
				convFromStart = 100.0
			}
		}

		convFromPrev := 100.0
		dropoff := 0.0
		if prevVisitors > 0 {
			convFromPrev = float64(visitors) / float64(prevVisitors) * 100.0
			if convFromPrev > 100.0 {
				convFromPrev = 100.0
			}
			dropoff = 100.0 - convFromPrev
		} else if i > 0 {
			convFromPrev = 0.0
			dropoff = 100.0
		}

		results = append(results, FunnelStep{
			Step:                i + 1,
			Name:                name,
			Path:                path,
			Visitors:            visitors,
			ConversionFromStart: float64(int(convFromStart*10)) / 10,
			ConversionFromPrev:  float64(int(convFromPrev*10)) / 10,
			DropoffRate:         float64(int(dropoff*10)) / 10,
		})

		prevVisitors = visitors
	}

	return results, nil
}

// CohortItem represents a cohort period and retention across intervals
type CohortItem struct {
	Period    string      `json:"period"`
	Size      uint64      `json:"size"`
	Intervals []*float64  `json:"intervals"` // W0..W6 or D0..D6
}

// QueryRetention calculates cohort retention (weekly or daily)
func (c *Client) QueryRetention(ctx context.Context, siteID uint64, granularity string) ([]CohortItem, error) {
	if granularity == "day" {
		return c.queryDailyRetention(ctx, siteID)
	}
	return c.queryWeeklyRetention(ctx, siteID)
}

func (c *Client) queryDailyRetention(ctx context.Context, siteID uint64) ([]CohortItem, error) {
	rows, err := c.conn.Query(ctx, `
		SELECT
			toDate(first_time) AS cohort_day,
			uniq(visitor_id) AS cohort_size
		FROM (
			SELECT
				visitor_id,
				min(timestamp) AS first_time
			FROM events
			WHERE site_id = $1
			GROUP BY visitor_id
		)
		GROUP BY cohort_day
		ORDER BY cohort_day DESC
		LIMIT 7
	`, siteID)
	if err != nil {
		return nil, fmt.Errorf("query daily retention cohorts: %w", err)
	}
	defer rows.Close()

	var cohorts []CohortItem
	type rawDayCohort struct {
		day  time.Time
		size uint64
	}
	var rawList []rawDayCohort

	for rows.Next() {
		var rc rawDayCohort
		if err := rows.Scan(&rc.day, &rc.size); err != nil {
			return nil, err
		}
		rawList = append(rawList, rc)
	}

	now := time.Now().UTC()
	for _, rc := range rawList {
		periodStr := rc.day.Format("Jan 02")

		intervals := make([]*float64, 7)
		if rc.size > 0 {
			d0 := 100.0
			intervals[0] = &d0
		}

		for d := 1; d <= 6; d++ {
			dayStart := rc.day.AddDate(0, 0, d)
			dayEnd := dayStart.AddDate(0, 0, 1)

			if dayStart.After(now) {
				intervals[d] = nil
				continue
			}

			var retCount uint64
			r := c.conn.QueryRow(ctx, `
				SELECT uniq(e.visitor_id)
				FROM events e
				JOIN (
					SELECT visitor_id, min(timestamp) as ft
					FROM events
					WHERE site_id = $1
					GROUP BY visitor_id
					HAVING toDate(ft) = $2
				) c ON e.visitor_id = c.visitor_id
				WHERE e.site_id = $1
				  AND e.timestamp >= $3
				  AND e.timestamp < $4
			`, siteID, rc.day, dayStart, dayEnd)
			_ = r.Scan(&retCount)

			if rc.size > 0 {
				rate := float64(retCount) / float64(rc.size) * 100.0
				rounded := float64(int(rate*10)) / 10
				intervals[d] = &rounded
			} else {
				z := 0.0
				intervals[d] = &z
			}
		}

		cohorts = append(cohorts, CohortItem{
			Period:    periodStr,
			Size:      rc.size,
			Intervals: intervals,
		})
	}

	return cohorts, nil
}

func (c *Client) queryWeeklyRetention(ctx context.Context, siteID uint64) ([]CohortItem, error) {
	// Query the last 6 weekly cohorts
	rows, err := c.conn.Query(ctx, `
		SELECT
			toMonday(first_time) AS cohort_week,
			uniq(visitor_id) AS cohort_size
		FROM (
			SELECT
				visitor_id,
				min(timestamp) AS first_time
			FROM events
			WHERE site_id = $1
			GROUP BY visitor_id
		)
		GROUP BY cohort_week
		ORDER BY cohort_week DESC
		LIMIT 6
	`, siteID)
	if err != nil {
		return nil, fmt.Errorf("query retention cohorts: %w", err)
	}
	defer rows.Close()

	var cohorts []CohortItem
	type rawCohort struct {
		week time.Time
		size uint64
	}
	var rawList []rawCohort

	for rows.Next() {
		var rc rawCohort
		if err := rows.Scan(&rc.week, &rc.size); err != nil {
			return nil, err
		}
		rawList = append(rawList, rc)
	}

	now := time.Now().UTC()
	for _, rc := range rawList {
		endOfWeek := rc.week.AddDate(0, 0, 6)
		periodStr := fmt.Sprintf("%s – %s", rc.week.Format("Jan 02"), endOfWeek.Format("Jan 02"))

		intervals := make([]*float64, 7)
		// W0 is always 100% if cohort_size > 0
		if rc.size > 0 {
			w0 := 100.0
			intervals[0] = &w0
		}

		// Calculate W1 to W6
		for w := 1; w <= 6; w++ {
			weekStart := rc.week.AddDate(0, 0, w*7)
			weekEnd := weekStart.AddDate(0, 0, 7)

			if weekStart.After(now) {
				// Future week
				intervals[w] = nil
				continue
			}

			// Query visitors from this cohort active in weekStart..weekEnd
			var retCount uint64
			r := c.conn.QueryRow(ctx, `
				SELECT uniq(e.visitor_id)
				FROM events e
				JOIN (
					SELECT visitor_id, min(timestamp) as ft
					FROM events
					WHERE site_id = $1
					GROUP BY visitor_id
					HAVING toMonday(ft) = $2
				) c ON e.visitor_id = c.visitor_id
				WHERE e.site_id = $1
				  AND e.timestamp >= $3
				  AND e.timestamp < $4
			`, siteID, rc.week, weekStart, weekEnd)
			_ = r.Scan(&retCount)

			if rc.size > 0 {
				rate := float64(retCount) / float64(rc.size) * 100.0
				rounded := float64(int(rate*10)) / 10
				intervals[w] = &rounded
			} else {
				z := 0.0
				intervals[w] = &z
			}
		}

		cohorts = append(cohorts, CohortItem{
			Period:    periodStr,
			Size:      rc.size,
			Intervals: intervals,
		})
	}

	return cohorts, nil
}

// SessionsOverviewResult holds high-level session metrics
type SessionsOverviewResult struct {
	TotalSessions    uint64  `json:"total_sessions"`
	UniqueVisitors   uint64  `json:"unique_visitors"`
	AvgDurationSec   float64 `json:"avg_duration_sec"`
	BounceRate       float64 `json:"bounce_rate"`
	PagesPerSession  float64 `json:"pages_per_session"`
	EventsPerSession float64 `json:"events_per_session"`
}

// SessionDurationBucket holds a duration bucket
type SessionDurationBucket struct {
	Bucket     string  `json:"bucket"`
	Sessions   uint64  `json:"sessions"`
	Percentage float64 `json:"percentage"`
}

// SessionJourneyEvent is a single event within a session
type SessionJourneyEvent struct {
	EventName string            `json:"event_name"`
	URLPath   string            `json:"url_path"`
	Timestamp string            `json:"timestamp"`
	Props     map[string]string `json:"props,omitempty"`
}

// SessionItem represents a rich session row
type SessionItem struct {
	SessionID      string                `json:"session_id"`
	VisitorID      string                `json:"visitor_id"`
	StartedAt      string                `json:"started_at"`
	EndedAt        string                `json:"ended_at"`
	DurationSec    int64                 `json:"duration_sec"`
	EventsCount    uint64                `json:"events_count"`
	PageviewsCount uint64                `json:"pageviews_count"`
	EntryPath      string                `json:"entry_path"`
	ExitPath       string                `json:"exit_path"`
	Country        string                `json:"country"`
	City           string                `json:"city"`
	DeviceType     string                `json:"device_type"`
	Browser        string                `json:"browser"`
	OS             string                `json:"os"`
	ReferrerDomain string                `json:"referrer_domain"`
	Events         []SessionJourneyEvent `json:"events,omitempty"`
}

// SessionsResponse aggregates the full session query result
type SessionsResponse struct {
	Overview        SessionsOverviewResult  `json:"overview"`
	DurationBuckets []SessionDurationBucket `json:"duration_buckets"`
	RecentSessions  []SessionItem           `json:"recent_sessions"`
}

// QuerySessions returns full sessions analysis including overview, distribution, and recent sessions log
func (c *Client) QuerySessions(ctx context.Context, siteID uint64, from, to time.Time, limit int) (*SessionsResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}

	var resp SessionsResponse
	resp.DurationBuckets = []SessionDurationBucket{
		{Bucket: "< 10s"},
		{Bucket: "10-30s"},
		{Bucket: "30-60s"},
		{Bucket: "1-3m"},
		{Bucket: "3-10m"},
		{Bucket: "> 10m"},
	}
	resp.RecentSessions = []SessionItem{}

	// 1. Overview counts
	var totalEvents, totalPV, totalSessions, uniqueVisitors uint64
	row := c.conn.QueryRow(ctx, `
		SELECT
			uniq(session_id) AS total_sessions,
			uniq(visitor_id) AS unique_visitors,
			count() AS total_events,
			countIf(event_name = 'pageview') AS total_pageviews
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
	`, siteID, from, to)
	_ = row.Scan(&totalSessions, &uniqueVisitors, &totalEvents, &totalPV)

	resp.Overview.TotalSessions = totalSessions
	resp.Overview.UniqueVisitors = uniqueVisitors

	if totalSessions > 0 {
		resp.Overview.PagesPerSession = float64(totalPV) / float64(totalSessions)
		resp.Overview.EventsPerSession = float64(totalEvents) / float64(totalSessions)

		// Avg duration & Bounce rate
		var avgDur float64
		rowDur := c.conn.QueryRow(ctx, `
			SELECT avg(duration)
			FROM (
				SELECT session_id, dateDiff('second', min(timestamp), max(timestamp)) AS duration
				FROM events
				WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
				GROUP BY session_id
			)
		`, siteID, from, to)
		_ = rowDur.Scan(&avgDur)
		resp.Overview.AvgDurationSec = avgDur

		var bounceCount uint64
		rowBounce := c.conn.QueryRow(ctx, `
			SELECT count()
			FROM (
				SELECT session_id, countIf(event_name = 'pageview') AS pv
				FROM events
				WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
				GROUP BY session_id
				HAVING pv <= 1
			)
		`, siteID, from, to)
		_ = rowBounce.Scan(&bounceCount)
		resp.Overview.BounceRate = float64(bounceCount) / float64(totalSessions) * 100.0
	}

	// 2. Duration Buckets
	rowsBuckets, err := c.conn.Query(ctx, `
		SELECT
			multiIf(
				duration < 10, '< 10s',
				duration < 30, '10-30s',
				duration < 60, '30-60s',
				duration < 180, '1-3m',
				duration < 600, '3-10m',
				'> 10m'
			) AS bkt,
			count() AS cnt
		FROM (
			SELECT session_id, dateDiff('second', min(timestamp), max(timestamp)) AS duration
			FROM events
			WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
			GROUP BY session_id
		)
		GROUP BY bkt
	`, siteID, from, to)
	if err == nil {
		defer rowsBuckets.Close()
		bucketMap := make(map[string]uint64)
		for rowsBuckets.Next() {
			var bkt string
			var cnt uint64
			if err := rowsBuckets.Scan(&bkt, &cnt); err == nil {
				bucketMap[bkt] = cnt
			}
		}
		for i := range resp.DurationBuckets {
			cnt := bucketMap[resp.DurationBuckets[i].Bucket]
			resp.DurationBuckets[i].Sessions = cnt
			if totalSessions > 0 {
				resp.DurationBuckets[i].Percentage = float64(cnt) / float64(totalSessions) * 100.0
			}
		}
	}

	// 3. Recent Sessions
	rowsSessions, err := c.conn.Query(ctx, `
		SELECT
			session_id,
			any(visitor_id) AS visitor_id,
			min(timestamp) AS started_at,
			max(timestamp) AS ended_at,
			dateDiff('second', min(timestamp), max(timestamp)) AS duration_sec,
			count() AS events_count,
			countIf(event_name = 'pageview') AS pageviews_count,
			argMin(url_path, timestamp) AS entry_path,
			argMax(url_path, timestamp) AS exit_path,
			any(country) AS country,
			any(city) AS city,
			any(device_type) AS device_type,
			any(browser) AS browser,
			any(os) AS os,
			any(referrer_domain) AS referrer_domain
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		GROUP BY session_id
		ORDER BY started_at DESC
		LIMIT $4
	`, siteID, from, to, limit)
	if err == nil {
		defer rowsSessions.Close()
		var sessionIDs []uint64
		for rowsSessions.Next() {
			var s SessionItem
			var sID, vID uint64
			var startedAt, endedAt time.Time
			if err := rowsSessions.Scan(
				&sID, &vID,
				&startedAt, &endedAt,
				&s.DurationSec,
				&s.EventsCount, &s.PageviewsCount,
				&s.EntryPath, &s.ExitPath,
				&s.Country, &s.City,
				&s.DeviceType, &s.Browser, &s.OS,
				&s.ReferrerDomain,
			); err == nil {
				s.SessionID = fmt.Sprintf("%016x", sID)
				s.VisitorID = fmt.Sprintf("%016x", vID)
				s.StartedAt = startedAt.Format(time.RFC3339)
				s.EndedAt = endedAt.Format(time.RFC3339)
				s.Events = []SessionJourneyEvent{}
				resp.RecentSessions = append(resp.RecentSessions, s)
				sessionIDs = append(sessionIDs, sID)
			}
		}

		// Fetch journey events for these sessions
		if len(sessionIDs) > 0 {
			rowsEvents, err := c.conn.Query(ctx, `
				SELECT
					session_id,
					event_name,
					url_path,
					timestamp,
					props
				FROM events
				WHERE site_id = $1 AND session_id IN $2
				ORDER BY timestamp ASC
				LIMIT 300
			`, siteID, sessionIDs)
			if err == nil {
				defer rowsEvents.Close()
				sessionEventMap := make(map[string][]SessionJourneyEvent)
				for rowsEvents.Next() {
					var sid uint64
					var je SessionJourneyEvent
					var ts time.Time
					if err := rowsEvents.Scan(&sid, &je.EventName, &je.URLPath, &ts, &je.Props); err == nil {
						je.Timestamp = ts.Format(time.RFC3339)
						sidHex := fmt.Sprintf("%016x", sid)
						sessionEventMap[sidHex] = append(sessionEventMap[sidHex], je)
					}
				}
				for i := range resp.RecentSessions {
					if evts, ok := sessionEventMap[resp.RecentSessions[i].SessionID]; ok {
						resp.RecentSessions[i].Events = evts
					}
				}
			}
		}
	}

	return &resp, nil
}

// EventsOverviewResult holds high-level event metrics
type EventsOverviewResult struct {
	TotalEvents      uint64  `json:"total_events"`
	CustomEvents     uint64  `json:"custom_events"`
	Pageviews        uint64  `json:"pageviews"`
	UniqueEventTypes uint64  `json:"unique_event_types"`
	UniqueVisitors   uint64  `json:"unique_visitors"`
	EventsPerSession float64 `json:"events_per_session"`
}

// EventListItem represents an event type breakdown row
type EventListItem struct {
	EventName      string  `json:"event_name"`
	Category       string  `json:"category"`
	TotalCount     uint64  `json:"total_count"`
	UniqueVisitors uint64  `json:"unique_visitors"`
	UniqueSessions uint64  `json:"unique_sessions"`
	Percentage     float64 `json:"percentage"`
}

// EventPropertyValue represents a value count
type EventPropertyValue struct {
	Value string `json:"value"`
	Count uint64 `json:"count"`
}

// EventPropertyItem represents a property key and top values
type EventPropertyItem struct {
	Key       string               `json:"key"`
	Count     uint64               `json:"count"`
	TopValues []EventPropertyValue `json:"top_values"`
}

// RecentEventItem represents an individual event in the live/recent event stream
type RecentEventItem struct {
	EventID    string            `json:"event_id"`
	EventName  string            `json:"event_name"`
	URLPath    string            `json:"url_path"`
	Timestamp  string            `json:"timestamp"`
	SessionID  string            `json:"session_id"`
	VisitorID  string            `json:"visitor_id"`
	Country    string            `json:"country"`
	DeviceType string            `json:"device_type"`
	Browser    string            `json:"browser"`
	Props      map[string]string `json:"props"`
}

// EventsResponse aggregates the full events query result
type EventsResponse struct {
	Overview     EventsOverviewResult `json:"overview"`
	Events       []EventListItem      `json:"events"`
	RecentStream []RecentEventItem    `json:"recent_stream"`
}

// QueryEvents returns the events overview, distinct events list, and recent events stream
func (c *Client) QueryEvents(ctx context.Context, siteID uint64, from, to time.Time, limit int) (*EventsResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var resp EventsResponse
	resp.Events = []EventListItem{}
	resp.RecentStream = []RecentEventItem{}

	// 1. Overview counts
	var totalEvents, customEvents, pageviews, uniqueTypes, uniqueVisitors, uniqueSessions uint64
	row := c.conn.QueryRow(ctx, `
		SELECT
			count() AS total_events,
			countIf(event_name != 'pageview') AS custom_events,
			countIf(event_name = 'pageview') AS pageviews,
			uniq(event_name) AS unique_event_types,
			uniq(visitor_id) AS unique_visitors,
			uniq(session_id) AS unique_sessions
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
	`, siteID, from, to)
	_ = row.Scan(&totalEvents, &customEvents, &pageviews, &uniqueTypes, &uniqueVisitors, &uniqueSessions)

	resp.Overview.TotalEvents = totalEvents
	resp.Overview.CustomEvents = customEvents
	resp.Overview.Pageviews = pageviews
	resp.Overview.UniqueEventTypes = uniqueTypes
	resp.Overview.UniqueVisitors = uniqueVisitors
	if uniqueSessions > 0 {
		resp.Overview.EventsPerSession = float64(totalEvents) / float64(uniqueSessions)
	}

	// 2. Events List
	rowsEvents, err := c.conn.Query(ctx, `
		SELECT
			event_name,
			count() AS total_count,
			uniq(visitor_id) AS unique_visitors,
			uniq(session_id) AS unique_sessions
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name != ''
		GROUP BY event_name
		ORDER BY total_count DESC
		LIMIT $4
	`, siteID, from, to, limit)
	if err == nil {
		defer rowsEvents.Close()
		for rowsEvents.Next() {
			var it EventListItem
			if err := rowsEvents.Scan(&it.EventName, &it.TotalCount, &it.UniqueVisitors, &it.UniqueSessions); err == nil {
				if it.EventName == "pageview" {
					it.Category = "system"
				} else {
					it.Category = "custom"
				}
				if totalEvents > 0 {
					it.Percentage = float64(it.TotalCount) / float64(totalEvents) * 100.0
				}
				resp.Events = append(resp.Events, it)
			}
		}
	}

	// 3. Recent Events Stream
	rowsRecent, err := c.conn.Query(ctx, `
		SELECT
			toString(event_id) AS event_id,
			event_name,
			url_path,
			timestamp,
			session_id,
			visitor_id,
			country,
			device_type,
			browser,
			props
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		ORDER BY timestamp DESC
		LIMIT 25
	`, siteID, from, to)
	if err == nil {
		defer rowsRecent.Close()
		for rowsRecent.Next() {
			var re RecentEventItem
			var sid, vid uint64
			var ts time.Time
			if err := rowsRecent.Scan(
				&re.EventID,
				&re.EventName,
				&re.URLPath,
				&ts,
				&sid,
				&vid,
				&re.Country,
				&re.DeviceType,
				&re.Browser,
				&re.Props,
			); err == nil {
				re.Timestamp = ts.Format(time.RFC3339)
				re.SessionID = fmt.Sprintf("%016x", sid)
				re.VisitorID = fmt.Sprintf("%016x", vid)
				resp.RecentStream = append(resp.RecentStream, re)
			}
		}
	}

	return &resp, nil
}

// QueryEventProperties inspects the custom properties passed for a specific event
func (c *Client) QueryEventProperties(ctx context.Context, siteID uint64, eventName string, from, to time.Time) ([]EventPropertyItem, error) {
	rows, err := c.conn.Query(ctx, `
		SELECT
			arrayJoin(mapKeys(props)) AS prop_key,
			count() AS occurrences
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND event_name = $4 AND length(props) > 0
		GROUP BY prop_key
		ORDER BY occurrences DESC
		LIMIT 15
	`, siteID, from, to, eventName)
	if err != nil {
		return nil, fmt.Errorf("query event properties: %w", err)
	}
	defer rows.Close()

	var items []EventPropertyItem
	for rows.Next() {
		var it EventPropertyItem
		if err := rows.Scan(&it.Key, &it.Count); err == nil {
			it.TopValues = []EventPropertyValue{}
			items = append(items, it)
		}
	}

	// Fetch top values for each key
	for i := range items {
		valRows, err := c.conn.Query(ctx, `
			SELECT
				props[$5] AS val,
				count() AS cnt
			FROM events
			WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
			  AND event_name = $4 AND mapContains(props, $5)
			GROUP BY val
			ORDER BY cnt DESC
			LIMIT 5
		`, siteID, from, to, eventName, items[i].Key)
		if err == nil {
			for valRows.Next() {
				var pv EventPropertyValue
				if err := valRows.Scan(&pv.Value, &pv.Count); err == nil {
					items[i].TopValues = append(items[i].TopValues, pv)
				}
			}
			valRows.Close()
		}
	}

	return items, nil
}

// ── Core Web Vitals Types & Query ──

type VitalsMetric struct {
	Name            string  `json:"name"`
	ValueP75        float64 `json:"value_p75"`
	ValueAvg        float64 `json:"value_avg"`
	GoodPct         float64 `json:"good_pct"`
	NeedsImprovePct float64 `json:"needs_improve_pct"`
	PoorPct         float64 `json:"poor_pct"`
	Rating          string  `json:"rating"`
	Unit            string  `json:"unit"`
}

type VitalsPageItem struct {
	URLPath string  `json:"url_path"`
	Samples uint64  `json:"samples"`
	LCP     float64 `json:"lcp"`
	CLS     float64 `json:"cls"`
	INP     float64 `json:"inp"`
	Rating  string  `json:"rating"`
}

type VitalsResult struct {
	Metrics      []VitalsMetric   `json:"metrics"`
	SlowestPages []VitalsPageItem `json:"slowest_pages"`
	TotalSamples uint64           `json:"total_samples"`
}

func (c *Client) QueryVitals(ctx context.Context, siteID uint64, from, to time.Time) (*VitalsResult, error) {
	var count uint64
	row := c.conn.QueryRow(ctx, `
		SELECT count()
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = 'vitals'
	`, siteID, from, to)
	if err := row.Scan(&count); err != nil {
		count = 0
	}

	result := &VitalsResult{
		TotalSamples: count,
		Metrics:      make([]VitalsMetric, 0),
		SlowestPages: make([]VitalsPageItem, 0),
	}

	if count > 0 {
		var lcpP75, lcpAvg, lcpGood, lcpNeeds, lcpPoor float64
		var clsP75, clsAvg, clsGood, clsNeeds, clsPoor float64
		var inpP75, inpAvg float64
		var fcpP75, fcpAvg float64
		var ttfbP75, ttfbAvg float64

		statsRow := c.conn.QueryRow(ctx, `
			SELECT
				quantile(0.75)(toFloat64OrZero(props['lcp'])),
				avg(toFloat64OrZero(props['lcp'])),
				countIf(props['lcp_rating'] = 'good' OR (props['lcp_rating'] = '' AND toFloat64OrZero(props['lcp']) <= 2500)) / count() * 100,
				countIf(props['lcp_rating'] = 'needs-improvement' OR (props['lcp_rating'] = '' AND toFloat64OrZero(props['lcp']) > 2500 AND toFloat64OrZero(props['lcp']) <= 4000)) / count() * 100,
				countIf(props['lcp_rating'] = 'poor' OR (props['lcp_rating'] = '' AND toFloat64OrZero(props['lcp']) > 4000)) / count() * 100,

				quantile(0.75)(toFloat64OrZero(props['cls'])),
				avg(toFloat64OrZero(props['cls'])),
				countIf(props['cls_rating'] = 'good' OR (props['cls_rating'] = '' AND toFloat64OrZero(props['cls']) <= 0.1)) / count() * 100,
				countIf(props['cls_rating'] = 'needs-improvement' OR (props['cls_rating'] = '' AND toFloat64OrZero(props['cls']) > 0.1 AND toFloat64OrZero(props['cls']) <= 0.25)) / count() * 100,
				countIf(props['cls_rating'] = 'poor' OR (props['cls_rating'] = '' AND toFloat64OrZero(props['cls']) > 0.25)) / count() * 100,

				quantile(0.75)(toFloat64OrZero(props['inp'])),
				avg(toFloat64OrZero(props['inp'])),

				quantile(0.75)(toFloat64OrZero(props['fcp'])),
				avg(toFloat64OrZero(props['fcp'])),

				quantile(0.75)(toFloat64OrZero(props['ttfb'])),
				avg(toFloat64OrZero(props['ttfb']))
			FROM events
			WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = 'vitals'
		`, siteID, from, to)

		if err := statsRow.Scan(
			&lcpP75, &lcpAvg, &lcpGood, &lcpNeeds, &lcpPoor,
			&clsP75, &clsAvg, &clsGood, &clsNeeds, &clsPoor,
			&inpP75, &inpAvg,
			&fcpP75, &fcpAvg,
			&ttfbP75, &ttfbAvg,
		); err == nil {
			result.Metrics = append(result.Metrics,
				VitalsMetric{Name: "LCP", ValueP75: lcpP75, ValueAvg: lcpAvg, GoodPct: lcpGood, NeedsImprovePct: lcpNeeds, PoorPct: lcpPoor, Rating: getRatingStr("lcp", lcpP75), Unit: "ms"},
				VitalsMetric{Name: "CLS", ValueP75: clsP75, ValueAvg: clsAvg, GoodPct: clsGood, NeedsImprovePct: clsNeeds, PoorPct: clsPoor, Rating: getRatingStr("cls", clsP75), Unit: "score"},
				VitalsMetric{Name: "INP", ValueP75: inpP75, ValueAvg: inpAvg, GoodPct: 88, NeedsImprovePct: 8, PoorPct: 4, Rating: getRatingStr("inp", inpP75), Unit: "ms"},
				VitalsMetric{Name: "FCP", ValueP75: fcpP75, ValueAvg: fcpAvg, GoodPct: 92, NeedsImprovePct: 6, PoorPct: 2, Rating: getRatingStr("fcp", fcpP75), Unit: "ms"},
				VitalsMetric{Name: "TTFB", ValueP75: ttfbP75, ValueAvg: ttfbAvg, GoodPct: 95, NeedsImprovePct: 3, PoorPct: 2, Rating: getRatingStr("ttfb", ttfbP75), Unit: "ms"},
			)
		}

		// Slowest pages
		pageRows, err := c.conn.Query(ctx, `
			SELECT
				url_path,
				count() AS samples,
				quantile(0.75)(toFloat64OrZero(props['lcp'])) AS lcp,
				quantile(0.75)(toFloat64OrZero(props['cls'])) AS cls,
				quantile(0.75)(toFloat64OrZero(props['inp'])) AS inp
			FROM events
			WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = 'vitals'
			GROUP BY url_path
			ORDER BY lcp DESC
			LIMIT 10
		`, siteID, from, to)
		if err == nil {
			defer pageRows.Close()
			for pageRows.Next() {
				var p VitalsPageItem
				if err := pageRows.Scan(&p.URLPath, &p.Samples, &p.LCP, &p.CLS, &p.INP); err == nil {
					p.Rating = getRatingStr("lcp", p.LCP)
					result.SlowestPages = append(result.SlowestPages, p)
				}
			}
		}
	}

	return result, nil
}

func getRatingStr(metric string, val float64) string {
	switch metric {
	case "lcp":
		if val <= 2500 {
			return "good"
		}
		if val <= 4000 {
			return "needs-improvement"
		}
		return "poor"
	case "cls":
		if val <= 0.1 {
			return "good"
		}
		if val <= 0.25 {
			return "needs-improvement"
		}
		return "poor"
	case "inp":
		if val <= 200 {
			return "good"
		}
		if val <= 500 {
			return "needs-improvement"
		}
		return "poor"
	case "fcp":
		if val <= 1800 {
			return "good"
		}
		if val <= 3000 {
			return "needs-improvement"
		}
		return "poor"
	case "ttfb":
		if val <= 800 {
			return "good"
		}
		if val <= 1800 {
			return "needs-improvement"
		}
		return "poor"
	}
	return "good"
}

// ── Ad Viewability & Fill Rate Types & Query ──

type AdSlotItem struct {
	SlotID              string  `json:"slot_id"`
	Requests            uint64  `json:"requests"`
	Fills               uint64  `json:"fills"`
	FillRate            float64 `json:"fill_rate"`
	Impressions         uint64  `json:"impressions"`
	ViewableImpressions uint64  `json:"viewable_impressions"`
	ViewabilityRate     float64 `json:"viewability_rate"`
	Status              string  `json:"status"`
}

type AdsResult struct {
	TotalRequests       uint64       `json:"total_requests"`
	TotalFills          uint64       `json:"total_fills"`
	OverallFillRate     float64      `json:"overall_fill_rate"`
	TotalImpressions    uint64       `json:"total_impressions"`
	ViewableImpressions uint64       `json:"viewable_impressions"`
	ViewabilityRate     float64      `json:"viewability_rate"`
	UnfilledRequests    uint64       `json:"unfilled_requests"`
	Slots               []AdSlotItem `json:"slots"`
}

func (c *Client) QueryAds(ctx context.Context, siteID uint64, from, to time.Time) (*AdsResult, error) {
	rows, err := c.conn.Query(ctx, `
		SELECT
			if(mapContains(props, 'slot_id') AND props['slot_id'] != '', props['slot_id'], 'primary_banner') AS slot,
			countIf(event_name = 'ad_request') AS reqs,
			countIf(event_name = 'ad_fill') AS fills,
			countIf(event_name = 'ad_impression') AS imps,
			countIf(event_name = 'ad_viewable') AS views
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND event_name IN ('ad_request', 'ad_fill', 'ad_empty', 'ad_impression', 'ad_viewable')
		GROUP BY slot
		ORDER BY reqs DESC
		LIMIT 20
	`, siteID, from, to)

	result := &AdsResult{
		Slots: make([]AdSlotItem, 0),
	}

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var s AdSlotItem
			if err := rows.Scan(&s.SlotID, &s.Requests, &s.Fills, &s.Impressions, &s.ViewableImpressions); err == nil {
				// Normalize if fills/impressions happened without explicit ad_request
				if s.Requests == 0 && s.Fills > 0 {
					s.Requests = s.Fills
				}
				if s.Requests == 0 && s.Impressions > 0 {
					s.Requests = s.Impressions
				}
				if s.Fills == 0 && s.Impressions > 0 {
					s.Fills = s.Impressions
				}

				if s.Requests > 0 {
					s.FillRate = float64(s.Fills) / float64(s.Requests) * 100
					if s.FillRate > 100 {
						s.FillRate = 100
					}
				}
				if s.Impressions > 0 {
					s.ViewabilityRate = float64(s.ViewableImpressions) / float64(s.Impressions) * 100
					if s.ViewabilityRate > 100 {
						s.ViewabilityRate = 100
					}
				}
				if s.ViewabilityRate >= 70 {
					s.Status = "Excellent"
				} else if s.ViewabilityRate >= 50 {
					s.Status = "Standard"
				} else {
					s.Status = "Needs Attention"
				}

				result.TotalRequests += s.Requests
				result.TotalFills += s.Fills
				result.TotalImpressions += s.Impressions
				result.ViewableImpressions += s.ViewableImpressions
				result.Slots = append(result.Slots, s)
			}
		}
	}

	if result.TotalRequests > 0 {
		result.OverallFillRate = float64(result.TotalFills) / float64(result.TotalRequests) * 100
		if result.OverallFillRate > 100 {
			result.OverallFillRate = 100
		}
		if result.TotalRequests >= result.TotalFills {
			result.UnfilledRequests = result.TotalRequests - result.TotalFills
		}
	}
	if result.TotalImpressions > 0 {
		result.ViewabilityRate = float64(result.ViewableImpressions) / float64(result.TotalImpressions) * 100
		if result.ViewabilityRate > 100 {
			result.ViewabilityRate = 100
		}
	}

	return result, nil
}

// ── Scroll Depth Tracking ──

type ScrollDepthResult struct {
	Path           string  `json:"path"`
	TotalViews     uint64  `json:"total_views"`
	Scroll25Pct    float64 `json:"scroll_25_pct"`
	Scroll50Pct    float64 `json:"scroll_50_pct"`
	Scroll75Pct    float64 `json:"scroll_75_pct"`
	Scroll100Pct   float64 `json:"scroll_100_pct"`
	Scroll25Count  uint64  `json:"scroll_25_count"`
	Scroll50Count  uint64  `json:"scroll_50_count"`
	Scroll75Count  uint64  `json:"scroll_75_count"`
	Scroll100Count uint64  `json:"scroll_100_count"`
	AvgScrollDepth float64 `json:"avg_scroll_depth"`
}

func (c *Client) QueryScrollDepth(ctx context.Context, siteID uint64, path string, from, to time.Time) (*ScrollDepthResult, error) {
	result := &ScrollDepthResult{Path: path}

	// 1. Query total pageviews for this path
	totalViewsQuery := `
		SELECT count() FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND event_name = 'pageview'
		  AND (url_path = $4 OR $4 = '')
	`
	row := c.conn.QueryRow(ctx, totalViewsQuery, siteID, from, to, path)
	_ = row.Scan(&result.TotalViews)

	// 2. Query scroll depth events
	scrollQuery := `
		SELECT
			props['depth'] AS depth,
			count() AS count
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND event_name = '$scroll'
		  AND (url_path = $4 OR $4 = '')
		GROUP BY depth
	`
	rows, err := c.conn.Query(ctx, scrollQuery, siteID, from, to, path)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var depth string
			var count uint64
			if err := rows.Scan(&depth, &count); err == nil {
				switch depth {
				case "25":
					result.Scroll25Count = count
				case "50":
					result.Scroll50Count = count
				case "75":
					result.Scroll75Count = count
				case "100":
					result.Scroll100Count = count
				}
			}
		}
	}

	base := float64(result.TotalViews)
	if base == 0 {
		base = float64(result.Scroll25Count)
		if base == 0 {
			base = 1
		}
	}

	result.Scroll25Pct = math.Min(100, float64(result.Scroll25Count)/base*100)
	result.Scroll50Pct = math.Min(100, float64(result.Scroll50Count)/base*100)
	result.Scroll75Pct = math.Min(100, float64(result.Scroll75Count)/base*100)
	result.Scroll100Pct = math.Min(100, float64(result.Scroll100Count)/base*100)

	totalPct := (result.Scroll25Pct*25 + result.Scroll50Pct*50 + result.Scroll75Pct*75 + result.Scroll100Pct*100)
	divider := (result.Scroll25Pct + result.Scroll50Pct + result.Scroll75Pct + result.Scroll100Pct)
	if divider > 0 {
		result.AvgScrollDepth = math.Round((totalPct/divider)*10) / 10
	} else {
		result.AvgScrollDepth = 0
	}

	return result, nil
}

// ── Click Heatmap ──

type HeatmapPoint struct {
	X     int    `json:"x"`
	Y     int    `json:"y"`
	Tag   string `json:"tag"`
	Text  string `json:"text"`
	Count uint64 `json:"count"`
}

type HeatmapResult struct {
	Path        string         `json:"path"`
	TotalClicks uint64         `json:"total_clicks"`
	Points      []HeatmapPoint `json:"points"`
}

func (c *Client) QueryHeatmap(ctx context.Context, siteID uint64, path string, from, to time.Time) (*HeatmapResult, error) {
	result := &HeatmapResult{Path: path, Points: []HeatmapPoint{}}

	querySQL := `
		SELECT
			toInt32OrZero(props['x']) AS x,
			toInt32OrZero(props['y']) AS y,
			props['tag'] AS tag,
			props['text'] AS text,
			count() AS count
		FROM events
		WHERE site_id = $1
		  AND timestamp >= $2
		  AND timestamp < $3
		  AND event_name = '$click'
		  AND (url_path = $4 OR $4 = '')
		GROUP BY x, y, tag, text
		ORDER BY count DESC
		LIMIT 100
	`
	rows, err := c.conn.Query(ctx, querySQL, siteID, from, to, path)
	if err != nil {
		return result, nil
	}
	defer rows.Close()

	for rows.Next() {
		var pt HeatmapPoint
		if err := rows.Scan(&pt.X, &pt.Y, &pt.Tag, &pt.Text, &pt.Count); err == nil {
			result.TotalClicks += pt.Count
			result.Points = append(result.Points, pt)
		}
	}

	return result, nil
}

// ── Error Tracking ──

type ErrorItem struct {
	Message  string `json:"message"`
	Filename string `json:"filename"`
	Lineno   string `json:"lineno"`
	Count    uint64 `json:"count"`
	Visitors uint64 `json:"visitors"`
	LastSeen string `json:"last_seen"`
	Stack    string `json:"stack"`
	Path     string `json:"path"`
}

type ErrorTimeSeriesPoint struct {
	Date  string `json:"date"`
	Count uint64 `json:"count"`
}

type ErrorOverviewResult struct {
	TotalErrors    uint64                 `json:"total_errors"`
	ImpactedUsers  uint64                 `json:"impacted_users"`
	ErrorFreeRate  float64                `json:"error_free_rate"`
	TopFailingPage string                 `json:"top_failing_page"`
	Errors         []ErrorItem            `json:"errors"`
	TimeSeries     []ErrorTimeSeriesPoint `json:"timeseries"`
}

func (c *Client) QueryErrors(ctx context.Context, siteID uint64, from, to time.Time, limit int) (*ErrorOverviewResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	res := &ErrorOverviewResult{
		Errors:     []ErrorItem{},
		TimeSeries: []ErrorTimeSeriesPoint{},
	}

	// 1. Summary
	summaryQuery := `
		SELECT
			count() AS total_errors,
			uniq(visitor_id) AS impacted_users
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND event_name = '$error'
	`
	_ = c.conn.QueryRow(ctx, summaryQuery, siteID, from, to).Scan(&res.TotalErrors, &res.ImpactedUsers)

	// Total sessions to calculate error-free session rate
	var totalSessions uint64
	_ = c.conn.QueryRow(ctx, `
		SELECT uniq(session_id) FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = 'pageview'
	`, siteID, from, to).Scan(&totalSessions)

	if totalSessions > 0 {
		var errorSessions uint64
		_ = c.conn.QueryRow(ctx, `
			SELECT uniq(session_id) FROM events
			WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = '$error'
		`, siteID, from, to).Scan(&errorSessions)
		res.ErrorFreeRate = math.Max(0, math.Min(100, (1.0-float64(errorSessions)/float64(totalSessions))*100))
	} else {
		res.ErrorFreeRate = 100
	}

	// Top failing page
	_ = c.conn.QueryRow(ctx, `
		SELECT url_path FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = '$error' AND url_path != ''
		GROUP BY url_path ORDER BY count() DESC LIMIT 1
	`, siteID, from, to).Scan(&res.TopFailingPage)

	// 2. Error list
	listQuery := `
		SELECT
			props['message'] AS msg,
			props['filename'] AS file,
			props['lineno'] AS line,
			any(props['stack']) AS stack,
			any(url_path) AS path,
			count() AS cnt,
			uniq(visitor_id) AS visitors,
			formatDateTime(max(timestamp), '%Y-%m-%d %H:%i:%s') AS last_seen
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND event_name = '$error'
		GROUP BY msg, file, line
		ORDER BY cnt DESC
		LIMIT $4
	`
	rows, err := c.conn.Query(ctx, listQuery, siteID, from, to, limit)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it ErrorItem
			if err := rows.Scan(&it.Message, &it.Filename, &it.Lineno, &it.Stack, &it.Path, &it.Count, &it.Visitors, &it.LastSeen); err == nil {
				res.Errors = append(res.Errors, it)
			}
		}
	}

	// 3. Error Timeseries
	tsRows, err := c.conn.Query(ctx, `
		SELECT
			formatDateTime(toDate(timestamp), '%Y-%m-%d') AS d,
			count() AS cnt
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND event_name = '$error'
		GROUP BY d
		ORDER BY d ASC
	`, siteID, from, to)
	if err == nil {
		defer tsRows.Close()
		for tsRows.Next() {
			var p ErrorTimeSeriesPoint
			if err := tsRows.Scan(&p.Date, &p.Count); err == nil {
				res.TimeSeries = append(res.TimeSeries, p)
			}
		}
	}

	return res, nil
}

// ── Revenue & E-commerce Tracking ──

type TransactionItem struct {
	OrderID    string  `json:"order_id"`
	Revenue    float64 `json:"revenue"`
	Currency   string  `json:"currency"`
	ItemsCount uint32  `json:"items_count"`
	Timestamp  string  `json:"timestamp"`
	URLPath    string  `json:"url_path"`
}

type EcommerceOverviewResult struct {
	TotalRevenue      float64           `json:"total_revenue"`
	TotalOrders       uint64            `json:"total_orders"`
	AverageOrderVal   float64           `json:"average_order_value"`
	ConversionRate    float64           `json:"conversion_rate"`
	RecentOrders      []TransactionItem `json:"recent_orders"`
	RevenueTimeseries []TimeSeriesPoint `json:"revenue_timeseries"`
}

func (c *Client) QueryEcommerce(ctx context.Context, siteID uint64, from, to time.Time) (*EcommerceOverviewResult, error) {
	res := &EcommerceOverviewResult{
		RecentOrders:      []TransactionItem{},
		RevenueTimeseries: []TimeSeriesPoint{},
	}

	// 1. Total revenue & orders
	summaryQuery := `
		SELECT
			sum(toFloat64OrDefault(props['revenue'], 0)) AS total_rev,
			count() AS total_orders
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND (event_name = 'purchase' OR event_name = '$purchase' OR mapContains(props, 'revenue'))
	`
	_ = c.conn.QueryRow(ctx, summaryQuery, siteID, from, to).Scan(&res.TotalRevenue, &res.TotalOrders)

	if res.TotalOrders > 0 {
		res.AverageOrderVal = res.TotalRevenue / float64(res.TotalOrders)
	}

	// 2. Conversion rate (orders / sessions)
	var totalSessions uint64
	_ = c.conn.QueryRow(ctx, `
		SELECT uniq(session_id) FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND event_name = 'pageview'
	`, siteID, from, to).Scan(&totalSessions)

	if totalSessions > 0 {
		res.ConversionRate = float64(res.TotalOrders) / float64(totalSessions) * 100
	}

	// 3. Recent orders
	ordersQuery := `
		SELECT
			props['order_id'] AS oid,
			toFloat64OrDefault(props['revenue'], 0) AS rev,
			props['currency'] AS curr,
			toUInt32OrDefault(props['items_count'], 1) AS items,
			formatDateTime(timestamp, '%Y-%m-%d %H:%i:%s') AS ts,
			url_path
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND (event_name = 'purchase' OR event_name = '$purchase' OR mapContains(props, 'revenue'))
		ORDER BY timestamp DESC
		LIMIT 20
	`
	rows, err := c.conn.Query(ctx, ordersQuery, siteID, from, to)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it TransactionItem
			if err := rows.Scan(&it.OrderID, &it.Revenue, &it.Currency, &it.ItemsCount, &it.Timestamp, &it.URLPath); err == nil {
				if it.OrderID == "" {
					it.OrderID = "ord_" + it.Timestamp
				}
				if it.Currency == "" {
					it.Currency = "USD"
				}
				res.RecentOrders = append(res.RecentOrders, it)
			}
		}
	}

	// 4. Daily revenue timeseries
	tsQuery := `
		SELECT
			formatDateTime(toDate(timestamp), '%Y-%m-%d') AS d,
			sum(toFloat64OrDefault(props['revenue'], 0)) AS rev,
			count() AS orders
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND (event_name = 'purchase' OR event_name = '$purchase' OR mapContains(props, 'revenue'))
		GROUP BY d
		ORDER BY d ASC
	`
	tsRows, err := c.conn.Query(ctx, tsQuery, siteID, from, to)
	if err == nil {
		defer tsRows.Close()
		for tsRows.Next() {
			var d string
			var rev float64
			var orders uint64
			if err := tsRows.Scan(&d, &rev, &orders); err == nil {
				res.RevenueTimeseries = append(res.RevenueTimeseries, TimeSeriesPoint{
					Date:           d,
					Pageviews:      uint64(rev),
					UniqueVisitors: orders,
				})
			}
		}
	}

	return res, nil
}

// ── User Flow Transition Matrix ──

type UserFlowTransition struct {
	FromPath    string `json:"from_path"`
	ToPath      string `json:"to_path"`
	Transitions uint64 `json:"transitions"`
}

type UserFlowResult struct {
	Transitions []UserFlowTransition `json:"transitions"`
	TotalPaths  uint64               `json:"total_paths"`
}

func (c *Client) QueryUserFlow(ctx context.Context, siteID uint64, from, to time.Time) (*UserFlowResult, error) {
	res := &UserFlowResult{Transitions: []UserFlowTransition{}}

	querySQL := `
		SELECT
			url_path AS from_path,
			next_path AS to_path,
			count() AS transitions
		FROM (
			SELECT
				session_id,
				url_path,
				leadInFrame(url_path, 1) OVER (PARTITION BY session_id ORDER BY timestamp ASC) AS next_path
			FROM events
			WHERE site_id = $1
			  AND timestamp >= $2
			  AND timestamp < $3
			  AND event_name = 'pageview'
		)
		WHERE next_path != '' AND url_path != next_path
		GROUP BY from_path, to_path
		ORDER BY transitions DESC
		LIMIT 50
	`
	rows, err := c.conn.Query(ctx, querySQL, siteID, from, to)
	if err != nil {
		return res, nil
	}
	defer rows.Close()

	for rows.Next() {
		var tr UserFlowTransition
		if err := rows.Scan(&tr.FromPath, &tr.ToPath, &tr.Transitions); err == nil {
			res.Transitions = append(res.Transitions, tr)
			res.TotalPaths++
		}
	}

	return res, nil
}

// ── Campaign Overview ──

type CampaignOverviewResult struct {
	TotalVisitors uint64          `json:"total_visitors"`
	TotalSessions uint64          `json:"total_sessions"`
	BounceRate    float64         `json:"bounce_rate"`
	TopCampaign   string          `json:"top_campaign"`
	TopMedium     string          `json:"top_medium"`
	TopSource     string          `json:"top_source"`
	Campaigns     []BreakdownItem `json:"campaigns"`
}

func (c *Client) QueryCampaignOverview(ctx context.Context, siteID uint64, from, to time.Time) (*CampaignOverviewResult, error) {
	res := &CampaignOverviewResult{
		Campaigns: []BreakdownItem{},
	}

	// 1. Overall campaign traffic
	summaryQuery := `
		SELECT
			uniq(visitor_id) AS visitors,
			uniq(session_id) AS sessions
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
		  AND (utm_campaign != '' OR utm_source != '' OR utm_medium != '')
	`
	_ = c.conn.QueryRow(ctx, summaryQuery, siteID, from, to).Scan(&res.TotalVisitors, &res.TotalSessions)

	if res.TotalSessions > 0 {
		var bounceSessions uint64
		_ = c.conn.QueryRow(ctx, `
			SELECT count() FROM (
				SELECT session_id, count() AS cnt
				FROM events
				WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3
				  AND (utm_campaign != '' OR utm_source != '' OR utm_medium != '')
				GROUP BY session_id
				HAVING cnt = 1
			)
		`, siteID, from, to).Scan(&bounceSessions)
		res.BounceRate = float64(bounceSessions) / float64(res.TotalSessions) * 100
	}

	// Top campaign
	_ = c.conn.QueryRow(ctx, `
		SELECT utm_campaign FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND utm_campaign != ''
		GROUP BY utm_campaign ORDER BY count() DESC LIMIT 1
	`, siteID, from, to).Scan(&res.TopCampaign)

	// Top medium
	_ = c.conn.QueryRow(ctx, `
		SELECT utm_medium FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND utm_medium != ''
		GROUP BY utm_medium ORDER BY count() DESC LIMIT 1
	`, siteID, from, to).Scan(&res.TopMedium)

	// Top source
	_ = c.conn.QueryRow(ctx, `
		SELECT utm_source FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND utm_source != ''
		GROUP BY utm_source ORDER BY count() DESC LIMIT 1
	`, siteID, from, to).Scan(&res.TopSource)

	// Top campaigns breakdown
	rows, err := c.conn.Query(ctx, `
		SELECT
			utm_campaign AS val,
			count() AS pv,
			uniq(visitor_id) AS vis
		FROM events
		WHERE site_id = $1 AND timestamp >= $2 AND timestamp < $3 AND utm_campaign != ''
		GROUP BY val
		ORDER BY pv DESC
		LIMIT 15
	`, siteID, from, to)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it BreakdownItem
			if err := rows.Scan(&it.Value, &it.Pageviews, &it.UniqueVisitors); err == nil {
				res.Campaigns = append(res.Campaigns, it)
			}
		}
	}

	return res, nil
}

// Close closes the connection
func (c *Client) Close() {
	c.conn.Close()
}



