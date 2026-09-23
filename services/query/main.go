package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	chclient "github.com/gravlytics/query/internal/clickhouse"
	"github.com/gravlytics/query/internal/cache"
	"github.com/gravlytics/query/internal/handler"
)

func main() {
	loadEnv()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	port := envOr("QUERY_PORT", "8082")

	// ClickHouse
	chHost := envOr("CLICKHOUSE_HOST", "localhost")
	chPort := envOr("CLICKHOUSE_PORT", "9009")
	chDB := envOr("CLICKHOUSE_DB", "gravlytics")
	chUser := envOr("CLICKHOUSE_USER", "default")
	chPassword := envOr("CLICKHOUSE_PASSWORD", "gravlytics_dev")

	ch, err := chclient.New(chHost, chPort, chDB, chUser, chPassword)
	if err != nil {
		slog.Error("failed to connect to ClickHouse", "error", err)
		os.Exit(1)
	}
	defer ch.Close()

	// Valkey cache
	valkeyHost := envOr("VALKEY_HOST", "localhost")
	valkeyPort := envOr("VALKEY_PORT", "6379")
	valkeyPassword := envOr("VALKEY_PASSWORD", "")
	c := cache.New(valkeyHost+":"+valkeyPort, valkeyPassword)
	defer c.Close()

	// HTTP handler
	h := handler.New(ch, c, logger)

	mux := http.NewServeMux()

	// Stats endpoints (support both /api/v1/stats and /api/stats)
	mux.HandleFunc("GET /api/v1/stats/overview", h.Overview)
	mux.HandleFunc("GET /api/v1/stats/timeseries", h.TimeSeries)
	mux.HandleFunc("GET /api/v1/stats/breakdown", h.Breakdown)
	mux.HandleFunc("GET /api/v1/stats/realtime", h.Realtime)
	mux.HandleFunc("GET /api/v1/stats/goals", h.Goals)
	mux.HandleFunc("POST /api/v1/stats/goals", h.Goals)
	mux.HandleFunc("GET /api/v1/stats/funnel", h.Funnel)
	mux.HandleFunc("POST /api/v1/stats/funnel", h.Funnel)
	mux.HandleFunc("GET /api/v1/stats/retention", h.Retention)
	mux.HandleFunc("GET /api/v1/stats/sessions", h.Sessions)
	mux.HandleFunc("GET /api/v1/stats/events", h.Events)
	mux.HandleFunc("GET /api/v1/stats/events/properties", h.EventProperties)
	mux.HandleFunc("GET /api/v1/stats/vitals", h.Vitals)
	mux.HandleFunc("GET /api/v1/stats/ads", h.Ads)
	mux.HandleFunc("GET /api/v1/stats/scroll", h.Scroll)
	mux.HandleFunc("GET /api/v1/stats/heatmap", h.Heatmap)
	mux.HandleFunc("GET /api/v1/stats/errors", h.Errors)
	mux.HandleFunc("GET /api/v1/stats/ecommerce", h.Ecommerce)
	mux.HandleFunc("GET /api/v1/stats/flow", h.UserFlow)
	mux.HandleFunc("GET /api/v1/stats/campaigns/overview", h.CampaignOverview)

	mux.HandleFunc("GET /api/stats/overview", h.Overview)
	mux.HandleFunc("GET /api/stats/timeseries", h.TimeSeries)
	mux.HandleFunc("GET /api/stats/breakdown", h.Breakdown)
	mux.HandleFunc("GET /api/stats/realtime", h.Realtime)
	mux.HandleFunc("GET /api/stats/goals", h.Goals)
	mux.HandleFunc("POST /api/stats/goals", h.Goals)
	mux.HandleFunc("GET /api/stats/funnel", h.Funnel)
	mux.HandleFunc("POST /api/stats/funnel", h.Funnel)
	mux.HandleFunc("GET /api/stats/retention", h.Retention)
	mux.HandleFunc("GET /api/stats/sessions", h.Sessions)
	mux.HandleFunc("GET /api/stats/events", h.Events)
	mux.HandleFunc("GET /api/stats/events/properties", h.EventProperties)
	mux.HandleFunc("GET /api/stats/vitals", h.Vitals)
	mux.HandleFunc("GET /api/stats/ads", h.Ads)
	mux.HandleFunc("GET /api/stats/scroll", h.Scroll)
	mux.HandleFunc("GET /api/stats/heatmap", h.Heatmap)
	mux.HandleFunc("GET /api/stats/errors", h.Errors)
	mux.HandleFunc("GET /api/stats/ecommerce", h.Ecommerce)
	mux.HandleFunc("GET /api/stats/flow", h.UserFlow)
	mux.HandleFunc("GET /api/stats/campaigns/overview", h.CampaignOverview)

	// Health
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	corsHandler := corsMiddleware(mux)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      corsHandler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		slog.Info("shutting down query API...")
		shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutCancel()
		srv.Shutdown(shutCtx)
	}()

	slog.Info("query API started", "port", port)

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}

	slog.Info("query API stopped")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadEnv() {
	paths := []string{".env", "../.env", "../../.env"}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					k := strings.TrimSpace(parts[0])
					v := strings.TrimSpace(parts[1])
					if os.Getenv(k) == "" {
						os.Setenv(k, v)
					}
				}
			}
			return
		}
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Max-Age", "86400")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func init() {
	_ = strings.TrimSpace // keep import for envOr
}
