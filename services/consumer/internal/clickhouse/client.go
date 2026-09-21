package clickhouse

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// Event represents the enriched event from Redpanda
type Event struct {
	SiteID         string            `json:"site_id"`
	EventID        string            `json:"event_id"`
	Timestamp      string            `json:"timestamp"`
	EventName      string            `json:"event_name"`
	VisitorID      uint64            `json:"visitor_id"`
	SessionID      uint64            `json:"session_id"`
	Hostname       string            `json:"hostname"`
	URLPath        string            `json:"url_path"`
	ReferrerDomain string            `json:"referrer_domain"`
	ReferrerPath   string            `json:"referrer_path"`
	UTMSource      string            `json:"utm_source"`
	UTMMedium      string            `json:"utm_medium"`
	UTMCampaign    string            `json:"utm_campaign"`
	Country        string            `json:"country"`
	Region         string            `json:"region"`
	City           string            `json:"city"`
	DeviceType     string            `json:"device_type"`
	Browser        string            `json:"browser"`
	BrowserVersion string            `json:"browser_version"`
	OS             string            `json:"os"`
	OSVersion      string            `json:"os_version"`
	ScreenWidth    int               `json:"screen_width"`
	Props          map[string]string `json:"props"`
}

// Client wraps the ClickHouse connection
type Client struct {
	conn driver.Conn
}

// New creates a new ClickHouse client
func New(host, port, database, user, password string) (*Client, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{fmt.Sprintf("%s:%s", host, port)},
		Auth: clickhouse.Auth{
			Database: database,
			Username: user,
			Password: password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		DialTimeout:  5 * time.Second,
		MaxOpenConns: 10,
		MaxIdleConns: 5,
	})
	if err != nil {
		return nil, fmt.Errorf("open clickhouse: %w", err)
	}

	// Test connection
	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping clickhouse: %w", err)
	}

	return &Client{conn: conn}, nil
}

// InsertBatch inserts a batch of JSON events into the events table
func (c *Client) InsertBatch(events [][]byte) error {
	ctx := context.Background()

	batch, err := c.conn.PrepareBatch(ctx, `
		INSERT INTO events (
			site_id, event_id, timestamp, event_name,
			visitor_id, session_id,
			hostname, url_path,
			referrer_domain, referrer_path,
			utm_source, utm_medium, utm_campaign,
			country, region, city,
			device_type, browser, browser_version, os, os_version,
			screen_width, props
		)
	`)
	if err != nil {
		return fmt.Errorf("prepare batch: %w", err)
	}

	for _, raw := range events {
		var e Event
		if err := json.Unmarshal(raw, &e); err != nil {
			// Skip malformed events (should have been caught by consumer validation)
			continue
		}

		// Parse timestamp
		ts, err := time.Parse("2006-01-02T15:04:05.000Z", e.Timestamp)
		if err != nil {
			ts = time.Now().UTC()
		}

		// Parse site_id as uint64 (tracking_id string → hash for now)
		// In production, this would be resolved via PostgreSQL lookup
		siteID := hashString(e.SiteID)

		if err := batch.Append(
			siteID,
			e.EventID,
			ts,
			e.EventName,
			e.VisitorID,
			e.SessionID,
			e.Hostname,
			e.URLPath,
			e.ReferrerDomain,
			e.ReferrerPath,
			e.UTMSource,
			e.UTMMedium,
			e.UTMCampaign,
			e.Country,
			e.Region,
			e.City,
			e.DeviceType,
			e.Browser,
			e.BrowserVersion,
			e.OS,
			e.OSVersion,
			uint16(e.ScreenWidth),
			e.Props,
		); err != nil {
			return fmt.Errorf("append to batch: %w", err)
		}
	}

	if err := batch.Send(); err != nil {
		return fmt.Errorf("send batch: %w", err)
	}

	return nil
}

// Close closes the ClickHouse connection
func (c *Client) Close() {
	c.conn.Close()
}

// hashString creates a uint64 hash from a string
func hashString(s string) uint64 {
	var h uint64 = 14695981039346656037 // FNV offset basis
	for _, c := range s {
		h ^= uint64(c)
		h *= 1099511628211 // FNV prime
	}
	return h
}
