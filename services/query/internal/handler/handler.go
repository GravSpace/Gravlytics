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

	paths, _ := h.ch.QueryRealtimePaths(r.Context(), siteID, 5)
	if paths == nil {
		paths = []chclient.RealtimePath{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"active_visitors": count,
		"active_paths":    paths,
	})
}

// Goals calculates conversion metrics for defined goals
func (h *Handler) Goals(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var goals []chclient.GoalDef
	if r.Method == http.MethodPost && r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&goals)
	}

	if len(goals) == 0 {
		goals = []chclient.GoalDef{
			{ID: "goal-1", Name: "Newsletter Subscription", Type: "event", Trigger: "signup"},
			{ID: "goal-2", Name: "Pricing Page Visit", Type: "pageview", Trigger: "/pricing"},
			{ID: "goal-3", Name: "Documentation Reader", Type: "pageview", Trigger: "/docs/*"},
			{ID: "goal-4", Name: "SDK Download", Type: "event", Trigger: "download_sdk"},
		}
	}

	results, err := h.ch.QueryGoals(r.Context(), siteID, from, to, goals)
	if err != nil {
		h.logger.Error("query goals failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// Funnel returns multi-step funnel progression
func (h *Handler) Funnel(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var steps []map[string]string
	if r.Method == http.MethodPost && r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&steps)
	}

	results, err := h.ch.QueryFunnel(r.Context(), siteID, from, to, steps)
	if err != nil {
		h.logger.Error("query funnel failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// Retention returns weekly cohort retention table
func (h *Handler) Retention(w http.ResponseWriter, r *http.Request) {
	siteIDStr := r.URL.Query().Get("site_id")
	if siteIDStr == "" {
		http.Error(w, "missing site_id", http.StatusBadRequest)
		return
	}
	granularity := r.URL.Query().Get("granularity")
	if granularity == "" {
		granularity = "week"
	}

	siteID := hashSiteID(siteIDStr)
	cohorts, err := h.ch.QueryRetention(r.Context(), siteID, granularity)
	if err != nil {
		h.logger.Error("query retention failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cohorts)
}

// Sessions returns comprehensive session metrics, distribution, and recent sessions
func (h *Handler) Sessions(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	limit := 30
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	cacheKey := fmt.Sprintf("sessions:%d:%s:%s:%d", siteID, from.Format("20060102"), to.Format("20060102"), limit)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QuerySessions(r.Context(), siteID, from, to, limit)
	if err != nil {
		h.logger.Error("query sessions failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 15*time.Second)
}

// Events returns events overview, distinct events list, and recent event stream
func (h *Handler) Events(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	cacheKey := fmt.Sprintf("events:%d:%s:%s:%d", siteID, from.Format("20060102"), to.Format("20060102"), limit)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryEvents(r.Context(), siteID, from, to, limit)
	if err != nil {
		h.logger.Error("query events failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 15*time.Second)
}

// EventProperties returns property keys and top values for a specific event
func (h *Handler) EventProperties(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	eventName := r.URL.Query().Get("event_name")
	if eventName == "" {
		http.Error(w, "missing event_name parameter", http.StatusBadRequest)
		return
	}

	cacheKey := fmt.Sprintf("event_props:%d:%s:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"), eventName)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	items, err := h.ch.QueryEventProperties(r.Context(), siteID, eventName, from, to)
	if err != nil {
		h.logger.Error("query event properties failed", "error", err, "event_name", eventName)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, items, 30*time.Second)
}

// Vitals returns Core Web Vitals summary and slowest pages
func (h *Handler) Vitals(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cacheKey := fmt.Sprintf("vitals:%d:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"))
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryVitals(r.Context(), siteID, from, to)
	if err != nil {
		h.logger.Error("query vitals failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
}

// Ads returns ad inventory, fill rate, and viewability statistics
func (h *Handler) Ads(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cacheKey := fmt.Sprintf("ads:%d:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"))
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryAds(r.Context(), siteID, from, to)
	if err != nil {
		h.logger.Error("query ads failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
}

// Scroll returns scroll depth milestone distribution for a path
func (h *Handler) Scroll(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	path := r.URL.Query().Get("path")
	cacheKey := fmt.Sprintf("scroll:%d:%s:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"), path)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryScrollDepth(r.Context(), siteID, path, from, to)
	if err != nil {
		h.logger.Error("query scroll failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
}

// Heatmap returns aggregated click coordinates for a path
func (h *Handler) Heatmap(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	path := r.URL.Query().Get("path")
	cacheKey := fmt.Sprintf("heatmap:%d:%s:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"), path)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryHeatmap(r.Context(), siteID, path, from, to)
	if err != nil {
		h.logger.Error("query heatmap failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
}

// Errors returns aggregated JavaScript error events, timeline, and impact
func (h *Handler) Errors(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	cacheKey := fmt.Sprintf("errors:%d:%s:%s:%d", siteID, from.Format("20060102"), to.Format("20060102"), limit)
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryErrors(r.Context(), siteID, from, to, limit)
	if err != nil {
		h.logger.Error("query errors failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 15*time.Second)
}

// Ecommerce returns total revenue, orders, AOV, and recent transactions
func (h *Handler) Ecommerce(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cacheKey := fmt.Sprintf("ecom:%d:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"))
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryEcommerce(r.Context(), siteID, from, to)
	if err != nil {
		h.logger.Error("query ecommerce failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
}

// UserFlow returns multi-step session transition matrix
func (h *Handler) UserFlow(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cacheKey := fmt.Sprintf("flow:%d:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"))
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryUserFlow(r.Context(), siteID, from, to)
	if err != nil {
		h.logger.Error("query flow failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
}

// CampaignOverview returns aggregate UTM campaign metrics and top campaigns
func (h *Handler) CampaignOverview(w http.ResponseWriter, r *http.Request) {
	siteID, from, to, err := h.parseParams(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cacheKey := fmt.Sprintf("campaign_overview:%d:%s:%s", siteID, from.Format("20060102"), to.Format("20060102"))
	if cached, err := h.cache.Get(r.Context(), cacheKey); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write([]byte(cached))
		return
	}

	result, err := h.ch.QueryCampaignOverview(r.Context(), siteID, from, to)
	if err != nil {
		h.logger.Error("query campaign overview failed", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, r.Context(), cacheKey, result, 30*time.Second)
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
