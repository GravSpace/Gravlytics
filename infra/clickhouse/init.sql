-- ══════════════════════════════════════════════════════════════
-- Gravlytics — ClickHouse DDL
-- Event store: MergeTree family tables + rollup Materialized Views
-- ══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS gravlytics;

-- ── Raw events table ──
-- ReplacingMergeTree deduplicates by event_id on merge
CREATE TABLE IF NOT EXISTS gravlytics.events
(
    site_id       UInt64,
    event_id      UUID,
    timestamp     DateTime64(3, 'UTC'),
    event_name    LowCardinality(String)  DEFAULT 'pageview',

    -- Visitor / session (cookieless, daily hash)
    visitor_id    UInt64,
    session_id    UInt64,

    -- Page
    hostname      LowCardinality(String)  DEFAULT '',
    url_path      String                  DEFAULT '/',

    -- Referrer
    referrer_domain LowCardinality(String) DEFAULT '',
    referrer_path   String                 DEFAULT '',

    -- UTM
    utm_source    LowCardinality(String)  DEFAULT '',
    utm_medium    LowCardinality(String)  DEFAULT '',
    utm_campaign  LowCardinality(String)  DEFAULT '',

    -- Geo (from IP enrichment, IP never stored)
    country       LowCardinality(String)  DEFAULT '',
    region        LowCardinality(String)  DEFAULT '',
    city          LowCardinality(String)  DEFAULT '',

    -- Device (from User-Agent parsing)
    device_type   LowCardinality(String)  DEFAULT '',   -- desktop/mobile/tablet
    browser       LowCardinality(String)  DEFAULT '',
    browser_version LowCardinality(String) DEFAULT '',
    os            LowCardinality(String)  DEFAULT '',
    os_version    LowCardinality(String)  DEFAULT '',

    -- Screen
    screen_width  UInt16                  DEFAULT 0,

    -- Custom event properties
    props         Map(String, String)     DEFAULT map(),

    -- Metadata
    created_at    DateTime64(3, 'UTC')    DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, event_name, timestamp, visitor_id, event_id)
SETTINGS index_granularity = 8192;


-- ── Daily visitors rollup (AggregatingMergeTree) ──
CREATE TABLE IF NOT EXISTS gravlytics.daily_visitors
(
    site_id       UInt64,
    date          Date,
    event_name    LowCardinality(String),
    visitors      AggregateFunction(uniq, UInt64),
    pageviews     AggregateFunction(count),
    sessions      AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (site_id, date, event_name);


-- ── Materialized View: auto-populate daily_visitors on insert ──
CREATE MATERIALIZED VIEW IF NOT EXISTS gravlytics.daily_visitors_mv
TO gravlytics.daily_visitors
AS
SELECT
    site_id,
    toDate(timestamp) AS date,
    event_name,
    uniqState(visitor_id) AS visitors,
    countState() AS pageviews,
    uniqState(session_id) AS sessions
FROM gravlytics.events
GROUP BY site_id, date, event_name;


-- ── Hourly breakdown rollup ──
CREATE TABLE IF NOT EXISTS gravlytics.hourly_stats
(
    site_id       UInt64,
    hour          DateTime('UTC'),
    event_name    LowCardinality(String),
    dimension     LowCardinality(String),   -- 'country', 'browser', 'url_path', etc.
    dimension_value String,
    visitors      AggregateFunction(uniq, UInt64),
    pageviews     AggregateFunction(count)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (site_id, hour, event_name, dimension, dimension_value);


-- ── MV: breakdown by country ──
CREATE MATERIALIZED VIEW IF NOT EXISTS gravlytics.hourly_country_mv
TO gravlytics.hourly_stats
AS
SELECT
    site_id,
    toStartOfHour(timestamp) AS hour,
    event_name,
    'country' AS dimension,
    country AS dimension_value,
    uniqState(visitor_id) AS visitors,
    countState() AS pageviews
FROM gravlytics.events
GROUP BY site_id, hour, event_name, dimension_value;


-- ── MV: breakdown by url_path ──
CREATE MATERIALIZED VIEW IF NOT EXISTS gravlytics.hourly_pages_mv
TO gravlytics.hourly_stats
AS
SELECT
    site_id,
    toStartOfHour(timestamp) AS hour,
    event_name,
    'url_path' AS dimension,
    url_path AS dimension_value,
    uniqState(visitor_id) AS visitors,
    countState() AS pageviews
FROM gravlytics.events
GROUP BY site_id, hour, event_name, dimension_value;


-- ── MV: breakdown by referrer_domain ──
CREATE MATERIALIZED VIEW IF NOT EXISTS gravlytics.hourly_referrer_mv
TO gravlytics.hourly_stats
AS
SELECT
    site_id,
    toStartOfHour(timestamp) AS hour,
    event_name,
    'referrer_domain' AS dimension,
    referrer_domain AS dimension_value,
    uniqState(visitor_id) AS visitors,
    countState() AS pageviews
FROM gravlytics.events
GROUP BY site_id, hour, event_name, dimension_value;


-- ── MV: breakdown by browser ──
CREATE MATERIALIZED VIEW IF NOT EXISTS gravlytics.hourly_browser_mv
TO gravlytics.hourly_stats
AS
SELECT
    site_id,
    toStartOfHour(timestamp) AS hour,
    event_name,
    'browser' AS dimension,
    browser AS dimension_value,
    uniqState(visitor_id) AS visitors,
    countState() AS pageviews
FROM gravlytics.events
GROUP BY site_id, hour, event_name, dimension_value;


-- ── MV: breakdown by device_type ──
CREATE MATERIALIZED VIEW IF NOT EXISTS gravlytics.hourly_device_mv
TO gravlytics.hourly_stats
AS
SELECT
    site_id,
    toStartOfHour(timestamp) AS hour,
    event_name,
    'device_type' AS dimension,
    device_type AS dimension_value,
    uniqState(visitor_id) AS visitors,
    countState() AS pageviews
FROM gravlytics.events
GROUP BY site_id, hour, event_name, dimension_value;


-- ── MV: breakdown by OS ──
CREATE MATERIALIZED VIEW IF NOT EXISTS gravlytics.hourly_os_mv
TO gravlytics.hourly_stats
AS
SELECT
    site_id,
    toStartOfHour(timestamp) AS hour,
    event_name,
    'os' AS dimension,
    os AS dimension_value,
    uniqState(visitor_id) AS visitors,
    countState() AS pageviews
FROM gravlytics.events
GROUP BY site_id, hour, event_name, dimension_value;
