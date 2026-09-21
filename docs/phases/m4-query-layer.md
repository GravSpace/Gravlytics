# Milestone 4 — Query Layer, Caching & dbt Rollups

Milestone 4 introduces advanced query optimizations, caching mechanics, and data warehouse transformations.

## Architectural Objectives Achieved

1. **Valkey 8 Caching Infrastructure**:
   - Integrated into the Query service (`services/query/internal/cache/cache.go`).
   - Query response caching with a 30-second TTL for dashboard aggregations.
   - Realtime visitor sliding window:
     - Maintains a sorted set keyed by `realtime:<site_id>`.
     - Elements: visitor hash scored by current Unix timestamp.
     - On each query, prunes timestamps older than 5 minutes (`ZREMRANGEBYSCORE`) and returns the remaining cardinality (`ZCARD`).

2. **dbt ClickHouse Transformations (`dbt/`)**:
   - `dbt_project.yml` configured for the ClickHouse adapter.
   - `models/staging/stg_events.sql`: Cleanses raw event records and exposes typed columns.
   - `models/marts/daily_site_stats.sql`: Pre-aggregates daily totals, unique visitors, and session bounce rates using `ReplacingMergeTree`.
   - `models/marts/daily_dimension_stats.sql`: Pre-calculates daily pageviews and visitor counts partitioned by dimension type (`country`, `browser`, `device`, `os`, `url_path`).

3. **Query Guardrails & Security**:
   - Dimension whitelist prevents arbitrary SQL injection.
   - Strict bounds on `limit` parameter (capped at 100 rows).
   - Date range validation ensuring valid ISO date strings.
