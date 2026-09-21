{{ config(
    materialized='table',
    engine='ReplacingMergeTree',
    order_by=['site_id', 'event_date']
) }}

WITH raw_daily AS (
    SELECT
        site_id,
        event_date,
        count() AS total_events,
        countIf(event_name = 'pageview') AS pageviews,
        uniq(visitor_id) AS unique_visitors,
        uniq(session_id) AS total_sessions
    FROM {{ ref('stg_events') }}
    GROUP BY site_id, event_date
),

bounces AS (
    SELECT
        site_id,
        event_date,
        count() AS bounce_sessions
    FROM (
        SELECT
            site_id,
            toDate(timestamp) AS event_date,
            session_id,
            count() AS pv
        FROM {{ ref('stg_events') }}
        WHERE event_name = 'pageview'
        GROUP BY site_id, event_date, session_id
        HAVING pv = 1
    )
    GROUP BY site_id, event_date
)

SELECT
    r.site_id,
    r.event_date,
    r.total_events,
    r.pageviews,
    r.unique_visitors,
    r.total_sessions,
    coalesce(b.bounce_sessions, 0) AS bounce_sessions,
    if(r.total_sessions > 0, round(coalesce(b.bounce_sessions, 0) / r.total_sessions * 100, 2), 0.0) AS bounce_rate
FROM raw_daily r
LEFT JOIN bounces b ON r.site_id = b.site_id AND r.event_date = b.event_date
