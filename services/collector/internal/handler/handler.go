package handler

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gravlytics/collector/internal/enricher"
	"github.com/gravlytics/collector/internal/producer"
)

// TrackerPayload matches the minified keys from gravlytics.js
type TrackerPayload struct {
	SiteID      string            `json:"s"`  // site tracking ID
	EventName   string            `json:"n"`  // event name
	URLPath     string            `json:"u"`  // url path
	Hostname    string            `json:"h"`  // hostname
	Referrer    string            `json:"r"`  // document.referrer
	ScreenWidth int               `json:"w"`  // screen width
	TabID       string            `json:"t"`  // tab session ID
	UTMSource   string            `json:"us"` // utm_source
	UTMMedium   string            `json:"um"` // utm_medium
	UTMCampaign string            `json:"uc"` // utm_campaign
	Props       map[string]string `json:"p"`  // custom properties
}

// Event is the enriched event sent to Redpanda
type Event struct {
	SiteID         string            `json:"site_id"`
	EventID        string            `json:"event_id"`
	Timestamp      string            `json:"timestamp"`
	EventName      string            `json:"event_name"`
	VisitorID      uint64            `json:"visitor_id"`
	SessionID      uint64            `json:"session_id"`
	Hostname       string            `json:"hostname"`
	URLPath        string            `json:"url_path"`
	ReferrerDomain string            `json:"referrer_domain"`
	ReferrerPath   string            `json:"referrer_path"`
	UTMSource      string            `json:"utm_source"`
	UTMMedium      string            `json:"utm_medium"`
	UTMCampaign    string            `json:"utm_campaign"`
	Country        string            `json:"country"`
	Region         string            `json:"region"`
	City           string            `json:"city"`
	DeviceType     string            `json:"device_type"`
	Browser        string            `json:"browser"`
	BrowserVersion string            `json:"browser_version"`
	OS             string            `json:"os"`
	OSVersion      string            `json:"os_version"`
	ScreenWidth    int               `json:"screen_width"`
	Props          map[string]string `json:"props"`
}

type Handler struct {
	producer *producer.Producer
	enricher *enricher.Enricher
	logger   *slog.Logger
}

func New(prod *producer.Producer, enrich *enricher.Enricher, logger *slog.Logger) *Handler {
	return &Handler{
		producer: prod,
		enricher: enrich,
		logger:   logger,
	}
}

func (h *Handler) Collect(w http.ResponseWriter, r *http.Request) {
	// Read body
	var payload TrackerPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		h.logger.Warn("invalid payload", "error", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate required fields
	if payload.SiteID == "" || payload.EventName == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Generate event ID (UUID v4)
	eventID := uuid.New().String()

	// Get client IP (for geo enrichment only — never stored)
	clientIP := extractIP(r)

	// Get User-Agent
	userAgent := r.Header.Get("User-Agent")

	// Generate visitor_id: daily hash of salt + IP + UA (cookieless)
	// Uses today's date as part of the salt so IDs rotate daily
	today := time.Now().UTC().Format("2006-01-02")
	visitorID := hashVisitor(payload.SiteID, clientIP, userAgent, today)

	// Session ID: hash of visitor + tab ID
	sessionID := hashSession(visitorID, payload.TabID)

	// Enrich: geo + UA parsing
	geo := h.enricher.GeoLookup(clientIP)
	ua := h.enricher.ParseUA(userAgent)

	// Parse referrer
	refDomain, refPath := parseReferrer(payload.Referrer)

	// Build enriched event
	event := Event{
		SiteID:         payload.SiteID,
		EventID:        eventID,
		Timestamp:      time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		EventName:      payload.EventName,
		VisitorID:      visitorID,
		SessionID:      sessionID,
		Hostname:       payload.Hostname,
		URLPath:        payload.URLPath,
		ReferrerDomain: refDomain,
		ReferrerPath:   refPath,
		UTMSource:      payload.UTMSource,
		UTMMedium:      payload.UTMMedium,
		UTMCampaign:    payload.UTMCampaign,
		Country:        geo.Country,
		Region:         geo.Region,
		City:           geo.City,
		DeviceType:     ua.DeviceType,
		Browser:        ua.Browser,
		BrowserVersion: ua.BrowserVersion,
		OS:             ua.OS,
		OSVersion:      ua.OSVersion,
		ScreenWidth:    payload.ScreenWidth,
		Props:          payload.Props,
	}

	// Serialize and produce to Redpanda
	data, err := json.Marshal(event)
	if err != nil {
		h.logger.Error("failed to marshal event", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := h.producer.Send(r.Context(), payload.SiteID, data); err != nil {
		h.logger.Error("failed to produce event", "error", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Return 202 Accepted (event queued)
	w.WriteHeader(http.StatusAccepted)
}

// hashVisitor creates a daily-rotating visitor ID from site+IP+UA+date
func hashVisitor(siteID, ip, ua, date string) uint64 {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s:%s:%s:%s", siteID, ip, ua, date)))
	return binary.BigEndian.Uint64(h[:8])
}

// hashSession creates a session ID from visitor+tab
func hashSession(visitorID uint64, tabID string) uint64 {
	h := sha256.Sum256([]byte(fmt.Sprintf("%d:%s", visitorID, tabID)))
	return binary.BigEndian.Uint64(h[:8])
}

// extractIP gets the real client IP from headers
func extractIP(r *http.Request) string {
	// Check common proxy headers
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take the first IP (client)
		if idx := strings.Index(xff, ","); idx != -1 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	// Fallback to RemoteAddr
	addr := r.RemoteAddr
	if idx := strings.LastIndex(addr, ":"); idx != -1 {
		return addr[:idx]
	}
	return addr
}

// parseReferrer splits a referrer URL into domain and path
func parseReferrer(ref string) (domain, path string) {
	if ref == "" {
		return "", ""
	}
	// Remove protocol
	r := ref
	if idx := strings.Index(r, "://"); idx != -1 {
		r = r[idx+3:]
	}
	// Split domain/path
	if idx := strings.Index(r, "/"); idx != -1 {
		return r[:idx], r[idx:]
	}
	return r, "/"
}
