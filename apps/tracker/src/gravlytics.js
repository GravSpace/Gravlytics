/**
 * Gravlytics — Lightweight web analytics tracker
 * Privacy-first, cookieless, < 2 KB gzip
 *
 * Usage:
 *   <script defer data-site-id="YOUR_SITE_ID" src="https://your-domain/gravlytics.js"></script>
 *
 * Custom events:
 *   gravlytics.track('signup', { plan: 'pro' })
 */
;(function () {
  'use strict'

  // Respect Do Not Track
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return

  var script = document.currentScript
  var siteId = script && script.getAttribute('data-site-id')
  if (!siteId) return

  var endpoint =
    (script.getAttribute('data-api') || script.src.replace(/\/[^/]*$/, '')) +
    '/api/collect'

  // Unique tab ID for session tracking (no cookies, memory only)
  var tabId =
    Math.random().toString(36).substring(2) + Date.now().toString(36)

  // Screen width
  var sw = window.screen ? window.screen.width : 0

  // Send event
  function send(name, props) {
    var payload = {
      s: siteId,           // site_id
      n: name,             // event_name
      u: location.pathname,// url_path
      h: location.hostname,// hostname
      r: document.referrer,// referrer
      w: sw,               // screen_width
      t: tabId,            // tab session identifier
    }

    // UTM params from URL (only on first pageview)
    if (name === 'pageview') {
      var params = new URLSearchParams(location.search)
      var us = params.get('utm_source')
      var um = params.get('utm_medium')
      var uc = params.get('utm_campaign')
      if (us) payload.us = us
      if (um) payload.um = um
      if (uc) payload.uc = uc
    }

    // Custom properties
    if (props && typeof props === 'object') {
      payload.p = props
    }

    var data = JSON.stringify(payload)

    // Prefer sendBeacon for reliability, fallback to fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, data)
    } else {
      fetch(endpoint, {
        method: 'POST',
        body: data,
        keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
      }).catch(function () {})
    }
  }

  // Track pageview
  function page() {
    send('pageview')
  }

  // ── SPA support: intercept History API ──
  var pushState = history.pushState
  if (pushState) {
    history.pushState = function () {
      pushState.apply(history, arguments)
      page()
    }
  }
  window.addEventListener('popstate', page)

  // ── Public API ──
  window.gravlytics = {
    track: function (name, props) {
      if (name) send(name, props)
    },
  }

  // ── Initial pageview ──
  page()
})()
