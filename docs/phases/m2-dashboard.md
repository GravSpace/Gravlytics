# Milestone 2 — Core Analytics Dashboard

Milestone 2 delivers the analytical querying layer and the modern SvelteKit web dashboard.

## Architectural Objectives Achieved

1. **Query API Service (`services/query/`)**:
   - Written in Go, listening on `:8082`.
   - Aggregates ClickHouse telemetry with parametrized queries and strict dimension whitelisting.
   - Endpoints:
     - `GET /api/stats/overview`: Pageviews, unique visitors, sessions, bounce rate calculation.
     - `GET /api/stats/timeseries`: Daily and hourly grouped time-series graphs.
     - `GET /api/stats/breakdown`: Top pages, referrers, UTM campaigns, countries, browsers, devices, and operating systems.
     - `GET /api/stats/realtime`: Active visitors in the 5-minute sliding window.
   - Valkey 8 cache wrapper with `X-Cache: HIT | MISS` response headers.

2. **SvelteKit Dashboard (`apps/web/`)**:
   - Built with **Bun** runtime, SvelteKit, Svelte 5 runes, and Tailwind CSS.
   - Strict adherence to the Gravlytics Design System tokens (Ink `#0E1116`, Violet `#6D5EF6`, Cyan `#22D3EE`, Emerald `#10B981`).
   - Glassmorphic card styling, responsive layouts, collapsible sidebar, and dark mode default.

3. **Core Dashboard Pages**:
   - `/`: Executive overview with 4 KPI cards, interactive time-series chart, and 4 breakdown tables.
   - `/realtime`: Live visitor monitor with pulse animation and active page breakdown.
   - `/pages`: Top paths, landing pages, and exit pages.
   - `/sources`: Referrers, UTM mediums, and active UTM campaigns.
   - `/locations`: Coarse country and city geo-distribution.
   - `/devices`: Hardware categories, browsers, operating systems, and screen resolutions.
