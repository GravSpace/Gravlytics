package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gravlytics/consumer/internal/batcher"
	chclient "github.com/gravlytics/consumer/internal/clickhouse"
	"github.com/gravlytics/consumer/internal/consumer"
)

func main() {
	loadEnv()

	// Structured logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Config from env
	brokers := strings.Split(envOr("REDPANDA_BROKERS", "localhost:19092"), ",")
	topic := envOr("REDPANDA_TOPIC_EVENTS", "events")
	dlqTopic := envOr("REDPANDA_TOPIC_DLQ", "events-dlq")
	group := envOr("CONSUMER_GROUP", "gravlytics-consumer")
	batchSize := envOrInt("CONSUMER_BATCH_SIZE", 1000)
	flushIntervalMs := envOrInt("CONSUMER_FLUSH_INTERVAL_MS", 2000)

	chHost := envOr("CLICKHOUSE_HOST", "localhost")
	chPort := envOr("CLICKHOUSE_PORT", "9009")
	chDB := envOr("CLICKHOUSE_DB", "gravlytics")
	chUser := envOr("CLICKHOUSE_USER", "default")
	chPassword := envOr("CLICKHOUSE_PASSWORD", "gravlytics_dev")

	// Initialize ClickHouse client
	ch, err := chclient.New(chHost, chPort, chDB, chUser, chPassword)
	if err != nil {
		slog.Error("failed to connect to ClickHouse", "error", err)
		os.Exit(1)
	}
	defer ch.Close()

	// Initialize batcher
	b := batcher.New(
		ch,
		batchSize,
		time.Duration(flushIntervalMs)*time.Millisecond,
		logger,
	)

	// Graceful shutdown context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		slog.Info("shutting down consumer...")
		cancel()
	}()

	// Initialize and run Kafka consumer
	cons, err := consumer.New(brokers, topic, dlqTopic, group, b, logger)
	if err != nil {
		slog.Error("failed to create consumer", "error", err)
		os.Exit(1)
	}

	slog.Info("consumer started",
		"brokers", brokers,
		"topic", topic,
		"group", group,
		"batchSize", batchSize,
		"flushInterval", time.Duration(flushIntervalMs)*time.Millisecond,
	)

	// Run blocks until context is cancelled
	cons.Run(ctx)

	// Flush remaining events
	b.Flush()

	slog.Info("consumer stopped")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envOrInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
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
