# Gravlytics — Production Deployment Guide

This document provides operational guidelines for deploying and managing Gravlytics in production using **Podman** and system services.

---

## 1. System Requirements & Hardware Sizing

| Workload Tier | Monthly Pageviews | CPU Cores | RAM | Storage |
|---------------|-------------------|-----------|-----|---------|
| **Starter** | < 1,000,000 | 2 cores | 4 GB | 50 GB SSD |
| **Growth** | 1M – 10M | 4 cores | 8 GB | 200 GB NVMe |
| **Scale** | 10M – 100M+ | 8–16 cores| 16–32 GB | 1 TB+ NVMe |

---

## 2. Podman Container Deployment

### Running with Podman Compose

Gravlytics supplies a production-ready compose configuration at `infra/compose.yaml`.

```bash
# Pull and start all core datastores
podman-compose -f infra/compose.yaml up -d
```

### Systemd Integration (Automatic Restarts via Quadlet)

To ensure Podman containers start on server boot and restart on failure, generate systemd service files:

```bash
# Generate systemd units from running containers
podman generate systemd --new --files --name gravlytics-clickhouse
podman generate systemd --new --files --name gravlytics-postgres
podman generate systemd --new --files --name gravlytics-redpanda
podman generate systemd --new --files --name gravlytics-valkey

# Move to user or system directory
mv container-*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now container-gravlytics-clickhouse.service
```

---

## 3. Reverse Proxy & SSL Configuration (Caddy / Nginx)

Expose Gravlytics publicly with automatic Let's Encrypt TLS:

### Caddyfile Example

```caddy
# Public Collector & Tracker Endpoint
analytics.example.com {
    # Tracker script static file caching
    @tracker path /gravlytics.js
    header @tracker Cache-Control "public, max-age=86400, stale-while-revalidate=604800"
    reverse_proxy @tracker localhost:8081

    # Ingestion endpoint
    handle /api/collect {
        reverse_proxy localhost:8081
    }

    # Query API
    handle /api/stats/* {
        reverse_proxy localhost:8082
    }

    # SvelteKit Web Dashboard
    handle {
        reverse_proxy localhost:3000
    }
}
```

---

## 4. Backup & Retention Strategy

### ClickHouse Data Retention
ClickHouse partitions events by month (`toYYYYMM(timestamp)`). To implement a rolling 24-month data retention policy:

```sql
ALTER TABLE events DROP PARTITION 202401;
```

Or configure automated TTL on the `events` table:
```sql
ALTER TABLE events MODIFY TTL timestamp + INTERVAL 2 YEAR;
```

### PostgreSQL Backup (Cron Daily Dump)
```bash
pg_dump -U postgres -h localhost -d gravlytics -F c -b -v -f "/backup/gravlytics_$(date +%Y%m%d).dump"
```
