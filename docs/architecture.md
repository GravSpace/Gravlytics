# Gravlytics — System Architecture

Gravlytics is a privacy-first, self-hostable, high-throughput web analytics platform engineered to process millions of pageviews while ensuring complete tenant isolation and GDPR compliance.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                            │
│  <script defer data-site-id="gly_xyz" src=".../gravlytics.js"></script>│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP POST (sendBeacon / fetch)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  COLLECTOR SERVICE (Go :8081)                         │
│  - Cookieless daily visitor hash: SHA256(IP + Salt + User-Agent + Date) │
│  - User-Agent parsing (Browser, OS, Device category)                   │
│  - Coarse Geo-IP resolution (Country, City)                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ franz-go (Snappy compressed batch)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   STREAMING BUFFER (Redpanda)                          │
│  - Topic: events (Replication factor: 1, Partitions: 3)                 │
│  - Dead Letter Queue: events-dlq                                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ franz-go Consumer Group
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  CONSUMER SERVICE (Go Worker)                          │
│  - Micro-batch buffer: 1,000 records or 2,000ms flush window           │
│  - Deduplication via UUID event_id                                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Native ClickHouse Batch Insert
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   ANALYTICS ENGINE (ClickHouse)                        │
│  - Table: events (ReplacingMergeTree partitioned by toYYYYMM(timestamp))│
│  - Materialized Views: mv_hourly_stats, mv_country_stats, etc.         │
│  - Aggregating tables: daily_visitors (AggregatingMergeTree, uniqExact) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQL Queries (site_id tenant guarded)
                                    ▼
┌───────────────────────────────────┴────────────────────────────────────┐
│                    QUERY SERVICE (Go :8082)                            │
│  - REST API: /api/stats/overview, timeseries, breakdown, realtime      │
│  - Valkey 8 Cache (TTL 30s aggregate, 5s realtime sliding window)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON Response
                                    ▼
┌───────────────────────────────────┴────────────────────────────────────┐
│             DASHBOARD & MANAGEMENT (SvelteKit + Bun :3000)             │
│  - SSR + Svelte 5 runes + Tailwind CSS                                 │
│  - Multi-tenant auth (JWT + scrypt password hashing + OAuth)           │
│  - PostgreSQL 16 metadata store: users, orgs, sites, api_keys, goals   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Data Layer & Storage Design

### 1. ClickHouse (High-Velocity Analytics Engine)

ClickHouse stores all immutable analytical event telemetry.

- **`events` table (`ReplacingMergeTree`)**:
  - Primary key: `(site_id, toDate(timestamp), event_name, visitor_id, session_id, event_id)`
  - Partition key: `toYYYYMM(timestamp)`
  - Deduplication: `ReplacingMergeTree` automatically reconciles duplicate `event_id` deliveries during background merges.
- **Rollup Tables (`AggregatingMergeTree`)**:
  - `daily_visitors`: Pre-aggregates daily unique visitor state using ClickHouse's `AggregateFunction(uniq, UInt64)`.
  - `hourly_stats`: Pre-computes pageviews and sessions per hour.
- **Materialized Views**:
  - `mv_country_stats`: Continuous breakdown by country.
  - `mv_pages_stats`: Continuous breakdown by URL path.
  - `mv_referrer_stats`: Continuous breakdown by referring domain.
  - `mv_device_stats`: Continuous breakdown by device category, browser, and OS.

### 2. PostgreSQL (Relational Metadata & RBAC)

PostgreSQL manages relational state, tenant organizations, user identities, and access policies:
- **`users`**: Email/password credentials (scrypt salted hash) and OAuth provider linkages.
- **`organizations`**: Multi-tenant isolation boundaries.
- **`memberships`**: RBAC permissions (`owner`, `editor`, `viewer`).
- **`sites`**: Tracked domains, short `tracking_id`, secret salt for daily visitor hashing, public visibility toggles.
- **`api_keys`**: Scoped API credentials (`ingestion`, `query`, `all`) with bcrypt-hashed keys.
- **`goals`**: Custom event targets and pageview conversion checkpoints.
- **`saved_reports`**: Filter presets and custom reporting views.

### 3. Redpanda (Kafka-Compatible Event Streaming)

- Acts as a durable write buffer between ingestion bursts and database storage.
- Guarantees zero dropped events during ClickHouse maintenance or indexing spikes.
- Low memory footprint (< 1GB container baseline).

### 4. Valkey 8 (In-Memory Query Cache)

- High-performance caching layer for query aggregates (TTL: 30–60s).
- Realtime sliding window counter: Uses Valkey sorted sets (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`) to track concurrent active visitors within the last 5 minutes.

---

## Privacy Architecture (Cookieless by Design)

1. **No Client-side Cookies or LocalStorage ID**: The tracking script does not set any cookies or persistent local storage identifiers.
2. **Rotating Daily Hash**: Visitor identity is computed dynamically on the server:
   $$\text{visitor\_id} = \text{UInt64}(\text{SHA256}(\text{IP} + \text{Daily Salt} + \text{User-Agent} + \text{YYYY-MM-DD}))$$
   Because the salt rotates daily and the IP address is immediately discarded after hashing, it is mathematically impossible to track users across days or across different websites.
3. **Respects Privacy Signals**: If `navigator.doNotTrack === '1'` or `navigator.globalPrivacyControl` is active, the script terminates immediately without emitting network traffic.
