# Gravlytics — API Reference

Gravlytics exposes REST APIs for event collection, metric querying, and programmatic dashboard integration.

---

## 1. Ingestion / Collector API (`:8081`)

### `POST /api/collect`

Ingests raw analytical event data emitted by the client tracker script.

- **Headers**:
  - `Content-Type`: `application/json` or `text/plain`
  - `User-Agent`: Client browser UA string
  - `X-Forwarded-For`: Client IP (for server-side geo/visitor hashing)

#### Minified Payload Fields (Tracker Script Format)

| Field | Type | Description |
|-------|------|-------------|
| `s` | `string` | **Required.** Site tracking ID (e.g. `gly_8f92ab`) |
| `n` | `string` | **Required.** Event name (e.g. `pageview`, `signup`, `purchase`) |
| `u` | `string` | URL pathname (e.g. `/pricing`) |
| `h` | `string` | Hostname (e.g. `example.com`) |
| `r` | `string` | Referring URL (e.g. `https://google.com`) |
| `w` | `integer`| Viewport screen width in pixels (e.g. `1920`) |
| `t` | `string` | In-memory tab session identifier |
| `us`| `string` | UTM Source (e.g. `newsletter`) |
| `um`| `string` | UTM Medium (e.g. `email`) |
| `uc`| `string` | UTM Campaign (e.g. `spring_launch`) |
| `p` | `object` | Custom properties dictionary (key-value strings) |

#### Example Request

```bash
curl -X POST http://localhost:8081/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "s": "gly_demo_8829",
    "n": "pageview",
    "u": "/blog/privacy-first",
    "h": "gravlytics.dev",
    "r": "https://google.com",
    "w": 1440,
    "t": "tab_x9f2"
  }'
```

#### Response
- `204 No Content` on success.
- `400 Bad Request` if `s` or `n` is missing.

---

## 2. Query API (`:8082`)

All Query API endpoints support caching via Valkey (indicated by the `X-Cache: HIT | MISS` response header).

### `GET /api/stats/overview`

Returns aggregated summary KPIs for a site over a designated time window.

#### Query Parameters
- `site_id` (`string`, required): Site tracking ID.
- `from` (`string`, optional): Start date formatted as `YYYY-MM-DD`. Default: 30 days ago.
- `to` (`string`, optional): End date formatted as `YYYY-MM-DD`. Default: today.

#### Response (`200 OK`)
```json
{
  "pageviews": 43291,
  "unique_visitors": 12847,
  "sessions": 16420,
  "bounce_rate": 42.3,
  "avg_duration": 185.4
}
```

---

### `GET /api/stats/timeseries`

Returns chronological metric data points grouped by day or hour.

#### Query Parameters
- `site_id` (`string`, required): Site tracking ID.
- `from` (`string`, optional): Start date `YYYY-MM-DD`.
- `to` (`string`, optional): End date `YYYY-MM-DD`.
- `interval` (`string`, optional): `day` or `hour`. Default: `day` (auto selects `hour` if range <= 48h).

#### Response (`200 OK`)
```json
[
  {
    "date": "2026-03-01",
    "pageviews": 1420,
    "unique_visitors": 890
  },
  {
    "date": "2026-03-02",
    "pageviews": 1580,
    "unique_visitors": 940
  }
]
```

---

### `GET /api/stats/breakdown`

Returns top items sorted by frequency for a selected analytical dimension.

#### Query Parameters
- `site_id` (`string`, required): Site tracking ID.
- `dimension` (`string`, required): One of:
  - `url_path`
  - `referrer_domain`
  - `country`
  - `city`
  - `device_type`
  - `browser`
  - `os`
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
- `from` (`string`, optional): `YYYY-MM-DD`.
- `to` (`string`, optional): `YYYY-MM-DD`.
- `limit` (`integer`, optional): Number of rows to return (default: 20, max: 100).

#### Response (`200 OK`)
```json
[
  {
    "value": "google.com",
    "pageviews": 8940,
    "unique_visitors": 6120
  },
  {
    "value": "github.com",
    "pageviews": 4210,
    "unique_visitors": 3050
  }
]
```

---

### `GET /api/stats/realtime`

Returns the count of active unique visitors seen in the last 5 minutes.

#### Query Parameters
- `site_id` (`string`, required): Site tracking ID.

#### Response (`200 OK`)
```json
{
  "active_visitors": 18
}
```

---

## 3. Client Tracker JavaScript API

The tracking script exposes a lightweight global API on `window.gravlytics`:

```javascript
// Custom event tracking
window.gravlytics.track('signup_button_clicked', {
  plan: 'enterprise',
  source: 'header_cta'
});
```
