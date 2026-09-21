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
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	port := envOr("QUERY_PORT", "8082")

	// ClickHouse
	chHost := envOr("CLICKHOUSE_HOST", "localhost")
	chPort := envOr("CLICKHOUSE_PORT", "9000")
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

	// Stats endpoints
	mux.HandleFunc("GET /api/v1/stats/overview", h.Overview)
	mux.HandleFunc("GET /api/v1/stats/timeseries", h.TimeSeries)
	mux.HandleFunc("GET /api/v1/stats/breakdown", h.Breakdown)
	mux.HandleFunc("GET /api/v1/stats/realtime", h.Realtime)

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

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
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
