# Gravlytics

> **Where your data finds its center.**

Platform web analytics **privacy-first**, **self-hostable**, dan **multi-tenant**.

---

## ⚡ Quick Start

### Prerequisites

- [Go](https://go.dev/) 1.22+
- [Bun](https://bun.sh/) 1.0+
- [Podman](https://podman.io/) 4.0+ (with Compose)

### 1. Start Infrastructure

```bash
cd infra
podman compose up -d
```

Ini akan menjalankan:
- **ClickHouse** (port 8123/9009) — event store
- **PostgreSQL** (port 5432) — metadata store
- **Redpanda** (port 19092) — streaming buffer
- **Valkey** (port 6379) — cache layer

### 2. Start Backend Services

```bash
# Terminal 1: Collector (ingestion API)
cd services/collector
go run main.go

# Terminal 2: Consumer (Redpanda → ClickHouse)
cd services/consumer
go run main.go

# Terminal 3: Query API
cd services/query
go run main.go
```

### 3. Start Dashboard

```bash
cd apps/web
bun run dev
```

Dashboard tersedia di `http://localhost:5173`

### 4. Install Tracker

Tambahkan snippet ini ke website Anda:

```html
<script defer data-site-id="YOUR_SITE_ID" src="http://localhost:8081/gravlytics.min.js"></script>
```

---

## 🏗️ Architecture

```
Tracker → Collector → Redpanda → Consumer → ClickHouse
                                                  ↑
Dashboard → Query API → Valkey cache → ClickHouse ↗
                                   ↕
                              PostgreSQL (metadata)
```

| Service   | Port  | Deskripsi                        |
| --------- | ----- | -------------------------------- |
| Collector | 8081  | Ingestion API (event collection) |
| Consumer  | —     | Redpanda → ClickHouse worker     |
| Query API | 8082  | Dashboard data API               |
| Dashboard | 5173  | SvelteKit web UI                 |

---

## 📁 Project Structure

```
gravlytics/
├── apps/
│   ├── web/          # SvelteKit dashboard (Bun + Tailwind + shadcn-svelte)
│   └── tracker/      # Tracker JS script (< 2 KB gzip)
├── services/
│   ├── collector/    # Go — ingestion + enrichment
│   ├── consumer/     # Go — Redpanda → ClickHouse batch insert
│   └── query/        # Go — Query API + Valkey cache
├── infra/
│   ├── compose.yaml  # Podman Compose (ClickHouse, PostgreSQL, Redpanda, Valkey)
│   ├── clickhouse/   # DDL & migrations
│   └── postgres/     # DDL & migrations
└── docs/             # Documentation
```

---

## 🎨 Brand

- **Ink** `#0E1116` — dark background
- **Gravity Violet** `#6D5EF6` — primary
- **Signal Cyan** `#22D3EE` — accent
- **Emerald** `#10B981` — positive
- **Amber** `#F59E0B` — warning

---

---

## 📖 Documentation

Panduan komprehensif tersedia di folder [`docs/`](./docs/):

- **[System Architecture](./docs/architecture.md)** — Arsitektur streaming pipeline, storage layout (ClickHouse + PostgreSQL + Valkey), dan cookieless privacy.
- **[Development Guide](./docs/development.md)** — Panduan setup lokal menggunakan Podman, Go, dan Bun.
- **[API Reference](./docs/api-reference.md)** — Spesifikasi lengkap Collector API, Query API endpoints, dan client tracker SDK.
- **[Deployment Guide](./docs/deployment.md)** — Panduan produksi, reverse proxy Caddy/Nginx, dan strategi backup.
- **Milestone Implementation Specs**:
  - [M1 — Data Ingestion Pipeline](./docs/phases/m1-pipeline.md)
  - [M2 — Analytics Core Dashboard](./docs/phases/m2-dashboard.md)
  - [M3 — Multi-Tenancy & Auth System](./docs/phases/m3-multitenant.md)
  - [M4 — Query Layer & dbt Rollups](./docs/phases/m4-query-layer.md)
  - [M5 — Advanced Features (Funnels, Goals, Cohorts, Export)](./docs/phases/m5-advanced.md)

## 📄 License

MIT

