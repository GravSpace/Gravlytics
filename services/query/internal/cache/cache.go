package cache

import (
	"context"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache wraps Valkey (Redis-compatible) for query result caching
type Cache struct {
	client *redis.Client
}

// New creates a new Valkey cache client
func New(addr, password string) *Cache {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})

	return &Cache{client: client}
}

// Get retrieves a cached value
func (c *Cache) Get(ctx context.Context, key string) (string, error) {
	return c.client.Get(ctx, key).Result()
}

// Set stores a value with TTL
func (c *Cache) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return c.client.Set(ctx, key, value, ttl).Err()
}

// Del deletes a cached key
func (c *Cache) Del(ctx context.Context, key string) error {
	return c.client.Del(ctx, key).Err()
}

// IncrRealtimeCounter increments a realtime visitor counter (sorted set)
func (c *Cache) IncrRealtimeCounter(ctx context.Context, siteID string, visitorKey string) error {
	key := "realtime:" + siteID
	now := float64(time.Now().Unix())

	// Add/update visitor with current timestamp as score
	if err := c.client.ZAdd(ctx, key, redis.Z{
		Score:  now,
		Member: visitorKey,
	}).Err(); err != nil {
		return err
	}

	// Remove entries older than 5 minutes
	cutoff := float64(time.Now().Add(-5 * time.Minute).Unix())
	c.client.ZRemRangeByScore(ctx, key, "-inf", formatFloat(cutoff))

	// Set TTL on the key (auto-cleanup)
	c.client.Expire(ctx, key, 10*time.Minute)

	return nil
}

// GetRealtimeCount returns the number of active visitors in the last 5 minutes
func (c *Cache) GetRealtimeCount(ctx context.Context, siteID string) (int64, error) {
	key := "realtime:" + siteID
	cutoff := float64(time.Now().Add(-5 * time.Minute).Unix())

	// Remove stale entries first
	c.client.ZRemRangeByScore(ctx, key, "-inf", formatFloat(cutoff))

	// Count remaining
	return c.client.ZCard(ctx, key).Result()
}

// Close closes the cache connection
func (c *Cache) Close() {
	c.client.Close()
}

func formatFloat(f float64) string {
	return strconv.FormatFloat(f, 'f', -1, 64)
}
