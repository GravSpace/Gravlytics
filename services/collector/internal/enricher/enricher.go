package enricher

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
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
	ipCache   sync.Map
	client    *http.Client
}

// New creates a new Enricher
func New(geoDBPath string) *Enricher {
	e := &Enricher{
		geoDBPath: geoDBPath,
		client: &http.Client{
			Timeout: 1500 * time.Millisecond,
		},
	}

	if geoDBPath != "" {
		slog.Info("geo-IP database configured", "path", geoDBPath)
	}

	return e
}

// GeoLookup performs geo detection from proxy headers, client timezone, locale, and IP
func (e *Enricher) GeoLookup(ip, countryHeader, regionHeader, cityHeader, acceptLang, tz, locale string) GeoResult {
	res := GeoResult{}

	// 1. Direct proxy/CDN headers (Cloudflare, Vercel, CloudFront, Nginx)
	if ch := strings.TrimSpace(countryHeader); ch != "" && ch != "XX" && ch != "T1" {
		res.Country = strings.ToUpper(ch)
	}

	if rh := strings.TrimSpace(regionHeader); rh != "" {
		if unescaped, err := url.QueryUnescape(rh); err == nil {
			rh = unescaped
		}
		res.Region = normalizeRegion(res.Country, rh)
	}

	if ct := strings.TrimSpace(cityHeader); ct != "" {
		if unescaped, err := url.QueryUnescape(ct); err == nil {
			ct = unescaped
		}
		res.City = ct
	}

	// 2. Client Timezone resolution (Fast, privacy-safe, highly reliable)
	if tz = strings.TrimSpace(tz); tz != "" {
		if geo, ok := timezoneGeoMap[tz]; ok {
			if res.Country == "" {
				res.Country = geo.Country
			}
			if res.City == "" {
				res.City = geo.City
			}
			if res.Region == "" {
				res.Region = geo.Region
			}
		} else {
			// Fallback: extract continent/city prefix if possible
			parts := strings.Split(tz, "/")
			if len(parts) >= 2 {
				cityName := strings.ReplaceAll(parts[len(parts)-1], "_", " ")
				if res.City == "" {
					res.City = cityName
				}
			}
		}
	}

	// 3. Fallback to Accept-Language or Locale parsing if country still unknown
	if res.Country == "" {
		res.Country = parseCountryFromLang(locale, acceptLang)
	}

	// 4. IP Geolocation fallback for public IPs if City or Region still missing
	if (res.Country == "" || res.City == "") && isPublicIP(ip) {
		if cached, ok := e.ipCache.Load(ip); ok {
			if geo, ok := cached.(GeoResult); ok {
				if res.Country == "" {
					res.Country = geo.Country
				}
				if res.Region == "" {
					res.Region = geo.Region
				}
				if res.City == "" {
					res.City = geo.City
				}
			}
		} else {
			// Query external lightweight IP API
			if geo, err := e.lookupPublicIP(ip); err == nil && geo.Country != "" {
				e.ipCache.Store(ip, geo)
				if res.Country == "" {
					res.Country = geo.Country
				}
				if res.Region == "" {
					res.Region = geo.Region
				}
				if res.City == "" {
					res.City = geo.City
				}
			}
		}
	}

	// Final normalization for region if region code was set
	if res.Region != "" && res.Country != "" {
		res.Region = normalizeRegion(res.Country, res.Region)
	}

	return res
}

func isPublicIP(ipStr string) bool {
	parsed := net.ParseIP(strings.TrimSpace(ipStr))
	if parsed == nil {
		return false
	}
	if parsed.IsLoopback() || parsed.IsPrivate() || parsed.IsLinkLocalUnicast() || parsed.IsUnspecified() {
		return false
	}
	return true
}

func (e *Enricher) lookupPublicIP(ip string) (GeoResult, error) {
	reqURL := "http://ip-api.com/json/" + url.PathEscape(ip) + "?fields=status,countryCode,regionName,city"
	resp, err := e.client.Get(reqURL)
	if err != nil {
		return GeoResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return GeoResult{}, nil
	}

	var data struct {
		Status      string `json:"status"`
		CountryCode string `json:"countryCode"`
		RegionName  string `json:"regionName"`
		City        string `json:"city"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil || data.Status != "success" {
		return GeoResult{}, err
	}

	return GeoResult{
		Country: data.CountryCode,
		Region:  data.RegionName,
		City:    data.City,
	}, nil
}

func normalizeRegion(country, region string) string {
	region = strings.TrimSpace(region)
	if region == "" {
		return ""
	}
	key := strings.ToUpper(country) + "-" + strings.ToUpper(region)
	if name, ok := subdivisionMap[key]; ok {
		return name
	}
	// Also check raw region code without country prefix
	if name, ok := subdivisionMap[strings.ToUpper(region)]; ok {
		return name
	}
	return region
}

var subdivisionMap = map[string]string{
	// Indonesia (ISO 3166-2:ID)
	"ID-JK": "DKI Jakarta", "ID-31": "DKI Jakarta", "JK": "DKI Jakarta",
	"ID-JB": "Jawa Barat", "ID-32": "Jawa Barat", "JB": "Jawa Barat",
	"ID-JT": "Jawa Tengah", "ID-33": "Jawa Tengah", "JT": "Jawa Tengah",
	"ID-JI": "Jawa Timur", "ID-35": "Jawa Timur", "JI": "Jawa Timur",
	"ID-YO": "DI Yogyakarta", "ID-34": "DI Yogyakarta", "YO": "DI Yogyakarta",
	"ID-BT": "Banten", "ID-36": "Banten", "BT": "Banten",
	"ID-BA": "Bali", "ID-51": "Bali", "BA": "Bali",
	"ID-SU": "Sumatera Utara", "ID-12": "Sumatera Utara", "SU": "Sumatera Utara",
	"ID-SB": "Sumatera Barat", "ID-13": "Sumatera Barat", "SB": "Sumatera Barat",
	"ID-RI": "Riau", "ID-14": "Riau", "RI": "Riau",
	"ID-SS": "Sumatera Selatan", "ID-16": "Sumatera Selatan", "SS": "Sumatera Selatan",
	"ID-SN": "Sulawesi Selatan", "ID-73": "Sulawesi Selatan", "SN": "Sulawesi Selatan",
	"ID-SA": "Sulawesi Utara", "ID-71": "Sulawesi Utara", "SA": "Sulawesi Utara",
	"ID-KB": "Kalimantan Barat", "ID-61": "Kalimantan Barat", "KB": "Kalimantan Barat",
	"ID-KT": "Kalimantan Timur", "ID-64": "Kalimantan Timur", "KT": "Kalimantan Timur",
	"ID-KS": "Kalimantan Selatan", "ID-63": "Kalimantan Selatan", "KS": "Kalimantan Selatan",
	"ID-PA": "Papua", "ID-91": "Papua", "PA": "Papua",
	"ID-AC": "Aceh", "ID-11": "Aceh", "AC": "Aceh",

	// USA (ISO 3166-2:US)
	"US-CA": "California", "US-NY": "New York", "US-TX": "Texas", "US-FL": "Florida",
	"US-WA": "Washington", "US-IL": "Illinois", "US-MA": "Massachusetts", "US-CO": "Colorado",
	"US-VA": "Virginia", "US-NC": "North Carolina", "US-NJ": "New Jersey",

	// UK
	"GB-ENG": "England", "GB-SCT": "Scotland", "GB-WLS": "Wales",

	// Canada
	"CA-ON": "Ontario", "CA-BC": "British Columbia", "CA-QC": "Quebec",

	// Australia
	"AU-NSW": "New South Wales", "AU-VIC": "Victoria", "AU-QLD": "Queensland", "AU-WA": "Western Australia",

	// Japan
	"JP-13": "Tokyo", "JP-27": "Osaka", "JP-14": "Kanagawa", "JP-23": "Aichi",

	// Germany
	"DE-BE": "Berlin", "DE-BY": "Bavaria", "DE-NW": "North Rhine-Westphalia", "DE-HE": "Hesse",
}

// timezoneGeoMap provides fast, local mapping for common global timezones
var timezoneGeoMap = map[string]GeoResult{
	// Indonesia
	"Asia/Jakarta":   {Country: "ID", Region: "DKI Jakarta", City: "Jakarta"},
	"Asia/Makassar":  {Country: "ID", Region: "Sulawesi Selatan", City: "Makassar"},
	"Asia/Jayapura":  {Country: "ID", Region: "Papua", City: "Jayapura"},
	"Asia/Pontianak": {Country: "ID", Region: "Kalimantan Barat", City: "Pontianak"},

	// Southeast Asia
	"Asia/Singapore":    {Country: "SG", Region: "Singapore", City: "Singapore"},
	"Asia/Kuala_Lumpur": {Country: "MY", Region: "Kuala Lumpur", City: "Kuala Lumpur"},
	"Asia/Bangkok":      {Country: "TH", Region: "Bangkok", City: "Bangkok"},
	"Asia/Manila":       {Country: "PH", Region: "Metro Manila", City: "Manila"},
	"Asia/Ho_Chi_Minh":  {Country: "VN", Region: "Ho Chi Minh", City: "Ho Chi Minh City"},

	// East Asia
	"Asia/Tokyo":     {Country: "JP", Region: "Tokyo", City: "Tokyo"},
	"Asia/Seoul":     {Country: "KR", Region: "Seoul", City: "Seoul"},
	"Asia/Shanghai":  {Country: "CN", Region: "Shanghai", City: "Shanghai"},
	"Asia/Chongqing": {Country: "CN", Region: "Chongqing", City: "Chongqing"},
	"Asia/Hong_Kong": {Country: "HK", Region: "Hong Kong", City: "Hong Kong"},
	"Asia/Taipei":    {Country: "TW", Region: "Taipei", City: "Taipei"},

	// South Asia & Middle East
	"Asia/Kolkata":  {Country: "IN", Region: "Delhi", City: "New Delhi"},
	"Asia/Calcutta": {Country: "IN", Region: "West Bengal", City: "Kolkata"},
	"Asia/Dubai":    {Country: "AE", Region: "Dubai", City: "Dubai"},
	"Asia/Riyadh":   {Country: "SA", Region: "Riyadh", City: "Riyadh"},

	// Europe
	"Europe/London":    {Country: "GB", Region: "Greater London", City: "London"},
	"Europe/Berlin":    {Country: "DE", Region: "Berlin", City: "Berlin"},
	"Europe/Frankfurt": {Country: "DE", Region: "Hesse", City: "Frankfurt"},
	"Europe/Paris":     {Country: "FR", Region: "Île-de-France", City: "Paris"},
	"Europe/Amsterdam": {Country: "NL", Region: "North Holland", City: "Amsterdam"},
	"Europe/Rome":      {Country: "IT", Region: "Lazio", City: "Rome"},
	"Europe/Madrid":    {Country: "ES", Region: "Community of Madrid", City: "Madrid"},
	"Europe/Zurich":    {Country: "CH", Region: "Zurich", City: "Zurich"},
	"Europe/Dublin":    {Country: "IE", Region: "Leinster", City: "Dublin"},
	"Europe/Brussels":  {Country: "BE", Region: "Brussels", City: "Brussels"},
	"Europe/Vienna":    {Country: "AT", Region: "Vienna", City: "Vienna"},
	"Europe/Stockholm": {Country: "SE", Region: "Stockholm", City: "Stockholm"},
	"Europe/Oslo":      {Country: "NO", Region: "Oslo", City: "Oslo"},
	"Europe/Helsinki":  {Country: "FI", Region: "Uusimaa", City: "Helsinki"},
	"Europe/Warsaw":    {Country: "PL", Region: "Mazovia", City: "Warsaw"},
	"Europe/Moscow":    {Country: "RU", Region: "Moscow", City: "Moscow"},
	"Europe/Istanbul":  {Country: "TR", Region: "Istanbul", City: "Istanbul"},

	// Americas
	"America/New_York":     {Country: "US", Region: "New York", City: "New York"},
	"America/Chicago":      {Country: "US", Region: "Illinois", City: "Chicago"},
	"America/Los_Angeles":  {Country: "US", Region: "California", City: "Los Angeles"},
	"America/Denver":       {Country: "US", Region: "Colorado", City: "Denver"},
	"America/Phoenix":      {Country: "US", Region: "Arizona", City: "Phoenix"},
	"America/Toronto":      {Country: "CA", Region: "Ontario", City: "Toronto"},
	"America/Vancouver":    {Country: "CA", Region: "British Columbia", City: "Vancouver"},
	"America/Sao_Paulo":    {Country: "BR", Region: "Sao Paulo", City: "Sao Paulo"},
	"America/Buenos_Aires": {Country: "AR", Region: "Buenos Aires", City: "Buenos Aires"},
	"America/Mexico_City":  {Country: "MX", Region: "Mexico City", City: "Mexico City"},

	// Oceania
	"Australia/Sydney":    {Country: "AU", Region: "New South Wales", City: "Sydney"},
	"Australia/Melbourne": {Country: "AU", Region: "Victoria", City: "Melbourne"},
	"Australia/Brisbane":  {Country: "AU", Region: "Queensland", City: "Brisbane"},
	"Australia/Perth":     {Country: "AU", Region: "Western Australia", City: "Perth"},
	"Pacific/Auckland":    {Country: "NZ", Region: "Auckland", City: "Auckland"},
}

// parseCountryFromLang inspects locale and Accept-Language headers
func parseCountryFromLang(locale, acceptLang string) string {
	for _, raw := range []string{locale, acceptLang} {
		if raw == "" {
			continue
		}
		// Split by comma for Accept-Language: "id-ID,id;q=0.9,en-US;q=0.8"
		tokens := strings.Split(raw, ",")
		for _, token := range tokens {
			token = strings.TrimSpace(token)
			if idx := strings.Index(token, ";"); idx != -1 {
				token = token[:idx]
			}
			parts := strings.Split(token, "-")
			if len(parts) == 2 && len(parts[1]) == 2 {
				return strings.ToUpper(parts[1])
			}
			// Single language inferences
			switch strings.ToLower(token) {
			case "id":
				return "ID"
			case "ja":
				return "JP"
			case "ko":
				return "KR"
			case "th":
				return "TH"
			case "vi":
				return "VN"
			}
		}
	}
	return ""
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

// IsBot checks if the User-Agent indicates an automated crawler, scraper, or bot
func (e *Enricher) IsBot(ua string) (bool, string) {
	if ua == "" {
		return true, "empty_ua"
	}

	lower := strings.ToLower(ua)

	// Automated browsers & testing tools (Headless / Selenium / Puppeteer)
	if strings.Contains(lower, "headlesschrome") || strings.Contains(lower, "puppeteer") ||
		strings.Contains(lower, "selenium") || strings.Contains(lower, "playwright") ||
		strings.Contains(lower, "phantomjs") || strings.Contains(lower, "nightmare") {
		return true, "headless_browser"
	}

	// CLI & programmatic HTTP client libraries
	if strings.Contains(lower, "curl/") || strings.Contains(lower, "wget/") ||
		strings.Contains(lower, "python-requests") || strings.Contains(lower, "python-urllib") ||
		strings.Contains(lower, "aiohttp") || strings.Contains(lower, "httpx") ||
		strings.Contains(lower, "go-http-client") || strings.Contains(lower, "postmanruntime") ||
		strings.Contains(lower, "apache-httpclient") || strings.Contains(lower, "java/") ||
		strings.Contains(lower, "scrapy") || strings.Contains(lower, "libwww-perl") {
		return true, "http_library"
	}

	// Search engine crawlers
	if strings.Contains(lower, "googlebot") || strings.Contains(lower, "bingbot") ||
		strings.Contains(lower, "yandexbot") || strings.Contains(lower, "baiduspider") ||
		strings.Contains(lower, "duckduckbot") || strings.Contains(lower, "slurp") {
		return true, "search_crawler"
	}

	// AI crawlers
	if strings.Contains(lower, "gptbot") || strings.Contains(lower, "claudebot") ||
		strings.Contains(lower, "ccbot") || strings.Contains(lower, "cohere-ai") ||
		strings.Contains(lower, "bytespider") {
		return true, "ai_crawler"
	}

	// Social & preview bots
	if strings.Contains(lower, "facebookexternalhit") || strings.Contains(lower, "twitterbot") ||
		strings.Contains(lower, "linkedinbot") || strings.Contains(lower, "whatsapp") ||
		strings.Contains(lower, "telegrambot") || strings.Contains(lower, "discordbot") ||
		strings.Contains(lower, "pinterestbot") {
		return true, "social_bot"
	}

	// Generic keywords
	if strings.Contains(lower, "bot") || strings.Contains(lower, "crawler") ||
		strings.Contains(lower, "spider") || strings.Contains(lower, "scraper") {
		return true, "generic_bot"
	}

	return false, ""
}

