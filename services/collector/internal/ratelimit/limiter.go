package ratelimit

import (
	"sync"
	"time"
)

// clientBucket tracks tokens for a single client IP
type clientBucket struct {
	tokens     float64
	lastRefill time.Time
	mu         sync.Mutex
}

// Limiter provides an in-memory token bucket rate limiter per IP
type Limiter struct {
	rate       float64 // tokens per second
	burst      float64 // maximum bucket capacity
	clients    sync.Map
	lastPurge  time.Time
	purgeMutex sync.Mutex
}

// New creates a new Limiter with specified rate (tokens/sec) and burst capacity
func New(rate, burst float64) *Limiter {
	if rate <= 0 {
		rate = 100 // default 100 req/s
	}
	if burst <= 0 {
		burst = 200 // default burst 200
	}
	l := &Limiter{
		rate:       rate,
		burst:      burst,
		lastPurge:  time.Now(),
	}

	// Periodic cleanup of idle IPs every 5 minutes
	go l.backgroundPurge()

	return l
}

// Allow checks if a request from the given IP is permitted under the rate limit
func (l *Limiter) Allow(ip string) bool {
	if ip == "" || ip == "127.0.0.1" || ip == "::1" {
		// Allow localhost without restriction
		return true
	}

	now := time.Now()
	val, _ := l.clients.LoadOrStore(ip, &clientBucket{
		tokens:     l.burst,
		lastRefill: now,
	})

	b := val.(*clientBucket)
	b.mu.Lock()
	defer b.mu.Unlock()

	// Refill tokens based on elapsed time
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens += elapsed * l.rate
	if b.tokens > l.burst {
		b.tokens = l.burst
	}
	b.lastRefill = now

	// Consume 1 token if available
	if b.tokens >= 1.0 {
		b.tokens -= 1.0
		return true
	}

	return false
}

// backgroundPurge removes stale IPs that have not sent requests in over 10 minutes
func (l *Limiter) backgroundPurge() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		now := time.Now()
		l.clients.Range(func(key, val any) bool {
			b := val.(*clientBucket)
			b.mu.Lock()
			idle := now.Sub(b.lastRefill)
			b.mu.Unlock()
			if idle > 10*time.Minute {
				l.clients.Delete(key)
			}
			return true
		})
	}
}
