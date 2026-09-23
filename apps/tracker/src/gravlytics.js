/**
 * Gravlytics — Lightweight web analytics & telemetry tracker
 * Privacy-first, cookieless, high-performance
 *
 * Supported features:
 *   1. Auto Pageview (SPA History API support)
 *   2. Client-Side Anti-Bot & Anti-DDoS Ingestion Guard
 *   3. Core Web Vitals Monitoring (LCP, CLS, INP, TTFB, FCP)
 *   4. Ad Viewability (IAB 50% 1s standard) & Fill Rate Tracking
 *   5. HTML Data Attributes & JavaScript API
 *   6. Google Analytics dataLayer & gtag compatibility
 */
;(function () {
  'use strict'

  var w = window
  var d = document
  var nav = navigator
  var loc = location

  // Respect Do Not Track / Global Privacy Control
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl) return

  // Anti-Bot: Drop automated browsers, headless environments & scrapers before any network calls
  if (
    nav.webdriver ||
    w._phantom ||
    w.__nightmare ||
    w.callPhantom ||
    (nav.userAgent && /bot|crawler|spider|crawling|headless|scrape|slurp/i.test(nav.userAgent))
  ) {
    return
  }

  var script = d.currentScript
  var getAttr = function (el, a) { return el && el.getAttribute ? el.getAttribute(a) : null }
  var siteId = getAttr(script, 'data-site-id')
  if (!siteId) return

  // Optional domain filter (e.g. data-domains="example.com,app.example.com")
  var domains = getAttr(script, 'data-domains')
  if (domains) {
    var domainList = domains.split(',').map(function (dm) { return dm.trim() })
    if (domainList.indexOf(loc.hostname) === -1) return
  }

  var isNotFalse = function (k) { return !script || getAttr(script, k) !== 'false' }
  var autoTrack = isNotFalse('data-auto-track')
  var enhancedMeasurement = isNotFalse('data-enhanced')
  var trackOutbound = isNotFalse('data-track-outbound')
  var trackDownloads = isNotFalse('data-track-downloads')
  var trackSearch = isNotFalse('data-track-search')
  var trackForms = isNotFalse('data-track-forms')

  // Debug mode: URL ?gravlytics_debug=true / _debug=1 / data-debug="true", sessionStorage, script data-debug="true"
  var isDebugMode = false
  var DEBUG_KEY = 'gravlytics_debug'
  try {
    var sp = new URLSearchParams(loc.search)
    var isD = function (v) { return v === 'true' || v === '1' || v === '"true"' }
    var urlDebug = isD(sp.get(DEBUG_KEY)) || isD(sp.get('_debug')) || isD(sp.get('data-debug')) || isD(sp.get('debug'))
    if (urlDebug || (script && isD(getAttr(script, 'data-debug')))) {
      isDebugMode = true
      sessionStorage.setItem(DEBUG_KEY, 'true')
    } else if (sessionStorage.getItem(DEBUG_KEY) === 'true') {
      isDebugMode = true
    }
  } catch (e) {}

  var endpoint =
    (getAttr(script, 'data-api') || (script && script.src ? script.src.replace(/\/[^/]*$/, '') : '')) +
    '/api/collect'

  // Unique tab ID for session tracking (no cookies, memory only)
  var tabId =
    Math.random().toString(36).substring(2) + Date.now().toString(36)

  // Screen width
  var sw = w.screen ? w.screen.width : 0

  // Anti-DDoS client-side leaky bucket (max 12 events per 5s window, max 60 per minute per tab)
  var recentEvents = []
  function isRateLimited() {
    var now = Date.now()
    recentEvents = recentEvents.filter(function (t) { return now - t < 60000 })
    var shortWindow = recentEvents.filter(function (t) { return now - t < 5000 })
    if (shortWindow.length >= 12 || recentEvents.length >= 60) {
      return true
    }
    recentEvents.push(now)
    return false
  }

  // Event listener helper
  function on(target, ev, fn, opt) {
    if (target && target.addEventListener) target.addEventListener(ev, fn, opt)
  }

  // Helper to build base payload
  function getBasePayload(name) {
    var tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch (e) {}

    var payload = {
      s: siteId,            // site_id
      n: name || 'pageview',// event_name
      u: loc.pathname,      // url_path
      h: loc.hostname,      // hostname
      r: d.referrer,        // referrer
      w: sw,                // screen_width
      t: tabId,             // tab session identifier
      tz: tz,               // timezone e.g. Asia/Jakarta
      l: nav.language || '',// locale e.g. id-ID
    }

    // UTM params on pageviews
    if (payload.n === 'pageview') {
      try {
        var params = new URLSearchParams(loc.search)
        var us = params.get('utm_source')
        var um = params.get('utm_medium')
        var uc = params.get('utm_campaign')
        if (us) payload.us = us
        if (um) payload.um = um
        if (uc) payload.uc = uc
      } catch (e) {}
    }

    return payload
  }

  // Page-level metadata from dataLayer
  var pageProps = {}

  function extractProps(obj) {
    var props = {}
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && k !== 'event') {
        props[k] = typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : String(obj[k])
      }
    }
    return props
  }

  // Send event with anti-DDoS rate-limiting protection
  function send(name, props) {
    if (isRateLimited()) return

    var payload

    // Support functional tracker: track((defaultProps) => ...)
    if (typeof name === 'function') {
      var defaultProps = getBasePayload('custom')
      var res = name(defaultProps)
      if (typeof res === 'string') {
        payload = getBasePayload(res)
      } else if (res && typeof res === 'object') {
        payload = Object.assign(defaultProps, res)
      } else {
        return
      }
    } else if (typeof name === 'object' && name !== null) {
      payload = Object.assign(getBasePayload(name.name || 'pageview'), name)
    } else {
      payload = getBasePayload(name || 'pageview')
    }

    // Merge page-level dataLayer metadata with event-specific props
    var mergedProps = Object.assign({}, pageProps, props || {})
    if (isDebugMode) {
      mergedProps.debug = '1'
    }
    if (Object.keys(mergedProps).length > 0) {
      payload.p = mergedProps
    }

    // Console logging in Debug Mode
    if (isDebugMode && typeof console !== 'undefined' && console.log) {
      console.log('%c[Gravlytics Debug] ' + (payload.n || 'event'), 'color:#6366f1;font-weight:bold;', payload)
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

  // ── Scroll Depth Tracking (25%, 50%, 75%, 100%) ──
  var trackedMilestones = {}
  function checkScrollDepth() {
    var winHeight = w.innerHeight || d.documentElement.clientHeight || 0
    if (winHeight <= 0) return

    var doc = d.documentElement || {}
    var bod = d.body || {}
    var docHeight = Math.max(bod.scrollHeight || 0, doc.scrollHeight || 0, bod.offsetHeight || 0, doc.offsetHeight || 0, winHeight)
    var milestones = [25, 50, 75, 100]

    // Single-screen page: content completely visible without needing deep scroll
    if (docHeight <= winHeight + 60) {
      for (var f = 0; f < 4; f++) {
        var fm = milestones[f]
        if (!trackedMilestones[fm]) {
          trackedMilestones[fm] = true
          send('$scroll', { depth: String(fm), path: loc.pathname })
        }
      }
      return
    }

    var scrollTop = w.pageYOffset || doc.scrollTop || bod.scrollTop || 0
    var scrollPct = Math.round(((scrollTop + winHeight) / docHeight) * 100)
    if ((scrollTop + winHeight) >= (docHeight - 60) || scrollPct >= 95) {
      scrollPct = 100
    }

    for (var i = 0; i < 4; i++) {
      var m = milestones[i]
      if (scrollPct >= m && !trackedMilestones[m]) {
        trackedMilestones[m] = true
        send('$scroll', { depth: String(m), path: loc.pathname })
      }
    }
  }

  var scrollTimer = null
  on(w, 'scroll', function () {
    if (scrollTimer) return
    scrollTimer = setTimeout(function () {
      scrollTimer = null
      checkScrollDepth()
    }, 200)
  }, { passive: true })

  // Trigger on initial view and exit
  setTimeout(checkScrollDepth, 1500)
  on(d, 'visibilitychange', function () {
    if (d.visibilityState === 'hidden') checkScrollDepth()
  })

  // ── Click Heatmap Tracking ──
  var sessionClickCount = 0
  on(d, 'click', function (e) {
    if (sessionClickCount >= 30) return // limit per page view
    var target = e.target
    if (!target) return
    var winW = w.innerWidth || (d.documentElement ? d.documentElement.clientWidth : 1000)
    var winH = w.innerHeight || (d.documentElement ? d.documentElement.clientHeight : 1000)
    var x = Math.min(100, Math.max(0, Math.round((e.clientX / winW) * 100)))
    var y = Math.min(100, Math.max(0, Math.round((e.clientY / winH) * 100)))
    var tag = target.tagName ? target.tagName.toLowerCase() : 'element'
    var text = (target.innerText || target.value || target.alt || target.title || '').substring(0, 30).trim()
    sessionClickCount++
    send('$click', { x: String(x), y: String(y), tag: tag, text: text, path: loc.pathname })
  }, { passive: true })

  // ── JavaScript Error Tracking ──
  var errorEventsCount = 0
  function trackError(msg, file, line, col, stack) {
    if (errorEventsCount >= 10) return // avoid infinite error loops
    errorEventsCount++
    var cleanMsg = String(msg || 'Unknown Script Error').substring(0, 200)
    var cleanFile = String(file || loc.pathname).substring(0, 150)
    var cleanStack = String(stack || '').substring(0, 300)
    send('$error', {
      message: cleanMsg,
      filename: cleanFile,
      lineno: String(line || 0),
      colno: String(col || 0),
      stack: cleanStack,
      path: loc.pathname
    })
  }

  on(w, 'error', function (e) {
    if (e) trackError(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack)
  })

  on(w, 'unhandledrejection', function (e) {
    var r = (e && e.reason) || {}
    trackError(r.message || String(r), loc.pathname, 0, 0, r.stack)
  })

  // ── Site Search Tracking (Enhanced Measurement) ──
  function checkSiteSearch() {
    if (!enhancedMeasurement || !trackSearch) return
    try {
      var sp = new URLSearchParams(loc.search)
      var keys = ['q', 's', 'search', 'query', 'keyword']
      for (var i = 0; i < 5; i++) {
        var val = sp.get(keys[i])
        if (val && (val = val.trim())) {
          send('search', { search_term: val.substring(0, 100), search_param: keys[i], path: loc.pathname })
          break
        }
      }
    } catch (e) {}
  }

  // Track pageview
  function page() {
    trackedMilestones = {}
    sessionClickCount = 0
    send('pageview')
    checkSiteSearch()
  }

  // ── SPA support: intercept History API ──
  var pushState = history.pushState
  if (pushState) {
    history.pushState = function () {
      pushState.apply(history, arguments)
      if (autoTrack) page()
    }
  }
  on(w, 'popstate', function () {
    if (autoTrack) page()
  })

  // ── Enhanced Measurement: Outbound Link Clicks & File Downloads ──
  on(d, 'click', function (e) {
    if (!enhancedMeasurement) return
    var el = e.target
    while (el && el.tagName !== 'A' && el !== d.body) {
      el = el.parentElement
    }
    if (!el || el.tagName !== 'A' || !el.href) return

    var href = el.href
    var linkHost = el.hostname
    var linkText = (el.innerText || getAttr(el, 'aria-label') || el.title || '').trim().substring(0, 60)

    // 1. File Download
    if (trackDownloads && /\.(pdf|xlsx?|docx?|pptx?|txt|csv|zip|rar|mp[34]|mov)($|[?#])/i.test(href)) {
      var parts = href.split(/[?#]/)[0].split('/')
      var fName = parts.pop() || ''
      var ext = fName.split('.').pop().toLowerCase()
      send('file_download', { file_name: fName, file_extension: ext, url: href, text: linkText, path: loc.pathname })
      return
    }

    // 2. Outbound Link
    if (
      trackOutbound &&
      linkHost &&
      linkHost !== loc.hostname &&
      !/^javascript:|^mailto:|^tel:/i.test(href)
    ) {
      send('outbound_click', {
        url: href,
        domain: linkHost,
        text: linkText,
        target: el.target || '_self',
        path: loc.pathname
      })
    }
  }, { passive: true })

  // ── Enhanced Measurement: Form Submissions ──
  if (enhancedMeasurement && trackForms) {
    on(d, 'submit', function (e) {
      try {
        var form = e.target
        if (!form || form.tagName !== 'FORM') return
        var formId = form.id || getAttr(form, 'name') || 'unnamed_form'
        var formAction = form.action || loc.pathname
        var actionPath = formAction
        try { actionPath = new URL(formAction).pathname } catch (err) {}
        send('form_submit', {
          form_id: formId,
          form_name: getAttr(form, 'name') || '',
          form_destination: actionPath,
          path: loc.pathname
        })
      } catch (err) {}
    }, { capture: true })
  }

  // ── HTML Data Attribute Event Tracking ──
  on(d, 'click', function (e) {
    var target = e.target
    if (!target || !target.closest) return

    var el = target.closest(
      '[data-gravlytics-event],[data-umami-event],[data-event]'
    )
    if (!el) return

    var eventName =
      getAttr(el, 'data-gravlytics-event') ||
      getAttr(el, 'data-umami-event') ||
      getAttr(el, 'data-event')

    if (!eventName) return

    var props = {}
    var attrs = el.attributes
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i]
      var attrName = attr.name
      var propKey = null

      if (attrName.indexOf('data-gravlytics-event-') === 0) {
        propKey = attrName.substring(22)
      } else if (attrName.indexOf('data-umami-event-') === 0) {
        propKey = attrName.substring(17)
      } else if (attrName.indexOf('data-prop-') === 0) {
        propKey = attrName.substring(10)
      }

      if (propKey) {
        props[propKey] = attr.value
      }
    }

    send(eventName, props)
  }, true)

  // Helper for extracting GA4 ecommerce object
  function attachEcom(source, target) {
    var ec = source && source.ecommerce
    if (ec && typeof ec === 'object') {
      if (ec.value || ec.revenue) target.revenue = String(ec.value || ec.revenue)
      if (ec.transaction_id) target.order_id = String(ec.transaction_id)
      if (ec.currency) target.currency = String(ec.currency)
      if (Array.isArray(ec.items)) target.items_count = String(ec.items.length)
    }
  }

  // ── Google Analytics dataLayer & gtag Interception ──
  function handleDataLayerItem(item) {
    if (!item) return

    if (typeof item === 'object' && item !== null && item.event && typeof item.event === 'string') {
      if (!/^gtm\./.test(item.event)) {
        var props = extractProps(item)
        attachEcom(item, props)
        send(item.event, props)
      }
    } else if (typeof item === 'object' && item !== null && !Array.isArray(item) && !item.event) {
      Object.assign(pageProps, extractProps(item))
    } else if (
      (Array.isArray(item) || (typeof item === 'object' && '0' in item)) &&
      item[0] === 'event' &&
      typeof item[1] === 'string'
    ) {
      var evtProps = item[2] || {}
      var propsObj = typeof evtProps === 'object' ? extractProps(evtProps) : {}
      attachEcom(evtProps, propsObj)
      send(item[1], propsObj)
    } else if (
      (Array.isArray(item) || (typeof item === 'object' && '0' in item)) &&
      (item[0] === 'set' || item[0] === 'config')
    ) {
      var cfg = typeof item[1] === 'object' ? item[1] : (typeof item[2] === 'object' ? item[2] : null)
      if (cfg) {
        Object.assign(pageProps, extractProps(cfg))
      }
    }
  }

  w.dataLayer = w.dataLayer || []
  if (Array.isArray(w.dataLayer)) {
    for (var dlIdx = 0; dlIdx < w.dataLayer.length; dlIdx++) {
      handleDataLayerItem(w.dataLayer[dlIdx])
    }
  }

  var origPush = w.dataLayer.push
  w.dataLayer.push = function () {
    for (var a = 0; a < arguments.length; a++) {
      handleDataLayerItem(arguments[a])
    }
    return origPush ? origPush.apply(w.dataLayer, arguments) : arguments.length
  }

  if (typeof w.gtag !== 'function') {
    w.gtag = function () {
      w.dataLayer.push(arguments)
    }
  }

  // ── Core Web Vitals (LCP, CLS, INP, TTFB, FCP) Telemetry ──
  var vitals = { lcp: 0, cls: 0, inp: 0, ttfb: 0, fcp: 0 }
  var lastReportedVitals = { lcp: 0, cls: 0, inp: 0, ttfb: 0, fcp: 0 }

  function getVitalRating(m, v) {
    var lim = m === 'lcp' ? [2500, 4000] : m === 'cls' ? [0.1, 0.25] : m === 'inp' ? [200, 500] : m === 'fcp' ? [1800, 3000] : [800, 1800]
    return v <= lim[0] ? 'good' : v <= lim[1] ? 'needs-improvement' : 'poor'
  }

  function reportVitals(force) {
    try {
      if (performance.getEntriesByType) {
        var nav = performance.getEntriesByType('navigation')[0]
        if (nav && nav.responseStart) {
          vitals.ttfb = Math.round(nav.responseStart)
        }
        var paints = performance.getEntriesByType('paint')
        if (paints) {
          for (var i = 0; i < paints.length; i++) {
            if (paints[i].name === 'first-contentful-paint') {
              vitals.fcp = Math.round(paints[i].startTime)
            }
          }
        }
      }
    } catch (e) {}

    if (vitals.lcp > 0 || vitals.fcp > 0 || vitals.ttfb > 0) {
      var changed = (
        vitals.lcp !== lastReportedVitals.lcp ||
        vitals.cls !== lastReportedVitals.cls ||
        vitals.inp !== lastReportedVitals.inp ||
        vitals.ttfb !== lastReportedVitals.ttfb ||
        vitals.fcp !== lastReportedVitals.fcp
      )
      if (changed || force) {
        lastReportedVitals = { lcp: vitals.lcp, cls: vitals.cls, inp: vitals.inp, ttfb: vitals.ttfb, fcp: vitals.fcp }
        var vp = {}
        var vm = ['lcp', 'cls', 'inp', 'ttfb', 'fcp']
        for (var vi = 0; vi < 5; vi++) {
          var vk = vm[vi]
          vp[vk] = String(vk === 'cls' ? vitals.cls.toFixed(3) : vitals[vk])
          vp[vk + '_rating'] = getVitalRating(vk, vitals[vk])
        }
        send('vitals', vp)
      }
    }
  }

  if (typeof PerformanceObserver !== 'undefined') {
    var po = function (type, fn) {
      try {
        new PerformanceObserver(function (list) { fn(list.getEntries()) }).observe({ type: type, buffered: true })
      } catch (e) {}
    }
    po('largest-contentful-paint', function (entries) {
      var last = entries[entries.length - 1]
      if (last) vitals.lcp = Math.round(last.startTime)
    })
    po('layout-shift', function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].hadRecentInput) vitals.cls += entries[i].value
      }
    })
    po('first-input', function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var dur = Math.round(entries[i].duration || entries[i].processingEnd - entries[i].startTime || 0)
        if (dur > vitals.inp) vitals.inp = dur
      }
    })
  }

  // Auto-send initial vitals after load or 3.5s
  setTimeout(function () { reportVitals(false) }, 3500)
  on(w, 'load', function () {
    setTimeout(function () { reportVitals(false) }, 2000)
  })
  on(d, 'visibilitychange', function () {
    if (d.visibilityState === 'hidden') reportVitals(true)
  })
  on(w, 'pagehide', function () { reportVitals(true) })
  on(w, 'beforeunload', function () { reportVitals(true) })

  // ── Ad Viewability & Fill Rate (IAB: 50% for 1s+ & GPT Integration) ──
  var requestedAds = {}
  var filledAds = {}
  var viewedAds = {}
  var adTimers = {}

  // Google Publisher Tag (GPT / googletag) Auto-Integration
  try {
    if (typeof w !== 'undefined') {
      w.googletag = w.googletag || { cmd: [] }
      w.googletag.cmd.push(function () {
        try {
          var pubads = w.googletag.pubads()
          if (pubads && pubads.addEventListener) {
            var getSlotId = function (e) { return (e && e.slot && e.slot.getSlotElementId) ? e.slot.getSlotElementId() : 'gpt_slot' }
            pubads.addEventListener('slotRequested', function (e) {
              var id = getSlotId(e)
              requestedAds[id] = true
              send('ad_request', { slot_id: id, unit: (e.slot && e.slot.getAdUnitPath) ? e.slot.getAdUnitPath() : '' })
            })
            pubads.addEventListener('slotResponseReceived', function (e) {
              var id = getSlotId(e)
              send('ad_fill', { slot_id: id })
            })
            pubads.addEventListener('slotRenderEnded', function (e) {
              var id = getSlotId(e)
              if (!e.isEmpty) {
                filledAds[id] = true
                var sz = e.size ? (Array.isArray(e.size) ? e.size.join('x') : String(e.size)) : ''
                send('ad_impression', { slot_id: id, size: sz })
              } else {
                send('ad_empty', { slot_id: id })
              }
            })
            pubads.addEventListener('impressionViewable', function (e) {
              var id = getSlotId(e)
              viewedAds[id] = true
              send('ad_viewable', { slot_id: id, viewable: '1' })
            })
          }
        } catch (err) {}
      })
    }
  } catch (gptErr) {}

  function initAdObserver() {
    var observer = null
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i]
            var el = entry.target
            var slotId =
              getAttr(el, 'data-gravlytics-ad') ||
              getAttr(el, 'data-ad-slot') ||
              el.id ||
              'ad_slot'

            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              if (!viewedAds[slotId] && !adTimers[slotId]) {
                adTimers[slotId] = setTimeout(function () {
                  viewedAds[slotId] = true
                  delete adTimers[slotId]
                  send('ad_viewable', {
                    slot_id: slotId,
                    duration_ms: '1000',
                    viewable: '1'
                  })
                }, 1000)
              }
            } else {
              if (adTimers[slotId]) {
                clearTimeout(adTimers[slotId])
                delete adTimers[slotId]
              }
            }
          }
        },
        { threshold: [0.5] }
      )
    }

    function observeElement(el) {
      if (!el || el._gly_observed) return
      el._gly_observed = true

      var slotId =
        getAttr(el, 'data-gravlytics-ad') ||
        getAttr(el, 'data-ad-slot') ||
        el.id ||
        'ad_slot'

      // Send initial ad_request if not already sent by GPT
      if (!requestedAds[slotId]) {
        requestedAds[slotId] = true
        send('ad_request', { slot_id: slotId })
      }

      // Check for content/iframe to record fill + impression
      if (!filledAds[slotId]) {
        var hasContent = el.querySelector('iframe, img, ins, .ad-banner__core') || el.clientHeight > 20
        if (hasContent) {
          filledAds[slotId] = true
          send('ad_fill', { slot_id: slotId })
          send('ad_impression', { slot_id: slotId, filled: '1' })
        }
      }

      // Attach click tracking
      on(el, 'click', function () {
        send('ad_click', { slot_id: slotId })
      })

      if (observer) {
        observer.observe(el)
      }
    }

    function observeAdSlots() {
      var adElements = d.querySelectorAll(
        '[data-gravlytics-ad],[data-ad-slot],.ad-slot,.ad-banner,[id^="div-gpt-ad"],ins.adsbygoogle'
      )
      for (var j = 0; j < adElements.length; j++) {
        observeElement(adElements[j])
      }
    }

    if (d.readyState === 'loading') {
      on(d, 'DOMContentLoaded', observeAdSlots)
    } else {
      observeAdSlots()
    }

    // Dynamic DOM mutation watcher for client-side injected ads
    if (typeof MutationObserver !== 'undefined' && d.body) {
      var mutObs = new MutationObserver(function () {
        observeAdSlots()
      })
      mutObs.observe(d.body, { childList: true, subtree: true })
    }

    return {
      observe: function (el, slotId) {
        if (el) {
          if (slotId) el.setAttribute('data-gravlytics-ad', slotId)
          observeElement(el)
        }
      },
      request: function (slotId, props) {
        send('ad_request', Object.assign({ slot_id: slotId }, props || {}))
      },
      impression: function (slotId, props) {
        send('ad_impression', Object.assign({ slot_id: slotId, filled: '1' }, props || {}))
      },
      fill: function (slotId, props) {
        send('ad_fill', Object.assign({ slot_id: slotId, filled: '1' }, props || {}))
      },
      empty: function (slotId, props) {
        send('ad_empty', Object.assign({ slot_id: slotId, filled: '0' }, props || {}))
      },
      viewable: function (slotId, props) {
        send('ad_viewable', Object.assign({ slot_id: slotId, viewable: '1' }, props || {}))
      },
      click: function (slotId, props) {
        send('ad_click', Object.assign({ slot_id: slotId }, props || {}))
      }
    }
  }

  var adApi = initAdObserver()

  // ── E-commerce Tracking Helper ──
  var ecommerceApi = {
    purchase: function (order) {
      if (!order) return
      var props = {
        order_id: String(order.order_id || order.id || 'ord_' + Math.random().toString(36).substring(2, 9)),
        revenue: String(order.revenue || order.value || 0),
        currency: String(order.currency || 'USD').toUpperCase(),
        items_count: String(order.items_count || (order.items && order.items.length) || 1),
        tax: String(order.tax || 0),
        shipping: String(order.shipping || 0)
      }
      send('purchase', props)
    },
    addToCart: function (item) {
      if (!item) return
      send('add_to_cart', {
        item_id: String(item.id || item.item_id || ''),
        item_name: String(item.name || item.item_name || ''),
        price: String(item.price || 0),
        currency: String(item.currency || 'USD').toUpperCase()
      })
    }
  }

  // ── Public API (Universal Umami + Gravlytics + Ad API + E-commerce) ──
  var tracker = {
    track: function (name, props) {
      if (!name) {
        page()
      } else {
        send(name, props)
      }
    },
    identify: function (userId, props) {
      var p = props || {}
      if (userId) p.user_id = String(userId)
      send('identify', p)
    },
    debug: function (enable) {
      isDebugMode = enable !== false
      try {
        sessionStorage[isDebugMode ? 'setItem' : 'removeItem']('gravlytics_debug', 'true')
      } catch (err) {}
      return isDebugMode
    },
    page: page,
    ad: adApi,
    ecommerce: ecommerceApi
  }

  w.gravlytics = tracker
  w.umami = tracker

  // Initial pageview
  if (autoTrack) {
    page()
  }
})()
