# Milestone 1 — Ingestion Pipeline & Data Foundation

Milestone 1 delivers the complete high-throughput, fault-tolerant telemetry ingestion pipeline.

## Architectural Objectives Achieved

1. **Lightweight Tracker (`apps/tracker/`)**:
   - Cookieless tracking script implemented in vanilla JavaScript.
   - Size: **620 bytes gzipped** (well within the < 2 KB PRD threshold).
   - Features: `sendBeacon` with `fetch` fallback, SPA history listening (`pushState`/`popstate`), DNT/GPC signal adherence, UTM param extraction, and minified payload compression.

2. **Collector Service (`services/collector/`)**:
   - Written in Go using the standard library HTTP server and `franz-go` Kafka driver.
   - Listens on `:8081` with endpoint `POST /api/collect` and health check `GET /healthz`.
   - Generates rotating cookieless daily visitor hashes (`SHA256(IP + Salt + UA + Date)`).
   - Enriches incoming payloads with user-agent classifications (Device category, Browser name/version, OS name/version) and coarse geo-resolution.
   - Buffers enriched events into the Redpanda `events` topic with Snappy compression.

3. **Consumer Service (`services/consumer/`)**:
   - Consumes from the Redpanda `events` topic using a high-throughput consumer group.
   - Implements an adaptive micro-batching buffer: flushes to ClickHouse every **1,000 events or 2 seconds**, whichever arrives first.
   - Emits malformed or unprocessable payloads to the `events-dlq` dead-letter queue.
   - Performs bulk native batch inserts into ClickHouse via `PrepareBatch`.

4. **ClickHouse Infrastructure (`infra/clickhouse/init.sql`)**:
   - `events` table with `ReplacingMergeTree` to handle potential duplicate deliveries.
   - 6 continuous Materialized Views (`hourly_stats`, `daily_visitors`, `pages`, `sources`, `countries`, `devices`).
