package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gravlytics/collector/internal/enricher"
	"github.com/gravlytics/collector/internal/handler"
	"github.com/gravlytics/collector/internal/producer"
)

const defaultTrackerJS = `(function(){if(navigator.doNotTrack==="1"||navigator.globalPrivacyControl)return;if(navigator.webdriver||window._phantom||window.__nightmare||window.callPhantom||(navigator.userAgent&&/bot|crawler|spider|crawling|headless|scrape|slurp/i.test(navigator.userAgent)))return;var f=document.currentScript,h=f&&f.getAttribute("data-site-id");if(!h)return;var b=f.getAttribute("data-domains");if(b){var P=b.split(",").map(function(t){return t.trim()});if(P.indexOf(location.hostname)===-1)return}var p=f.getAttribute("data-auto-track")!=="false",O=(f.getAttribute("data-api")||f.src.replace(/\/[^/]*$/,""))+"/api/collect",x=Math.random().toString(36).substring(2)+Date.now().toString(36),T=window.screen?window.screen.width:0,recentEvents=[];function isRateLimited(){var n=Date.now();recentEvents=recentEvents.filter(function(t){return n-t<60000});var s=recentEvents.filter(function(t){return n-t<5000});if(s.length>=12||recentEvents.length>=60)return!0;recentEvents.push(n);return!1}function g(t){var e="";try{e=Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch(s){}var a=navigator.language||"",n={s:h,n:t||"pageview",u:location.pathname,h:location.hostname,r:document.referrer,w:T,t:x,tz:e,l:a};if(n.n==="pageview")try{var r=new URLSearchParams(location.search),o=r.get("utm_source"),i=r.get("utm_medium"),v=r.get("utm_campaign");if(o)n.us=o;if(i)n.um=i;if(v)n.uc=v}catch(s){}return n}var y={};function l(t){var e={};for(var a in t)if(Object.prototype.hasOwnProperty.call(t,a)&&a!=="event")e[a]=typeof t[a]==="object"?JSON.stringify(t[a]):String(t[a]);return e}function c(t,e){if(isRateLimited())return;var a;if(typeof t==="function"){var n=g("custom"),r=t(n);if(typeof r==="string")a=g(r);else if(r&&typeof r==="object")a=Object.assign(n,r);else return}else if(typeof t==="object"&&t!==null)a=Object.assign(g(t.name||"pageview"),t);else a=g(t||"pageview");var o=Object.assign({},y,e||{});if(Object.keys(o).length>0)a.p=o;var i=JSON.stringify(a);if(navigator.sendBeacon)navigator.sendBeacon(O,i);else fetch(O,{method:"POST",body:i,keepalive:!0,headers:{"Content-Type":"text/plain"}}).catch(function(){})}function u(){c("pageview")}var A=history.pushState;if(A)history.pushState=function(){if(A.apply(history,arguments),p)u()};window.addEventListener("popstate",function(){if(p)u()}),document.addEventListener("click",function(t){var e=t.target;if(!e||!e.closest)return;var a=e.closest("[data-gravlytics-event],[data-umami-event],[data-event]");if(!a)return;var n=a.getAttribute("data-gravlytics-event")||a.getAttribute("data-umami-event")||a.getAttribute("data-event");if(!n)return;var r={},o=a.attributes;for(var i=0;i<o.length;i++){var v=o[i],s=v.name,d=null;if(s.indexOf("data-gravlytics-event-")===0)d=s.substring(22);else if(s.indexOf("data-umami-event-")===0)d=s.substring(17);else if(s.indexOf("data-prop-")===0)d=s.substring(10);if(d)r[d]=v.value}c(n,r)},!0);function j(t){if(!t)return;if(typeof t==="object"&&t!==null&&t.event&&typeof t.event==="string"){if(!/^gtm\./.test(t.event)){var e=l(t);c(t.event,e)}}else if(typeof t==="object"&&t!==null&&!Array.isArray(t)&&!t.event){var a=l(t);Object.assign(y,a)}else if((Array.isArray(t)||typeof t==="object"&&("0"in t))&&t[0]==="event"&&typeof t[1]==="string"){var n=t[1],r=t[2]||{},o=typeof r==="object"?l(r):{};c(n,o)}else if((Array.isArray(t)||typeof t==="object"&&("0"in t))&&(t[0]==="set"||t[0]==="config")){var i=typeof t[1]==="object"?t[1]:typeof t[2]==="object"?t[2]:null;if(i)Object.assign(y,l(i))}}if(window.dataLayer=window.dataLayer||[],Array.isArray(window.dataLayer))for(var w=0;w<window.dataLayer.length;w++)j(window.dataLayer[w]);var L=window.dataLayer.push;if(window.dataLayer.push=function(){for(var t=0;t<arguments.length;t++)j(arguments[t]);return L?L.apply(window.dataLayer,arguments):arguments.length},typeof window.gtag!=="function")window.gtag=function(){window.dataLayer.push(arguments)};var vitals={lcp:0,cls:0,inp:0,ttfb:0,fcp:0},vitalsSent=!1;function getVR(t,e){return"lcp"===t?e<=2500?"good":e<=4000?"needs-improvement":"poor":"cls"===t?e<=.1?"good":e<=.25?"needs-improvement":"poor":"inp"===t?e<=200?"good":e<=500?"needs-improvement":"poor":"fcp"===t?e<=1800?"good":e<=3000?"needs-improvement":"poor":"ttfb"===t?e<=800?"good":e<=1800?"needs-improvement":"poor":"good"}function reportVitals(){if(!vitalsSent){vitalsSent=!0;try{if(performance.getEntriesByType){var t=performance.getEntriesByType("navigation")[0];t&&t.responseStart&&(vitals.ttfb=Math.round(t.responseStart));var e=performance.getEntriesByType("paint");if(e)for(var a=0;a<e.length;a++)"first-contentful-paint"===e[a].name&&(vitals.fcp=Math.round(e[a].startTime))}}catch(n){}(vitals.lcp>0||vitals.fcp>0||vitals.ttfb>0)&&c("vitals",{lcp:String(vitals.lcp),lcp_rating:getVR("lcp",vitals.lcp),cls:String(vitals.cls.toFixed(3)),cls_rating:getVR("cls",vitals.cls),inp:String(vitals.inp),inp_rating:getVR("inp",vitals.inp),ttfb:String(vitals.ttfb),ttfb_rating:getVR("ttfb",vitals.ttfb),fcp:String(vitals.fcp),fcp_rating:getVR("fcp",vitals.fcp)})}}if(typeof PerformanceObserver!=="undefined")try{new PerformanceObserver(function(t){var e=t.getEntries(),a=e[e.length-1];a&&(vitals.lcp=Math.round(a.startTime))}).observe({type:"largest-contentful-paint",buffered:!0}),new PerformanceObserver(function(t){for(var e=t.getEntries(),a=0;a<e.length;a++)e[a].hadRecentInput||(vitals.cls+=e[a].value)}).observe({type:"layout-shift",buffered:!0}),new PerformanceObserver(function(t){for(var e=t.getEntries(),a=0;a<e.length;a++){var n=Math.round(e[a].duration||e[a].processingEnd-e[a].startTime||0);n>vitals.inp&&(vitals.inp=n)}}).observe({type:"first-input",buffered:!0})}catch(err){}window.addEventListener("visibilitychange",function(){"hidden"===document.visibilityState&&reportVitals()}),window.addEventListener("pagehide",reportVitals);var viewedAds={},adTimers={};function initAd(){if(typeof IntersectionObserver==="undefined")return{observe:function(){},request:function(t,e){c("ad_request",Object.assign({slot_id:t},e||{}))},impression:function(t,e){c("ad_impression",Object.assign({slot_id:t,filled:"1"},e||{}))},fill:function(t,e){c("ad_fill",Object.assign({slot_id:t,filled:"1"},e||{}))},empty:function(t,e){c("ad_empty",Object.assign({slot_id:t,filled:"0"},e||{}))},viewable:function(t,e){c("ad_viewable",Object.assign({slot_id:t,viewable:"1"},e||{}))}};var t=new IntersectionObserver(function(t){for(var e=0;e<t.length;e++){var a=t[e],n=a.target,r=n.getAttribute("data-gravlytics-ad")||n.getAttribute("data-ad-slot")||n.id||"ad_slot";if(a.isIntersecting&&a.intersectionRatio>=.5){if(!viewedAds[r]&&!adTimers[r])adTimers[r]=setTimeout(function(){viewedAds[r]=!0,delete adTimers[r],c("ad_viewable",{slot_id:r,duration_ms:"1000",viewable:"1"})},1000)}else adTimers[r]&&(clearTimeout(adTimers[r]),delete adTimers[r])}},{threshold:[.5]});function e(){for(var e=document.querySelectorAll("[data-gravlytics-ad],[data-ad-slot],.ad-slot,[id^=\"div-gpt-ad\"]"),a=0;a<e.length;a++)t.observe(e[a])}"loading"===document.readyState?document.addEventListener("DOMContentLoaded",e):e();return{observe:function(e,a){e&&(a&&e.setAttribute("data-gravlytics-ad",a),t.observe(e))},request:function(t,e){c("ad_request",Object.assign({slot_id:t},e||{}))},impression:function(t,e){c("ad_impression",Object.assign({slot_id:t,filled:"1"},e||{}))},fill:function(t,e){c("ad_fill",Object.assign({slot_id:t,filled:"1"},e||{}))},empty:function(t,e){c("ad_empty",Object.assign({slot_id:t,filled:"0"},e||{}))},viewable:function(t,e){c("ad_viewable",Object.assign({slot_id:t,viewable:"1"},e||{}))}}}var adApi=initAd(),S={track:function(t,e){if(!t)u();else c(t,e)},identify:function(t,e){var a=e||{};if(t)a.user_id=String(t);c("identify",a)},page:u,ad:adApi};if(window.gravlytics=S,window.umami=S,p)u()})();`

func main() {
	loadEnv()

	// Structured logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Config from env
	port := envOr("COLLECTOR_PORT", "8081")
	brokers := strings.Split(envOr("REDPANDA_BROKERS", "localhost:19092"), ",")
	topic := envOr("REDPANDA_TOPIC_EVENTS", "events")

	// Initialize Redpanda producer
	prod, err := producer.New(brokers, topic)
	if err != nil {
		slog.Error("failed to create producer", "error", err)
		os.Exit(1)
	}
	defer prod.Close()

	// Initialize enricher (geo-IP + UA parser)
	geoDBPath := envOr("GEOIP_DB_PATH", "")
	enrich := enricher.New(geoDBPath)

	// HTTP handler
	h := handler.New(prod, enrich, logger)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/collect", h.Collect)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Serve tracker script for client websites
	serveTracker := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")

		diskPaths := []string{
			"../../apps/tracker/dist/gravlytics.min.js",
			"apps/tracker/dist/gravlytics.min.js",
			"../tracker/dist/gravlytics.min.js",
			"./dist/gravlytics.min.js",
		}
		for _, p := range diskPaths {
			if content, err := os.ReadFile(p); err == nil {
				w.Write(content)
				return
			}
		}
		w.Write([]byte(defaultTrackerJS))
	}
	mux.HandleFunc("GET /gravlytics.js", serveTracker)
	mux.HandleFunc("GET /gravlytics.min.js", serveTracker)

	// CORS middleware
	corsHandler := corsMiddleware(mux)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      corsHandler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	// Graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		slog.Info("shutting down collector...")
		cancel()
		shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutCancel()
		srv.Shutdown(shutCtx)
	}()

	slog.Info("collector started", "port", port, "brokers", brokers, "topic", topic)

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}

	_ = ctx // keep linter happy
	slog.Info("collector stopped")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadEnv() {
	paths := []string{".env", "../.env", "../../.env"}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					k := strings.TrimSpace(parts[0])
					v := strings.TrimSpace(parts[1])
					if os.Getenv(k) == "" {
						os.Setenv(k, v)
					}
				}
			}
			return
		}
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "86400")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func init() {
	_ = fmt.Sprintf // avoid unused import
}
