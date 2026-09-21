package clickhouse

import (
	"context"
	"fmt"
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
	// Whitelist dimensions to prevent SQL injection
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

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	rows, err := c.conn.Query(ctx, fmt.Sprintf(`
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
	`, col, col), siteID, from, to, limit)
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

// Close closes the connection
func (c *Client) Close() {
	c.conn.Close()
}
