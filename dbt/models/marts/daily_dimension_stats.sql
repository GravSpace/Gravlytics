{{ config(
    materialized='table',
    engine='ReplacingMergeTree',
    order_by=['site_id', 'event_date', 'dimension_type', 'dimension_value']
) }}

SELECT
    site_id,
    event_date,
    'country' AS dimension_type,
    country AS dimension_value,
    count() AS pageviews,
    uniq(visitor_id) AS visitors
FROM {{ ref('stg_events') }}
WHERE event_name = 'pageview' AND country != ''
GROUP BY site_id, event_date, country

UNION ALL

SELECT
    site_id,
    event_date,
    'browser' AS dimension_type,
    browser AS dimension_value,
    count() AS pageviews,
    uniq(visitor_id) AS visitors
FROM {{ ref('stg_events') }}
WHERE event_name = 'pageview' AND browser != ''
GROUP BY site_id, event_date, browser

UNION ALL

SELECT
    site_id,
    event_date,
    'device' AS dimension_type,
    device_type AS dimension_value,
    count() AS pageviews,
    uniq(visitor_id) AS visitors
FROM {{ ref('stg_events') }}
WHERE event_name = 'pageview' AND device_type != ''
GROUP BY site_id, event_date, device_type

UNION ALL

SELECT
    site_id,
    event_date,
    'os' AS dimension_type,
    os AS dimension_value,
    count() AS pageviews,
    uniq(visitor_id) AS visitors
FROM {{ ref('stg_events') }}
WHERE event_name = 'pageview' AND os != ''
GROUP BY site_id, event_date, os

UNION ALL

SELECT
    site_id,
    event_date,
    'url_path' AS dimension_type,
    url_path AS dimension_value,
    count() AS pageviews,
    uniq(visitor_id) AS visitors
FROM {{ ref('stg_events') }}
WHERE event_name = 'pageview' AND url_path != ''
GROUP BY site_id, event_date, url_path
