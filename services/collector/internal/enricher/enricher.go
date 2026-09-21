package enricher

import (
	"log/slog"
	"strings"
)

// GeoResult holds geo-IP lookup results
type GeoResult struct {
	Country string
	Region  string
	City    string
}

// UAResult holds parsed User-Agent data
type UAResult struct {
	DeviceType     string // desktop, mobile, tablet
	Browser        string
	BrowserVersion string
	OS             string
	OSVersion      string
}

// Enricher provides geo-IP and UA parsing
type Enricher struct {
	geoDBPath string
	// In production, this would hold a MaxMind reader
	// geoReader *maxminddb.Reader
}

// New creates a new Enricher
// If geoDBPath is empty, geo lookups return empty results
func New(geoDBPath string) *Enricher {
	e := &Enricher{
		geoDBPath: geoDBPath,
	}

	if geoDBPath != "" {
		slog.Info("geo-IP database configured", "path", geoDBPath)
		// TODO: Initialize MaxMind reader when GeoLite2 DB is available
		// reader, err := maxminddb.Open(geoDBPath)
	} else {
		slog.Warn("no geo-IP database configured, geo enrichment disabled")
	}

	return e
}

// GeoLookup performs a geo-IP lookup
// Returns empty result if no GeoLite2 DB is configured
func (e *Enricher) GeoLookup(ip string) GeoResult {
	if e.geoDBPath == "" {
		return GeoResult{}
	}

	// TODO: Implement MaxMind lookup
	// For now, return empty result
	return GeoResult{}
}

// ParseUA parses a User-Agent string into device/browser/OS info
func (e *Enricher) ParseUA(ua string) UAResult {
	if ua == "" {
		return UAResult{}
	}

	result := UAResult{
		DeviceType: detectDeviceType(ua),
	}

	// Browser detection
	result.Browser, result.BrowserVersion = detectBrowser(ua)

	// OS detection
	result.OS, result.OSVersion = detectOS(ua)

	return result
}

// detectDeviceType classifies the device from UA string
func detectDeviceType(ua string) string {
	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "mobile") || strings.Contains(lower, "android") && !strings.Contains(lower, "tablet"):
		return "mobile"
	case strings.Contains(lower, "tablet") || strings.Contains(lower, "ipad"):
		return "tablet"
	default:
		return "desktop"
	}
}

// detectBrowser extracts browser name and version
func detectBrowser(ua string) (string, string) {
	// Order matters — check specific browsers before generic ones
	browsers := []struct {
		name    string
		token   string
	}{
		{"Edge", "Edg/"},
		{"Chrome", "Chrome/"},
		{"Firefox", "Firefox/"},
		{"Safari", "Safari/"},
		{"Opera", "OPR/"},
	}

	for _, b := range browsers {
		if idx := strings.Index(ua, b.token); idx != -1 {
			version := extractVersion(ua[idx+len(b.token):])
			return b.name, version
		}
	}

	return "Other", ""
}

// detectOS extracts OS name and version
func detectOS(ua string) (string, string) {
	lower := strings.ToLower(ua)

	switch {
	case strings.Contains(lower, "windows"):
		return "Windows", extractOSVersion(ua, "Windows NT ")
	case strings.Contains(lower, "mac os x"):
		return "macOS", extractOSVersion(ua, "Mac OS X ")
	case strings.Contains(lower, "android"):
		return "Android", extractOSVersion(ua, "Android ")
	case strings.Contains(lower, "iphone") || strings.Contains(lower, "ipad"):
		return "iOS", extractOSVersion(ua, "OS ")
	case strings.Contains(lower, "linux"):
		return "Linux", ""
	case strings.Contains(lower, "chromeos"):
		return "ChromeOS", ""
	default:
		return "Other", ""
	}
}

// extractVersion gets the version number after a token
func extractVersion(s string) string {
	var version strings.Builder
	for _, c := range s {
		if (c >= '0' && c <= '9') || c == '.' {
			version.WriteRune(c)
		} else {
			break
		}
	}
	return version.String()
}

// extractOSVersion extracts version after a prefix token
func extractOSVersion(ua, prefix string) string {
	idx := strings.Index(ua, prefix)
	if idx == -1 {
		return ""
	}
	rest := ua[idx+len(prefix):]
	var version strings.Builder
	for _, c := range rest {
		if (c >= '0' && c <= '9') || c == '.' || c == '_' {
			version.WriteRune(c)
		} else {
			break
		}
	}
	return strings.ReplaceAll(version.String(), "_", ".")
}
