# Gravlytics — Development Guide

This guide walks you through setting up a complete local development environment for Gravlytics using **Podman**, **Bun**, and **Go**.

---

## Prerequisites

- **Podman**: v5.0+ (or v6.0+) and `podman-compose`
- **Go**: v1.22+
- **Bun**: v1.1+ (for SvelteKit web dashboard and tracker build)

---

## Quick Start (Local Setup)

### 1. Clone & Environment Configuration

```bash
git clone https://github.com/your-org/gravlytics.git
cd gravlytics
cp .env.example .env
```

Review `.env` to customize default ports or secrets if needed.

### 2. Launch Infrastructure Services with Podman

```bash
# Start ClickHouse, PostgreSQL, Redpanda, Valkey, and Redpanda Console
podman-compose -f infra/compose.yaml up -d

# Verify container health
podman ps
```

Default exposed ports:
- **ClickHouse**: `http://localhost:8123` (Native port: `9000`)
- **PostgreSQL**: `localhost:5432` (`postgres:gravlytics@localhost:5432/gravlytics`)
- **Redpanda**: `localhost:9092` (Console UI: `http://localhost:8080`)
- **Valkey**: `localhost:6379`

### 3. Build & Run the Go Services

#### A. Collector Service (Port 8081)
```bash
cd services/collector
go run main.go
```
Health check: `curl http://localhost:8081/healthz`

#### B. Consumer Service (Background Worker)
```bash
cd services/consumer
go run main.go
```

#### C. Query Service (Port 8082)
```bash
cd services/query
go run main.go
```
Health check: `curl http://localhost:8082/healthz`

---

## Running the Web Dashboard (`apps/web`)

```bash
cd apps/web

# Install dependencies (already prepared)
bun install

# Run Vite development server
bun run dev
```

Open `http://localhost:5173` in your browser.

### Typecheck & Production Build

```bash
# Type check all routes and components
bun run check

# Production build
bun run build
```

---

## Building the Tracking Script (`apps/tracker`)

The tracking script is bundled with Bun into a tiny minified payload asserted to stay under 2 KB gzipped.

```bash
cd apps/tracker

# Build and assert size limit
bun run build
```

The resulting minified script is located at `apps/tracker/dist/gravlytics.min.js` (~620 bytes gzipped).

---

## Running dbt Transformations

```bash
cd dbt

# Install ClickHouse dbt adapter if using Python venv
pip install dbt-clickhouse

# Test connection
dbt debug --profiles-dir .

# Execute rollup models
dbt run --profiles-dir .
```
