{{ config(materialized='view') }}

SELECT
    site_id,
    event_id,
    timestamp,
    toDate(timestamp) AS event_date,
    toStartOfHour(timestamp) AS event_hour,
    event_name,
    visitor_id,
    session_id,
    hostname,
    url_path,
    referrer_domain,
    referrer_path,
    utm_source,
    utm_medium,
    utm_campaign,
    country,
    region,
    city,
    device_type,
    browser,
    browser_version,
    os,
    os_version,
    screen_width,
    props
FROM {{ source('gravlytics', 'events') }}
