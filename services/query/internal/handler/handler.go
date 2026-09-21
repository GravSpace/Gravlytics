package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gravlytics/query/internal/cache"
	chclient "github.com/gravlytics/query/internal/clickhouse"
)

type Handler struct {
	ch     *chclient.Client
	cache  *cache.Cache
	logger *slog.Logger
}

func New(ch *chclient.Client, c *cache.Cache, logger *slog.Logger) *Handler {
	return &Handler{ch: ch, cache: c, logger: logger}
}

// Overview returns aggregate stats for a site
func (h *Handler) Overview(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check cache
	cacheKey := fmt.Sprintf("overview:%d:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"))
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryOverview(r.Context(), siteID, from, to)
	if err != nil {
		h.logger.Error("query overview failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
}

// TimeSeries returns time-series pageview/visitor data
func (h *Handler) TimeSeries(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	interval := r.URL.Query().Get("interval")
	if interval == "" {
		// Auto: use hour for ranges <= 2 days, day otherwise
		if to.Sub(from) <= 48*time.Hour {
			interval = "hour"
		} else {
			interval = "day"
		}
	}

	cacheKey := fmt.Sprintf("ts:%d:%s:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"), interval)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	points, err := h.ch.QueryTimeSeries(r.Context(), siteID, from, to, interval)
	if err != nil {
		h.logger.Error("query timeseries failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, points, 30*time.Second)
}

// Breakdown returns a breakdown by dimension
func (h *Handler) Breakdown(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dimension := r.URL.Query().Get("dimension")
	if dimension == "" {
		http.Error(w, "missing dimension parameter", http.StatusBadRequest)
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	cacheKey := fmt.Sprintf("bd:%d:%s:%s:%s:%d", siteID, from.Format("20060102"), to.Format("20060102"), dimension, limit)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	items, err := h.ch.QueryBreakdown(r.Context(), siteID, from, to, dimension, limit)
	if err != nil {
		h.logger.Error("query breakdown failed", "error", err, "dimension", dimension)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, items, 30*time.Second)
}

// Realtime returns the count of active visitors in the last 5 minutes
func (h *Handler) Realtime(w http.ResponseWriter, r *http.Request) {
	siteIDStr := r.URL.Query().Get("site_id")
	if siteIDStr == "" {
		http.Error(w, "missing site_id", http.StatusBadRequest)
		return
	}
	siteID := hashSiteID(siteIDStr)

	// Try Valkey first for realtime counter
	count, err := h.cache.GetRealtimeCount(r.Context(), siteIDStr)
	if err != nil || count == 0 {
		// Fallback to ClickHouse
		chCount, chErr := h.ch.QueryRealtimeVisitors(r.Context(), siteID, 5)
		if chErr != nil {
			h.logger.Error("query realtime failed", "error", chErr)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		count = int64(chCount)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int64{
		"active_visitors": count,
	})
}

// parseParams extracts common query parameters
func (h *Handler) parseParams(r *http.Request) (uint64, time.Time, time.Time, error) {
	siteIDStr := r.URL.Query().Get("site_id")
	if siteIDStr == "" {
		return 0, time.Time{}, time.Time{}, fmt.Errorf("missing site_id")
	}

	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	// Default: last 30 days
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -30)
	to := now

	if fromStr != "" {
		parsed, err := time.Parse("2006-01-02", fromStr)
		if err != nil {
			return 0, time.Time{}, time.Time{}, fmt.Errorf("invalid from date: %s", fromStr)
		}
		from = parsed
	}
	if toStr != "" {
		parsed, err := time.Parse("2006-01-02", toStr)
		if err != nil {
			return 0, time.Time{}, time.Time{}, fmt.Errorf("invalid to date: %s", toStr)
		}
		to = parsed.Add(24*time.Hour - time.Millisecond) // End of day
	}

	return hashSiteID(siteIDStr), from, to, nil
}

// respondJSON writes JSON response and caches it
func (h *Handler) respondJSON(w http.ResponseWriter, ctx context.Context, cacheKey string, data interface{}, ttl time.Duration) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// Cache the result
	h.cache.Set(ctx, cacheKey, string(jsonData), ttl)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS")
	w.Write(jsonData)
}

// hashSiteID converts a tracking_id string to uint64 (same as consumer)
func hashSiteID(s string) uint64 {
	var h uint64 = 14695981039346656037 // FNV offset basis
	for _, c := range s {
		h ^= uint64(c)
		h *= 1099511628211 // FNV prime
	}
	return h
}
