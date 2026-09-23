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

  // Respect Do Not Track / Global Privacy Control
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return

  // Anti-Bot: Drop automated browsers, headless environments & scrapers before any network calls
  if (
    navigator.webdriver ||
    window._phantom ||
    window.__nightmare ||
    window.callPhantom ||
    (navigator.userAgent && /bot|crawler|spider|crawling|headless|scrape|slurp/i.test(navigator.userAgent))
  ) {
    return
  }

  var script = document.currentScript
  var siteId = script && script.getAttribute('data-site-id')
  if (!siteId) return

  // Optional domain filter (e.g. data-domains="example.com,app.example.com")
  var domains = script.getAttribute('data-domains')
  if (domains) {
    var domainList = domains.split(',').map(function (d) { return d.trim() })
    if (domainList.indexOf(location.hostname) === -1) return
  }

  var autoTrack = script.getAttribute('data-auto-track') !== 'false'

  var endpoint =
    (script.getAttribute('data-api') || script.src.replace(/\/[^/]*$/, '')) +
    '/api/collect'

  // Unique tab ID for session tracking (no cookies, memory only)
  var tabId =
    Math.random().toString(36).substring(2) + Date.now().toString(36)

  // Screen width
  var sw = window.screen ? window.screen.width : 0

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

  // Helper to build base payload
  function getBasePayload(name) {
    var tz = ''
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch (e) {}
    var lang = navigator.language || ''

    var payload = {
      s: siteId,            // site_id
      n: name || 'pageview',// event_name
      u: location.pathname, // url_path
      h: location.hostname, // hostname
      r: document.referrer, // referrer
      w: sw,                // screen_width
      t: tabId,             // tab session identifier
      tz: tz,               // timezone e.g. Asia/Jakarta
      l: lang,              // locale e.g. id-ID
    }

    // UTM params on pageviews
    if (payload.n === 'pageview') {
      try {
        var params = new URLSearchParams(location.search)
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
    if (Object.keys(mergedProps).length > 0) {
      payload.p = mergedProps
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
    var winHeight = window.innerHeight || document.documentElement.clientHeight || 0
    var docHeight = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0,
      winHeight
    )
    if (docHeight <= winHeight + 50) return // page fits in one screen

    var scrollTop = window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0) || 0
    var scrollPct = Math.round(((scrollTop + winHeight) / docHeight) * 100)

    var milestones = [25, 50, 75, 100]
    for (var i = 0; i < milestones.length; i++) {
      var m = milestones[i]
      if (scrollPct >= m && !trackedMilestones[m]) {
        trackedMilestones[m] = true
        send('$scroll', { depth: String(m), path: location.pathname })
      }
    }
  }

  var scrollTimer = null
  window.addEventListener('scroll', function () {
    if (scrollTimer) return
    scrollTimer = setTimeout(function () {
      scrollTimer = null
      checkScrollDepth()
    }, 250)
  }, { passive: true })

  // ── Click Heatmap Tracking ──
  var sessionClickCount = 0
  document.addEventListener('click', function (e) {
    if (sessionClickCount >= 30) return // limit per page view
    var target = e.target
    if (!target) return
    var winW = window.innerWidth || (document.documentElement ? document.documentElement.clientWidth : 1000)
    var winH = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 1000)
    var x = Math.min(100, Math.max(0, Math.round((e.clientX / winW) * 100)))
    var y = Math.min(100, Math.max(0, Math.round((e.clientY / winH) * 100)))
    var tag = target.tagName ? target.tagName.toLowerCase() : 'element'
    var text = (target.innerText || target.value || target.alt || target.title || '').substring(0, 30).trim()
    sessionClickCount++
    send('$click', { x: String(x), y: String(y), tag: tag, text: text, path: location.pathname })
  }, { passive: true })

  // ── JavaScript Error Tracking ──
  var errorEventsCount = 0
  function trackError(msg, file, line, col, stack) {
    if (errorEventsCount >= 10) return // avoid infinite error loops
    errorEventsCount++
    var cleanMsg = String(msg || 'Unknown Script Error').substring(0, 200)
    var cleanFile = String(file || location.pathname).substring(0, 150)
    var cleanStack = String(stack || '').substring(0, 300)
    send('$error', {
      message: cleanMsg,
      filename: cleanFile,
      lineno: String(line || 0),
      colno: String(col || 0),
      stack: cleanStack,
      path: location.pathname
    })
  }

  window.addEventListener('error', function (e) {
    if (!e) return
    trackError(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack)
  })

  window.addEventListener('unhandledrejection', function (e) {
    if (!e) return
    var reason = e.reason || {}
    trackError(reason.message || String(reason), location.pathname, 0, 0, reason.stack)
  })

  // Track pageview
  function page() {
    trackedMilestones = {}
    sessionClickCount = 0
    send('pageview')
  }

  // ── SPA support: intercept History API ──
  var pushState = history.pushState
  if (pushState) {
    history.pushState = function () {
      pushState.apply(history, arguments)
      if (autoTrack) page()
    }
  }
  window.addEventListener('popstate', function () {
    if (autoTrack) page()
  })

  // ── HTML Data Attribute Event Tracking ──
  document.addEventListener(
    'click',
    function (e) {
      var target = e.target
      if (!target || !target.closest) return

      var el = target.closest(
        '[data-gravlytics-event],[data-umami-event],[data-event]'
      )
      if (!el) return

      var eventName =
        el.getAttribute('data-gravlytics-event') ||
        el.getAttribute('data-umami-event') ||
        el.getAttribute('data-event')

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
    },
    true
  )

  // ── Google Analytics dataLayer & gtag Interception ──
  function handleDataLayerItem(item) {
    if (!item) return

    if (typeof item === 'object' && item !== null && item.event && typeof item.event === 'string') {
      if (!/^gtm\./.test(item.event)) {
        var props = extractProps(item)
        if (item.ecommerce && typeof item.ecommerce === 'object') {
          if (item.ecommerce.value || item.ecommerce.revenue) props.revenue = String(item.ecommerce.value || item.ecommerce.revenue)
          if (item.ecommerce.transaction_id) props.order_id = String(item.ecommerce.transaction_id)
          if (item.ecommerce.currency) props.currency = String(item.ecommerce.currency)
          if (Array.isArray(item.ecommerce.items)) props.items_count = String(item.ecommerce.items.length)
        }
        send(item.event, props)
      }
    } else if (typeof item === 'object' && item !== null && !Array.isArray(item) && !item.event) {
      var extracted = extractProps(item)
      Object.assign(pageProps, extracted)
    } else if (
      (Array.isArray(item) || (typeof item === 'object' && '0' in item)) &&
      item[0] === 'event' &&
      typeof item[1] === 'string'
    ) {
      var evtName = item[1]
      var evtProps = item[2] || {}
      var propsObj = typeof evtProps === 'object' ? extractProps(evtProps) : {}
      if (evtProps.ecommerce && typeof evtProps.ecommerce === 'object') {
        if (evtProps.ecommerce.value || evtProps.ecommerce.revenue) propsObj.revenue = String(evtProps.ecommerce.value || evtProps.ecommerce.revenue)
        if (evtProps.ecommerce.transaction_id) propsObj.order_id = String(evtProps.ecommerce.transaction_id)
        if (evtProps.ecommerce.currency) propsObj.currency = String(evtProps.ecommerce.currency)
      }
      send(evtName, propsObj)
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

  window.dataLayer = window.dataLayer || []
  if (Array.isArray(window.dataLayer)) {
    for (var d = 0; d < window.dataLayer.length; d++) {
      handleDataLayerItem(window.dataLayer[d])
    }
  }

  var origPush = window.dataLayer.push
  window.dataLayer.push = function () {
    for (var a = 0; a < arguments.length; a++) {
      handleDataLayerItem(arguments[a])
    }
    return origPush ? origPush.apply(window.dataLayer, arguments) : arguments.length
  }

  if (typeof window.gtag !== 'function') {
    window.gtag = function () {
      window.dataLayer.push(arguments)
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
        send('vitals', {
          lcp: String(vitals.lcp),
          lcp_rating: getVitalRating('lcp', vitals.lcp),
          cls: String(vitals.cls.toFixed(3)),
          cls_rating: getVitalRating('cls', vitals.cls),
          inp: String(vitals.inp),
          inp_rating: getVitalRating('inp', vitals.inp),
          ttfb: String(vitals.ttfb),
          ttfb_rating: getVitalRating('ttfb', vitals.ttfb),
          fcp: String(vitals.fcp),
          fcp_rating: getVitalRating('fcp', vitals.fcp)
        })
      }
    }
  }

  if (typeof PerformanceObserver !== 'undefined') {
    try {
      var lcpObserver = new PerformanceObserver(function (entryList) {
        var entries = entryList.getEntries()
        var lastEntry = entries[entries.length - 1]
        if (lastEntry) vitals.lcp = Math.round(lastEntry.startTime)
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

      var clsObserver = new PerformanceObserver(function (entryList) {
        var entries = entryList.getEntries()
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].hadRecentInput) {
            vitals.cls += entries[i].value
          }
        }
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })

      var inpObserver = new PerformanceObserver(function (entryList) {
        var entries = entryList.getEntries()
        for (var i = 0; i < entries.length; i++) {
          var dur = Math.round(entries[i].duration || entries[i].processingEnd - entries[i].startTime || 0)
          if (dur > vitals.inp) vitals.inp = dur
        }
      })
      inpObserver.observe({ type: 'first-input', buffered: true })
    } catch (e) {}
  }

  // Auto-send initial vitals after load or 3.5s
  setTimeout(function () { reportVitals(false) }, 3500)
  if (window.addEventListener) {
    window.addEventListener('load', function () {
      setTimeout(function () { reportVitals(false) }, 2000)
    })
    window.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') reportVitals(true)
    })
    window.addEventListener('pagehide', function () { reportVitals(true) })
    window.addEventListener('beforeunload', function () { reportVitals(true) })
  }

  // ── Ad Viewability & Fill Rate (IAB: 50% for 1s+ & GPT Integration) ──
  var requestedAds = {}
  var filledAds = {}
  var viewedAds = {}
  var adTimers = {}

  // Google Publisher Tag (GPT / googletag) Auto-Integration
  try {
    if (typeof window !== 'undefined') {
      window.googletag = window.googletag || { cmd: [] }
      window.googletag.cmd.push(function () {
        try {
          var pubads = window.googletag.pubads()
          if (pubads && pubads.addEventListener) {
            pubads.addEventListener('slotRequested', function (e) {
              var id = (e.slot && e.slot.getSlotElementId) ? e.slot.getSlotElementId() : 'gpt_slot'
              requestedAds[id] = true
              send('ad_request', { slot_id: id, unit: (e.slot && e.slot.getAdUnitPath) ? e.slot.getAdUnitPath() : '' })
            })
            pubads.addEventListener('slotResponseReceived', function (e) {
              var id = (e.slot && e.slot.getSlotElementId) ? e.slot.getSlotElementId() : 'gpt_slot'
              send('ad_fill', { slot_id: id })
            })
            pubads.addEventListener('slotRenderEnded', function (e) {
              var id = (e.slot && e.slot.getSlotElementId) ? e.slot.getSlotElementId() : 'gpt_slot'
              if (!e.isEmpty) {
                filledAds[id] = true
                var sz = e.size ? (Array.isArray(e.size) ? e.size.join('x') : String(e.size)) : ''
                send('ad_impression', { slot_id: id, size: sz })
              } else {
                send('ad_empty', { slot_id: id })
              }
            })
            pubads.addEventListener('impressionViewable', function (e) {
              var id = (e.slot && e.slot.getSlotElementId) ? e.slot.getSlotElementId() : 'gpt_slot'
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
              el.getAttribute('data-gravlytics-ad') ||
              el.getAttribute('data-ad-slot') ||
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
        el.getAttribute('data-gravlytics-ad') ||
        el.getAttribute('data-ad-slot') ||
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
      el.addEventListener('click', function () {
        send('ad_click', { slot_id: slotId })
      })

      if (observer) {
        observer.observe(el)
      }
    }

    function observeAdSlots() {
      var adElements = document.querySelectorAll(
        '[data-gravlytics-ad],[data-ad-slot],.ad-slot,.ad-banner,[id^="div-gpt-ad"],ins.adsbygoogle'
      )
      for (var j = 0; j < adElements.length; j++) {
        observeElement(adElements[j])
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeAdSlots)
    } else {
      observeAdSlots()
    }

    // Dynamic DOM mutation watcher for client-side injected ads
    if (typeof MutationObserver !== 'undefined' && document.body) {
      var mutObs = new MutationObserver(function () {
        observeAdSlots()
      })
      mutObs.observe(document.body, { childList: true, subtree: true })
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
    page: page,
    ad: adApi,
    ecommerce: ecommerceApi
  }

  window.gravlytics = tracker
  window.umami = tracker

  // Initial pageview
  if (autoTrack) {
    page()
  }
})()
