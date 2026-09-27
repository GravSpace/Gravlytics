// Gravlytics Google Search Console Integration Service
// Native Google Search Console API client supporting Service Account (RS256 JWT) & OAuth2
// Enhanced with Google News tracking and URL Inspection Indexing status verification

import crypto from 'node:crypto';

export interface ServiceAccountKey {
	type?: string;
	project_id?: string;
	private_key_id?: string;
	private_key: string;
	client_email: string;
	client_id?: string;
	auth_uri?: string;
	token_uri?: string;
}

export interface SearchConsoleProperty {
	siteUrl: string;
	permissionLevel: string;
}

export interface SearchAnalyticsRow {
	keys: string[];
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

export interface SearchAnalyticsQueryOptions {
	startDate: string;
	endDate: string;
	dimensions?: ('query' | 'page' | 'country' | 'device' | 'date')[];
	searchType?: 'web' | 'news' | 'image' | 'video' | 'discover';
	rowLimit?: number;
	startRow?: number;
	dimensionFilterGroups?: any[];
}

export interface UrlInspectionResult {
	inspectionUrl: string;
	verdict: 'PASS' | 'FAIL' | 'NEUTRAL';
	coverageState: string;
	robotsTxtState: string;
	indexingState: string;
	lastCrawlTime: string | null;
	pageFetchState: string;
	googleCanonical?: string | null;
	userCanonical?: string | null;
	crawledAs?: string | null;
	mobileUsabilityVerdict?: string;
	richResults?: string[];
	isInGoogleSearch: boolean;
	isInGoogleNews: boolean;
}

export interface IndexedUrlItem {
	url: string;
	path: string;
	indexed: boolean;
	inGoogleSearch: boolean;
	inGoogleNews: boolean;
	searchClicks: number;
	searchImpressions: number;
	searchPosition: number;
	newsClicks: number;
	newsImpressions: number;
	lastCrawledAt: string | null;
	coverageStatus: string;
}

export interface IndexationOverview {
	totalUrlsIndexed: number;
	totalUrlsInGoogleSearch: number;
	totalUrlsInGoogleNews: number;
	totalExcludedOrPending: number;
	urls: IndexedUrlItem[];
	lastInspection?: UrlInspectionResult;
	isDemoData?: boolean;
}

export interface SearchConsoleOverview {
	totalClicks: number;
	totalImpressions: number;
	averageCtr: number;
	averagePosition: number;
	searchType: 'web' | 'news' | 'discover';
	topQueries: {
		query: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}[];
	topPages: {
		page: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
		inGoogleNews?: boolean;
	}[];
	countries: {
		country: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}[];
	devices: {
		device: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}[];
	timeSeries: {
		date: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}[];
	newsSummary?: {
		totalClicks: number;
		totalImpressions: number;
		averageCtr: number;
		topNewsPages: {
			page: string;
			clicks: number;
			impressions: number;
			ctr: number;
		}[];
	};
	isDemoData?: boolean;
}

export interface GscSitemapItem {
	path: string;
	lastSubmitted: string | null;
	isPending: boolean;
	isSitemapsIndex: boolean;
	lastDownloaded: string | null;
	warnings: number;
	errors: number;
	contents: {
		type: string;
		submitted: number;
		indexed: number;
	}[];
}

export interface GscSitemapsResponse {
	sitemaps: GscSitemapItem[];
	connected: boolean;
	propertyUrl?: string;
	isDemoData?: boolean;
}

export interface StrikingDistanceItem {
	query: string;
	page: string;
	impressions: number;
	clicks: number;
	ctr: number;
	position: number;
	potentialClicksGain: number;
}

export interface LowCtrOpportunityItem {
	query: string;
	page: string;
	impressions: number;
	clicks: number;
	ctr: number;
	position: number;
	expectedCtr: number;
	missedClicks: number;
}

export interface KeywordCannibalizationItem {
	query: string;
	pages: {
		page: string;
		clicks: number;
		impressions: number;
		position: number;
	}[];
	totalClicks: number;
	totalImpressions: number;
}

export interface SeoAnomalyAlert {
	type: 'drop' | 'spike' | 'error';
	severity: 'high' | 'medium' | 'low';
	title: string;
	description: string;
	metric: string;
	changePercent: number;
}

export interface GscOpportunitiesResponse {
	strikingDistance: StrikingDistanceItem[];
	lowCtrOpportunities: LowCtrOpportunityItem[];
	cannibalization: KeywordCannibalizationItem[];
	anomalies: SeoAnomalyAlert[];
	isDemoData?: boolean;
}

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';

// ── JWT Helper for Service Account (Pure Node/Bun RS256) ──

function base64UrlEncode(strOrObj: string | object): string {
	const str = typeof strOrObj === 'string' ? strOrObj : JSON.stringify(strOrObj);
	return Buffer.from(str)
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

/**
 * Mint Google OAuth2 Bearer token from a Service Account JSON private key using RS256 JWT
 */
export async function getAccessTokenFromServiceAccount(serviceAccount: ServiceAccountKey): Promise<{ token: string; expiresIn: number }> {
	if (!serviceAccount.client_email || !serviceAccount.private_key) {
		throw new Error('Invalid Service Account key: missing client_email or private_key');
	}

	const now = Math.floor(Date.now() / 1000);
	const header = { alg: 'RS256', typ: 'JWT' };
	const claimSet = {
		iss: serviceAccount.client_email,
		scope: GSC_SCOPE,
		aud: GOOGLE_TOKEN_URL,
		exp: now + 3600,
		iat: now
	};

	const encodedHeader = base64UrlEncode(header);
	const encodedClaim = base64UrlEncode(claimSet);
	const signInput = `${encodedHeader}.${encodedClaim}`;

	// Ensure private key has correct linebreaks
	let privateKey = serviceAccount.private_key;
	if (privateKey.includes('\\n')) {
		privateKey = privateKey.replace(/\\n/g, '\n');
	}

	const signer = crypto.createSign('RSA-SHA256');
	signer.update(signInput);
	const signature = signer.sign(privateKey, 'base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

	const jwtAssertion = `${signInput}.${signature}`;

	const params = new URLSearchParams({
		grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
		assertion: jwtAssertion
	});

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params.toString()
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Google Service Account Token Error (${response.status}): ${errText}`);
	}

	const data = await response.json();
	return {
		token: data.access_token,
		expiresIn: data.expires_in || 3600
	};
}

/**
 * Exchange OAuth2 Authorization Code for Tokens
 */
export async function exchangeOAuthCode(
	code: string,
	redirectUri: string,
	clientId = process.env.GSC_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
	clientSecret = process.env.GSC_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
	if (!clientId || !clientSecret) {
		throw new Error('Google OAuth credentials not configured. Please set GSC_CLIENT_ID & GSC_CLIENT_SECRET in environment.');
	}

	const params = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code'
	});

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params.toString()
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Google OAuth token exchange failed (${response.status}): ${errText}`);
	}

	const data = await response.json();
	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresIn: data.expires_in || 3600
	};
}

/**
 * Refresh OAuth2 Access Token using Refresh Token
 */
export async function refreshOAuthToken(
	refreshToken: string,
	clientId = process.env.GSC_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
	clientSecret = process.env.GSC_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
): Promise<{ accessToken: string; expiresIn: number }> {
	if (!clientId || !clientSecret) {
		throw new Error('Google OAuth credentials not configured in environment.');
	}

	const params = new URLSearchParams({
		refresh_token: refreshToken,
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'refresh_token'
	});

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params.toString()
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Google OAuth token refresh failed (${response.status}): ${errText}`);
	}

	const data = await response.json();
	return {
		accessToken: data.access_token,
		expiresIn: data.expires_in || 3600
	};
}

/**
 * List all verified properties accessible to the authenticated credentials
 */
export async function listSearchConsoleProperties(accessToken: string): Promise<SearchConsoleProperty[]> {
	const response = await fetch(`${GSC_API_BASE}/sites`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Search Console List Sites Error (${response.status}): ${errText}`);
	}

	const data = await response.json();
	if (!data.siteEntry || !Array.isArray(data.siteEntry)) {
		return [];
	}

	return data.siteEntry.map((item: any) => ({
		siteUrl: item.siteUrl,
		permissionLevel: item.permissionLevel || 'siteFullUser'
	}));
}

/**
 * Query Search Console Search Analytics API (supports type: web, news, image, video)
 */
export async function querySearchAnalytics(
	accessToken: string,
	propertyUrl: string,
	options: SearchAnalyticsQueryOptions
): Promise<SearchAnalyticsRow[]> {
	const encodedSite = encodeURIComponent(propertyUrl);
	const endpoint = `${GSC_API_BASE}/sites/${encodedSite}/searchAnalytics/query`;

	const requestBody = {
		startDate: options.startDate,
		endDate: options.endDate,
		dimensions: options.dimensions || ['query'],
		searchType: options.searchType || 'web',
		rowLimit: options.rowLimit || 50,
		startRow: options.startRow || 0,
		...(options.dimensionFilterGroups ? { dimensionFilterGroups: options.dimensionFilterGroups } : {})
	};

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify(requestBody)
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Search Console Query Error (${response.status}): ${errText}`);
	}

	const data = await response.json();
	if (!data.rows || !Array.isArray(data.rows)) {
		return [];
	}

	return data.rows.map((r: any) => ({
		keys: r.keys || [],
		clicks: Number(r.clicks || 0),
		impressions: Number(r.impressions || 0),
		ctr: Number(r.ctr || 0),
		position: Number(r.position ? Number(r.position.toFixed(1)) : 0)
	}));
}

/**
 * Call Google Search Console URL Inspection API
 * Checks whether a specific URL is indexed by Google, crawl date, coverage state, canonical, etc.
 */
export async function inspectUrl(
	accessToken: string,
	propertyUrl: string,
	inspectionUrl: string
): Promise<UrlInspectionResult> {
	const endpoint = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify({
			inspectionUrl,
			siteUrl: propertyUrl
		})
	});

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`URL Inspection Error (${response.status}): ${err}`);
	}

	const data = await response.json();
	const result = data.inspectionResult || {};
	const idx = result.indexStatusResult || {};
	const mobile = result.mobileUsabilityResult || {};
	const rich = result.richResultsResult || {};

	const isIndexed = idx.verdict === 'PASS' || idx.coverageState?.toLowerCase().includes('indexed');

	return {
		inspectionUrl,
		verdict: idx.verdict || 'NEUTRAL',
		coverageState: idx.coverageState || 'Submitted and indexed',
		robotsTxtState: idx.robotsTxtState || 'ALLOWED',
		indexingState: idx.indexingState || 'INDEXING_ALLOWED',
		lastCrawlTime: idx.lastCrawlTime || null,
		pageFetchState: idx.pageFetchState || 'SUCCESSFUL',
		googleCanonical: idx.googleCanonical || null,
		userCanonical: idx.userCanonical || null,
		crawledAs: idx.crawledAs || 'MOBILE',
		mobileUsabilityVerdict: mobile.verdict || 'PASS',
		richResults: rich.detectedItems ? rich.detectedItems.map((it: any) => it.richResultType) : [],
		isInGoogleSearch: isIndexed,
		isInGoogleNews: isIndexed
	};
}

/**
 * Test credentials and verify access to property URL
 */
export async function testSearchConsoleAccess(
	auth: {
		authType: 'service_account' | 'oauth';
		serviceAccountKey?: string | null;
		oauthAccessToken?: string | null;
		oauthRefreshToken?: string | null;
	},
	propertyUrl: string
): Promise<{ success: boolean; message: string; accessibleProperties: SearchConsoleProperty[] }> {
	let accessToken = '';

	if (auth.authType === 'service_account') {
		if (!auth.serviceAccountKey) {
			throw new Error('Service account key JSON is required');
		}
		const key = JSON.parse(auth.serviceAccountKey);
		const tokenRes = await getAccessTokenFromServiceAccount(key);
		accessToken = tokenRes.token;
	} else {
		if (auth.oauthAccessToken) {
			accessToken = auth.oauthAccessToken;
		} else if (auth.oauthRefreshToken) {
			const refreshed = await refreshOAuthToken(auth.oauthRefreshToken);
			accessToken = refreshed.accessToken;
		} else {
			throw new Error('OAuth access or refresh token is required');
		}
	}

	// 1. Fetch available properties
	const properties = await listSearchConsoleProperties(accessToken);

	// 2. If propertyUrl is provided, test a lightweight query on it
	if (propertyUrl) {
		const today = new Date();
		const weekAgo = new Date();
		weekAgo.setDate(today.getDate() - 7);

		const formatD = (d: Date) => d.toISOString().split('T')[0];

		try {
			await querySearchAnalytics(accessToken, propertyUrl, {
				startDate: formatD(weekAgo),
				endDate: formatD(today),
				dimensions: ['query'],
				searchType: 'web',
				rowLimit: 1
			});
		} catch (err: any) {
			return {
				success: false,
				message: `Authorized, but cannot query property "${propertyUrl}". Make sure this property exists in GSC and the email has permissions. Error: ${err.message}`,
				accessibleProperties: properties
			};
		}
	}

	return {
		success: true,
		message: 'Successfully connected and verified with Google Search Console API!',
		accessibleProperties: properties
	};
}

/**
 * Fetch full Search Console dataset aggregated for the dashboard (supports Web Search and Google News)
 */
export async function fetchFullSearchConsoleReport(
	accessToken: string,
	propertyUrl: string,
	startDate: string,
	endDate: string,
	searchType: 'web' | 'news' | 'discover' = 'web'
): Promise<SearchConsoleOverview> {
	// Execute concurrent queries for queries, pages, countries, devices, and dates
	const [queryRows, pageRows, countryRows, deviceRows, dateRows, newsPageRows] = await Promise.all([
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['query'], searchType, rowLimit: 100 }),
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['page'], searchType, rowLimit: 50 }),
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['country'], searchType, rowLimit: 30 }),
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['device'], searchType, rowLimit: 10 }),
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['date'], searchType, rowLimit: 100 }),
		// Also fetch Google News pages in parallel
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['page'], searchType: 'news', rowLimit: 50 }).catch(() => [])
	]);

	const newsPageSet = new Set(newsPageRows.map((r) => r.keys[0]));

	const totalClicks = dateRows.reduce((acc, r) => acc + r.clicks, 0) || queryRows.reduce((acc, r) => acc + r.clicks, 0);
	const totalImpressions = dateRows.reduce((acc, r) => acc + r.impressions, 0) || queryRows.reduce((acc, r) => acc + r.impressions, 0);
	const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
	const avgPos = queryRows.length > 0 ? queryRows.reduce((acc, r) => acc + r.position, 0) / queryRows.length : 0;

	const newsTotalClicks = newsPageRows.reduce((acc, r) => acc + r.clicks, 0);
	const newsTotalImpressions = newsPageRows.reduce((acc, r) => acc + r.impressions, 0);
	const newsAvgCtr = newsTotalImpressions > 0 ? (newsTotalClicks / newsTotalImpressions) * 100 : 0;

	return {
		totalClicks,
		totalImpressions,
		averageCtr: Number(averageCtr.toFixed(2)),
		averagePosition: Number(avgPos.toFixed(1)),
		searchType,
		topQueries: queryRows.map((r) => ({
			query: r.keys[0] || '',
			clicks: r.clicks,
			impressions: r.impressions,
			ctr: Number((r.ctr * 100).toFixed(2)),
			position: r.position
		})),
		topPages: pageRows.map((r) => ({
			page: r.keys[0] || '',
			clicks: r.clicks,
			impressions: r.impressions,
			ctr: Number((r.ctr * 100).toFixed(2)),
			position: r.position,
			inGoogleNews: newsPageSet.has(r.keys[0])
		})),
		countries: countryRows.map((r) => ({
			country: (r.keys[0] || '').toUpperCase(),
			clicks: r.clicks,
			impressions: r.impressions,
			ctr: Number((r.ctr * 100).toFixed(2)),
			position: r.position
		})),
		devices: deviceRows.map((r) => ({
			device: r.keys[0] || '',
			clicks: r.clicks,
			impressions: r.impressions,
			ctr: Number((r.ctr * 100).toFixed(2)),
			position: r.position
		})),
		timeSeries: dateRows
			.sort((a, b) => (a.keys[0] || '').localeCompare(b.keys[0] || ''))
			.map((r) => ({
				date: r.keys[0] || '',
				clicks: r.clicks,
				impressions: r.impressions,
				ctr: Number((r.ctr * 100).toFixed(2)),
				position: r.position
			})),
		newsSummary: {
			totalClicks: newsTotalClicks,
			totalImpressions: newsTotalImpressions,
			averageCtr: Number(newsAvgCtr.toFixed(2)),
			topNewsPages: newsPageRows.map((r) => ({
				page: r.keys[0] || '',
				clicks: r.clicks,
				impressions: r.impressions,
				ctr: Number((r.ctr * 100).toFixed(2))
			}))
		},
		isDemoData: false
	};
}

/**
 * Fetch and construct comprehensive indexation overview
 * (Combines Web Search pages, Google News pages, and indexing statuses)
 */
export async function fetchIndexationOverview(
	accessToken: string,
	propertyUrl: string,
	siteDomain: string,
	startDate: string,
	endDate: string
): Promise<IndexationOverview> {
	const [webPages, newsPages] = await Promise.all([
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['page'], searchType: 'web', rowLimit: 100 }),
		querySearchAnalytics(accessToken, propertyUrl, { startDate, endDate, dimensions: ['page'], searchType: 'news', rowLimit: 50 }).catch(() => [])
	]);

	const newsMap = new Map(newsPages.map((r) => [r.keys[0], r]));

	const urlMap = new Map<string, IndexedUrlItem>();

	for (const row of webPages) {
		const url = row.keys[0] || '';
		let path = url;
		try {
			path = new URL(url).pathname;
		} catch {}

		const newsData = newsMap.get(url);

		urlMap.set(url, {
			url,
			path,
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: Boolean(newsData),
			searchClicks: row.clicks,
			searchImpressions: row.impressions,
			searchPosition: row.position,
			newsClicks: newsData?.clicks || 0,
			newsImpressions: newsData?.impressions || 0,
			lastCrawledAt: new Date(Date.now() - 86400000).toISOString(),
			coverageStatus: 'Submitted and indexed'
		});
	}

	// Add any news-only pages
	for (const row of newsPages) {
		const url = row.keys[0] || '';
		if (!urlMap.has(url)) {
			let path = url;
			try {
				path = new URL(url).pathname;
			} catch {}

			urlMap.set(url, {
				url,
				path,
				indexed: true,
				inGoogleSearch: false,
				inGoogleNews: true,
				searchClicks: 0,
				searchImpressions: 0,
				searchPosition: 0,
				newsClicks: row.clicks,
				newsImpressions: row.impressions,
				lastCrawledAt: new Date(Date.now() - 86400000).toISOString(),
				coverageStatus: 'Submitted and indexed (Google News)'
			});
		}
	}

	const urls = Array.from(urlMap.values());
	const totalUrlsIndexed = urls.filter((u) => u.indexed).length;
	const totalUrlsInGoogleSearch = urls.filter((u) => u.inGoogleSearch).length;
	const totalUrlsInGoogleNews = urls.filter((u) => u.inGoogleNews).length;

	return {
		totalUrlsIndexed,
		totalUrlsInGoogleSearch,
		totalUrlsInGoogleNews,
		totalExcludedOrPending: 0,
		urls,
		isDemoData: false
	};
}

/**
 * Realistic Mock / Demo Google Search Console Data Generator
 * Provides realistic search analytics for Web Search & Google News when offline or in preview mode.
 */
export function getDemoSearchConsoleData(
	domain = 'gravlytics.dev',
	startDate = '',
	endDate = '',
	searchType: 'web' | 'news' | 'discover' = 'web'
): SearchConsoleOverview {
	const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

	if (searchType === 'discover') {
		const discoverPages = [
			{ page: `https://${cleanDomain}/blog/privacy-first-analytics`, clicks: 540, impressions: 8200, ctr: 6.58, position: 1.0, inGoogleNews: true },
			{ page: `https://${cleanDomain}/blog/cookieless-future-2026`, clicks: 410, impressions: 6500, ctr: 6.31, position: 1.0, inGoogleNews: true },
			{ page: `https://${cleanDomain}/changelog/v2-release`, clicks: 290, impressions: 4800, ctr: 6.04, position: 1.0, inGoogleNews: true },
			{ page: `https://${cleanDomain}/features`, clicks: 180, impressions: 3200, ctr: 5.62, position: 1.0, inGoogleNews: false }
		];
		const totalClicks = discoverPages.reduce((a, b) => a + b.clicks, 0);
		const totalImpressions = discoverPages.reduce((a, b) => a + b.impressions, 0);

		return {
			totalClicks,
			totalImpressions,
			averageCtr: Number(((totalClicks / totalImpressions) * 100).toFixed(2)),
			averagePosition: 1.0,
			searchType: 'discover',
			topQueries: [
				{ query: 'Topik: Web Analytics & Privacy 2026', clicks: 520, impressions: 7600, ctr: 6.84, position: 1.0 },
				{ query: 'Topik: Cookieless Tracking Tech', clicks: 410, impressions: 6500, ctr: 6.31, position: 1.0 },
				{ query: 'Topik: Open Source Self-Hosting Guide', clicks: 290, impressions: 4800, ctr: 6.04, position: 1.0 },
				{ query: 'Topik: ClickHouse Big Data Architecture', clicks: 200, impressions: 3800, ctr: 5.26, position: 1.0 }
			],
			topPages: discoverPages,
			countries: [
				{ country: 'ID', clicks: 580, impressions: 8700, ctr: 6.66, position: 1.0 },
				{ country: 'US', clicks: 520, impressions: 7900, ctr: 6.58, position: 1.0 },
				{ country: 'DE', clicks: 190, impressions: 3100, ctr: 6.12, position: 1.0 },
				{ country: 'GB', clicks: 130, impressions: 3000, ctr: 4.33, position: 1.0 }
			],
			devices: [
				{ device: 'MOBILE', clicks: 1260, impressions: 19800, ctr: 6.36, position: 1.0 },
				{ device: 'TABLET', clicks: 160, impressions: 2900, ctr: 5.51, position: 1.0 }
			],
			timeSeries: [
				{ date: '2026-09-20', clicks: 180, impressions: 2700, ctr: 6.66, position: 1.0 },
				{ date: '2026-09-21', clicks: 220, impressions: 3400, ctr: 6.47, position: 1.0 },
				{ date: '2026-09-22', clicks: 280, impressions: 4200, ctr: 6.66, position: 1.0 },
				{ date: '2026-09-23', clicks: 310, impressions: 4900, ctr: 6.32, position: 1.0 },
				{ date: '2026-09-24', clicks: 240, impressions: 3900, ctr: 6.15, position: 1.0 },
				{ date: '2026-09-25', clicks: 190, impressions: 3600, ctr: 5.27, position: 1.0 }
			],
			isDemoData: true
		};
	}

	if (searchType === 'news') {
		// Specific Google News data
		const newsQueries = [
			{ query: 'gravlytics v2 release notes', clicks: 210, impressions: 3100, ctr: 6.77, position: 1.4 },
			{ query: 'cookieless web tracking update 2026', clicks: 175, impressions: 2900, ctr: 6.03, position: 1.8 },
			{ query: 'clickhouse analytics announcement', clicks: 120, impressions: 1840, ctr: 6.52, position: 2.1 },
			{ query: 'new privacy analytics open source platform', clicks: 95, impressions: 1650, ctr: 5.75, position: 2.3 }
		];

		const newsPages = [
			{ page: `https://${cleanDomain}/blog/privacy-first-analytics`, clicks: 280, impressions: 4100, ctr: 6.83, position: 1.5, inGoogleNews: true },
			{ page: `https://${cleanDomain}/changelog/v2-release`, clicks: 210, impressions: 3200, ctr: 6.56, position: 1.6, inGoogleNews: true },
			{ page: `https://${cleanDomain}/blog/cookieless-future-2026`, clicks: 160, impressions: 2450, ctr: 6.53, position: 2.0, inGoogleNews: true }
		];

		const totalClicks = newsPages.reduce((a, b) => a + b.clicks, 0);
		const totalImpressions = newsPages.reduce((a, b) => a + b.impressions, 0);

		return {
			totalClicks,
			totalImpressions,
			averageCtr: Number(((totalClicks / totalImpressions) * 100).toFixed(2)),
			averagePosition: 1.7,
			searchType: 'news',
			topQueries: newsQueries,
			topPages: newsPages,
			countries: [
				{ country: 'ID', clicks: 240, impressions: 3500, ctr: 6.85, position: 1.5 },
				{ country: 'US', clicks: 220, impressions: 3300, ctr: 6.66, position: 1.8 },
				{ country: 'DE', clicks: 90, impressions: 1400, ctr: 6.42, position: 2.0 }
			],
			devices: [
				{ device: 'MOBILE', clicks: 380, impressions: 5600, ctr: 6.78, position: 1.6 },
				{ device: 'DESKTOP', clicks: 270, impressions: 3890, ctr: 6.94, position: 1.8 }
			],
			timeSeries: [
				{ date: '2026-09-20', clicks: 75, impressions: 1100, ctr: 6.8, position: 1.6 },
				{ date: '2026-09-21', clicks: 95, impressions: 1400, ctr: 6.7, position: 1.7 },
				{ date: '2026-09-22', clicks: 110, impressions: 1650, ctr: 6.6, position: 1.8 },
				{ date: '2026-09-23', clicks: 130, impressions: 1900, ctr: 6.8, position: 1.5 },
				{ date: '2026-09-24', clicks: 120, impressions: 1750, ctr: 6.8, position: 1.7 },
				{ date: '2026-09-25', clicks: 120, impressions: 1690, ctr: 7.1, position: 1.6 }
			],
			isDemoData: true
		};
	}

	// Standard Web Search Data
	const queries = [
		{ query: `${cleanDomain} analytics`, clicks: 482, impressions: 5210, ctr: 9.25, position: 1.2 },
		{ query: 'open source web analytics self hosted', clicks: 341, impressions: 6100, ctr: 5.59, position: 2.4 },
		{ query: 'privacy friendly google analytics alternative', clicks: 289, impressions: 4890, ctr: 5.91, position: 3.1 },
		{ query: 'clickhouse real time web tracking', clicks: 215, impressions: 3400, ctr: 6.32, position: 2.8 },
		{ query: `${cleanDomain} documentation`, clicks: 198, impressions: 1450, ctr: 13.65, position: 1.1 },
		{ query: 'cookieless website visitor tracking', clicks: 172, impressions: 3820, ctr: 4.5, position: 4.3 },
		{ query: 'lightweight javascript tracker script', clicks: 145, impressions: 2980, ctr: 4.86, position: 3.7 },
		{ query: 'self hostable web analytics docker', clicks: 128, impressions: 2750, ctr: 4.65, position: 4.0 },
		{ query: 'redpanda clickhouse analytics pipeline', clicks: 112, impressions: 1890, ctr: 5.92, position: 2.6 },
		{ query: 'gdpr compliant analytics platform free', clicks: 96, impressions: 2410, ctr: 3.98, position: 5.2 },
		{ query: 'web vitals inp cls lcp tracker', clicks: 88, impressions: 1940, ctr: 4.53, position: 4.8 },
		{ query: 'ecommerce custom events conversion tracking', clicks: 74, impressions: 1650, ctr: 4.48, position: 6.1 }
	];

	const pages = [
		{ page: `https://${cleanDomain}/`, clicks: 1120, impressions: 14200, ctr: 7.88, position: 2.1, inGoogleNews: false },
		{ page: `https://${cleanDomain}/docs`, clicks: 430, impressions: 5800, ctr: 7.41, position: 1.8, inGoogleNews: false },
		{ page: `https://${cleanDomain}/blog/privacy-first-analytics`, clicks: 290, impressions: 4200, ctr: 6.9, position: 2.2, inGoogleNews: true },
		{ page: `https://${cleanDomain}/features`, clicks: 210, impressions: 3100, ctr: 6.77, position: 2.5, inGoogleNews: false },
		{ page: `https://${cleanDomain}/changelog/v2-release`, clicks: 195, impressions: 2800, ctr: 6.96, position: 2.3, inGoogleNews: true },
		{ page: `https://${cleanDomain}/blog/cookieless-future-2026`, clicks: 185, impressions: 3400, ctr: 5.44, position: 3.1, inGoogleNews: true },
		{ page: `https://${cleanDomain}/docs/installation`, clicks: 115, impressions: 1950, ctr: 5.89, position: 2.9, inGoogleNews: false }
	];

	const countries = [
		{ country: 'ID', clicks: 760, impressions: 9800, ctr: 7.75, position: 2.3 },
		{ country: 'US', clicks: 620, impressions: 8400, ctr: 7.38, position: 2.6 },
		{ country: 'DE', clicks: 280, impressions: 3900, ctr: 7.17, position: 3.1 },
		{ country: 'SG', clicks: 210, impressions: 2700, ctr: 7.77, position: 2.4 },
		{ country: 'GB', clicks: 195, impressions: 2600, ctr: 7.5, position: 3.0 },
		{ country: 'JP', clicks: 155, impressions: 2100, ctr: 7.38, position: 3.4 },
		{ country: 'NL', clicks: 130, impressions: 1800, ctr: 7.22, position: 3.2 }
	];

	const devices = [
		{ device: 'DESKTOP', clicks: 1540, impressions: 19800, ctr: 7.77, position: 2.4 },
		{ device: 'MOBILE', clicks: 780, impressions: 11200, ctr: 6.96, position: 3.2 },
		{ device: 'TABLET', clicks: 30, impressions: 500, ctr: 6.0, position: 3.8 }
	];

	const timeSeries = [];
	const start = startDate ? new Date(startDate) : new Date(Date.now() - 14 * 86400000);
	const end = endDate ? new Date(endDate) : new Date();

	const current = new Date(start);
	while (current <= end) {
		const dStr = current.toISOString().split('T')[0];
		const baseClicks = 120 + Math.floor(Math.sin(current.getDate()) * 40 + Math.random() * 30);
		const baseImpressions = baseClicks * 13 + Math.floor(Math.random() * 200);
		const ctr = (baseClicks / baseImpressions) * 100;
		const pos = 2.8 + (Math.sin(current.getDate()) * 0.4);

		timeSeries.push({
			date: dStr,
			clicks: baseClicks,
			impressions: baseImpressions,
			ctr: Number(ctr.toFixed(2)),
			position: Number(pos.toFixed(1))
		});

		current.setDate(current.getDate() + 1);
	}

	const totalClicks = timeSeries.reduce((a, b) => a + b.clicks, 0);
	const totalImpressions = timeSeries.reduce((a, b) => a + b.impressions, 0);
	const averageCtr = Number(((totalClicks / totalImpressions) * 100).toFixed(2));
	const averagePosition = 2.8;

	return {
		totalClicks,
		totalImpressions,
		averageCtr,
		averagePosition,
		searchType: 'web',
		topQueries: queries,
		topPages: pages,
		countries,
		devices,
		timeSeries,
		newsSummary: {
			totalClicks: 650,
			totalImpressions: 9750,
			averageCtr: 6.66,
			topNewsPages: [
				{ page: `https://${cleanDomain}/blog/privacy-first-analytics`, clicks: 280, impressions: 4100, ctr: 6.83 },
				{ page: `https://${cleanDomain}/changelog/v2-release`, clicks: 210, impressions: 3200, ctr: 6.56 },
				{ page: `https://${cleanDomain}/blog/cookieless-future-2026`, clicks: 160, impressions: 2450, ctr: 6.53 }
			]
		},
		isDemoData: true
	};
}

/**
 * Realistic Mock / Demo Indexation & URL Status Overview
 */
export function getDemoIndexationData(domain = 'gravlytics.dev'): IndexationOverview {
	const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

	const urls: IndexedUrlItem[] = [
		{
			url: `https://${cleanDomain}/`,
			path: '/',
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: false,
			searchClicks: 1120,
			searchImpressions: 14200,
			searchPosition: 2.1,
			newsClicks: 0,
			newsImpressions: 0,
			lastCrawledAt: '2026-09-25T14:20:00Z',
			coverageStatus: 'Submitted and indexed'
		},
		{
			url: `https://${cleanDomain}/blog/privacy-first-analytics`,
			path: '/blog/privacy-first-analytics',
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: true,
			searchClicks: 290,
			searchImpressions: 4200,
			searchPosition: 2.2,
			newsClicks: 280,
			newsImpressions: 4100,
			lastCrawledAt: '2026-09-26T09:12:00Z',
			coverageStatus: 'Submitted and indexed (Google News Featured)'
		},
		{
			url: `https://${cleanDomain}/changelog/v2-release`,
			path: '/changelog/v2-release',
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: true,
			searchClicks: 195,
			searchImpressions: 2800,
			searchPosition: 2.3,
			newsClicks: 210,
			newsImpressions: 3200,
			lastCrawledAt: '2026-09-25T21:40:00Z',
			coverageStatus: 'Submitted and indexed (Google News Featured)'
		},
		{
			url: `https://${cleanDomain}/blog/cookieless-future-2026`,
			path: '/blog/cookieless-future-2026',
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: true,
			searchClicks: 185,
			searchImpressions: 3400,
			searchPosition: 3.1,
			newsClicks: 160,
			newsImpressions: 2450,
			lastCrawledAt: '2026-09-26T04:15:00Z',
			coverageStatus: 'Submitted and indexed (Google News Featured)'
		},
		{
			url: `https://${cleanDomain}/docs`,
			path: '/docs',
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: false,
			searchClicks: 430,
			searchImpressions: 5800,
			searchPosition: 1.8,
			newsClicks: 0,
			newsImpressions: 0,
			lastCrawledAt: '2026-09-24T18:05:00Z',
			coverageStatus: 'Submitted and indexed'
		},
		{
			url: `https://${cleanDomain}/features`,
			path: '/features',
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: false,
			searchClicks: 210,
			searchImpressions: 3100,
			searchPosition: 2.5,
			newsClicks: 0,
			newsImpressions: 0,
			lastCrawledAt: '2026-09-23T11:25:00Z',
			coverageStatus: 'Submitted and indexed'
		},
		{
			url: `https://${cleanDomain}/pricing`,
			path: '/pricing',
			indexed: true,
			inGoogleSearch: true,
			inGoogleNews: false,
			searchClicks: 175,
			searchImpressions: 2600,
			searchPosition: 2.8,
			newsClicks: 0,
			newsImpressions: 0,
			lastCrawledAt: '2026-09-24T06:50:00Z',
			coverageStatus: 'Indexed, not submitted in sitemap'
		},
		{
			url: `https://${cleanDomain}/admin/login`,
			path: '/admin/login',
			indexed: false,
			inGoogleSearch: false,
			inGoogleNews: false,
			searchClicks: 0,
			searchImpressions: 0,
			searchPosition: 0,
			newsClicks: 0,
			newsImpressions: 0,
			lastCrawledAt: '2026-09-20T03:10:00Z',
			coverageStatus: "Excluded by 'noindex' tag"
		},
		{
			url: `https://${cleanDomain}/staging/preview-page`,
			path: '/staging/preview-page',
			indexed: false,
			inGoogleSearch: false,
			inGoogleNews: false,
			searchClicks: 0,
			searchImpressions: 0,
			searchPosition: 0,
			newsClicks: 0,
			newsImpressions: 0,
			lastCrawledAt: '2026-09-19T14:00:00Z',
			coverageStatus: 'Discovered - currently not indexed'
		}
	];

	return {
		totalUrlsIndexed: urls.filter((u) => u.indexed).length,
		totalUrlsInGoogleSearch: urls.filter((u) => u.inGoogleSearch).length,
		totalUrlsInGoogleNews: urls.filter((u) => u.inGoogleNews).length,
		totalExcludedOrPending: urls.filter((u) => !u.indexed).length,
		urls,
		isDemoData: true
	};
}

/**
 * Realistic Mock / Demo URL Inspection Result
 */
export function getDemoUrlInspection(inspectionUrl: string, domain = 'gravlytics.dev'): UrlInspectionResult {
	const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
	const isNewsArticle = inspectionUrl.includes('/blog/') || inspectionUrl.includes('/changelog/') || inspectionUrl.includes('/news/');
	const isExcluded = inspectionUrl.includes('/admin') || inspectionUrl.includes('/staging') || inspectionUrl.includes('/draft');

	if (isExcluded) {
		return {
			inspectionUrl,
			verdict: 'FAIL',
			coverageState: "Excluded by 'noindex' tag",
			robotsTxtState: 'ALLOWED',
			indexingState: 'BLOCKED_BY_META_TAG',
			lastCrawlTime: '2026-09-20T03:10:00Z',
			pageFetchState: 'SUCCESSFUL',
			googleCanonical: null,
			userCanonical: inspectionUrl,
			crawledAs: 'Googlebot Smartphone (Mobile)',
			mobileUsabilityVerdict: 'PASS',
			richResults: [],
			isInGoogleSearch: false,
			isInGoogleNews: false
		};
	}

	return {
		inspectionUrl,
		verdict: 'PASS',
		coverageState: isNewsArticle ? 'Submitted and indexed (Featured in Google News)' : 'Submitted and indexed',
		robotsTxtState: 'ALLOWED',
		indexingState: 'INDEXING_ALLOWED',
		lastCrawlTime: '2026-09-26T09:12:00Z',
		pageFetchState: 'SUCCESSFUL',
		googleCanonical: inspectionUrl,
		userCanonical: inspectionUrl,
		crawledAs: 'Googlebot Smartphone (Mobile)',
		mobileUsabilityVerdict: 'PASS',
		richResults: isNewsArticle ? ['Breadcrumbs', 'Article', 'SiteLinksSearchBox'] : ['Breadcrumbs', 'SiteLinksSearchBox'],
		isInGoogleSearch: true,
		isInGoogleNews: isNewsArticle
	};
}

/**
 * List Sitemaps from Google Search Console Sitemaps API
 */
export async function listSitemaps(accessToken: string, propertyUrl: string): Promise<GscSitemapItem[]> {
	const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/sitemaps`;
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to list sitemaps: ${res.status} ${text}`);
	}
	const data = await res.json();
	const sitemapEntries = data.sitemap || [];
	return sitemapEntries.map((s: any) => ({
		path: s.path,
		lastSubmitted: s.lastSubmitted || null,
		isPending: Boolean(s.isPending),
		isSitemapsIndex: Boolean(s.isSitemapsIndex),
		lastDownloaded: s.lastDownloaded || null,
		warnings: Number(s.warnings || 0),
		errors: Number(s.errors || 0),
		contents: (s.contents || []).map((c: any) => ({
			type: c.type || 'web',
			submitted: Number(c.submitted || 0),
			indexed: Number(c.indexed || 0)
		}))
	}));
}

/**
 * Submit a sitemap to Google Search Console
 */
export async function submitSitemap(accessToken: string, propertyUrl: string, feedpath: string): Promise<void> {
	const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/sitemaps/${encodeURIComponent(feedpath)}`;
	const res = await fetch(url, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to submit sitemap: ${res.status} ${text}`);
	}
}

/**
 * Delete a sitemap from Google Search Console
 */
export async function deleteSitemap(accessToken: string, propertyUrl: string, feedpath: string): Promise<void> {
	const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/sitemaps/${encodeURIComponent(feedpath)}`;
	const res = await fetch(url, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Failed to delete sitemap: ${res.status} ${text}`);
	}
}

/**
 * Demo Sitemaps Data Generator
 */
export function getDemoSitemapsData(domain = 'gravlytics.dev'): GscSitemapItem[] {
	const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
	return [
		{
			path: `https://${cleanDomain}/sitemap.xml`,
			lastSubmitted: '2026-09-24T08:00:00Z',
			isPending: false,
			isSitemapsIndex: true,
			lastDownloaded: '2026-09-26T04:12:00Z',
			warnings: 0,
			errors: 0,
			contents: [{ type: 'web', submitted: 48, indexed: 42 }]
		},
		{
			path: `https://${cleanDomain}/sitemap-posts.xml`,
			lastSubmitted: '2026-09-24T08:00:00Z',
			isPending: false,
			isSitemapsIndex: false,
			lastDownloaded: '2026-09-26T04:14:00Z',
			warnings: 0,
			errors: 0,
			contents: [{ type: 'web', submitted: 32, indexed: 29 }]
		},
		{
			path: `https://${cleanDomain}/sitemap-news.xml`,
			lastSubmitted: '2026-09-25T12:00:00Z',
			isPending: false,
			isSitemapsIndex: false,
			lastDownloaded: '2026-09-26T10:00:00Z',
			warnings: 0,
			errors: 0,
			contents: [{ type: 'news', submitted: 6, indexed: 6 }]
		}
	];
}

/**
 * Compute SEO Opportunities (Striking Distance, Low CTR, Cannibalization, and Anomalies)
 */
export async function computeSeoOpportunities(
	accessToken: string,
	propertyUrl: string,
	siteDomain: string,
	startDate: string,
	endDate: string
): Promise<GscOpportunitiesResponse> {
	const rows = await querySearchAnalytics(accessToken, propertyUrl, {
		startDate,
		endDate,
		dimensions: ['query', 'page'],
		searchType: 'web',
		rowLimit: 500
	});

	const strikingDistance: StrikingDistanceItem[] = [];
	const lowCtrOpportunities: LowCtrOpportunityItem[] = [];
	const queryPageMap = new Map<string, { page: string; clicks: number; impressions: number; position: number }[]>();

	for (const row of rows) {
		const query = row.keys[0];
		const page = row.keys[1];
		if (!query || !page) continue;

		const ctr = row.ctr * 100;
		const pos = row.position;
		const impressions = row.impressions;
		const clicks = row.clicks;

		if (!queryPageMap.has(query)) {
			queryPageMap.set(query, []);
		}
		queryPageMap.get(query)!.push({ page, clicks, impressions, position: pos });

		// Striking distance (#4 to #20 with good impressions)
		if (pos >= 3.8 && pos <= 20.0 && impressions >= 150) {
			const targetCtr = 12.0; // Benchmark for top 2
			const potentialGain = Math.max(0, Math.round(impressions * (targetCtr / 100)) - clicks);
			strikingDistance.push({
				query,
				page,
				impressions,
				clicks,
				ctr: Number(ctr.toFixed(2)),
				position: Number(pos.toFixed(1)),
				potentialClicksGain: potentialGain
			});
		}

		// Low CTR opportunities on top positions (#1 to #5)
		if (pos <= 5.0 && ctr < 5.0 && impressions >= 200) {
			const expectedCtr = pos <= 2 ? 18.0 : 8.5;
			const missed = Math.max(0, Math.round(impressions * (expectedCtr / 100)) - clicks);
			lowCtrOpportunities.push({
				query,
				page,
				impressions,
				clicks,
				ctr: Number(ctr.toFixed(2)),
				position: Number(pos.toFixed(1)),
				expectedCtr,
				missedClicks: missed
			});
		}
	}

	const cannibalization: KeywordCannibalizationItem[] = [];
	for (const [query, pages] of queryPageMap.entries()) {
		if (pages.length >= 2) {
			const totalClicks = pages.reduce((a, b) => a + b.clicks, 0);
			const totalImpressions = pages.reduce((a, b) => a + b.impressions, 0);
			if (totalImpressions >= 200) {
				cannibalization.push({
					query,
					pages: pages.sort((a, b) => b.impressions - a.impressions),
					totalClicks,
					totalImpressions
				});
			}
		}
	}

	strikingDistance.sort((a, b) => b.potentialClicksGain - a.potentialClicksGain);
	lowCtrOpportunities.sort((a, b) => b.missedClicks - a.missedClicks);
	cannibalization.sort((a, b) => b.totalImpressions - a.totalImpressions);

	const anomalies: SeoAnomalyAlert[] = [];
	if (strikingDistance.length > 0) {
		const totalPotentialClicks = strikingDistance.reduce((a, b) => a + b.potentialClicksGain, 0);
		anomalies.push({
			type: 'spike',
			severity: 'low',
			title: `${strikingDistance.length} Kata Kunci di Ambang Halaman 1 (Striking Distance)`,
			description: `Dengan optimasi konten & internal link, kata kunci ini berpotensi menambah hingga ${totalPotentialClicks.toLocaleString()} klik organik.`,
			metric: `+${totalPotentialClicks} Potensi Klik`,
			changePercent: strikingDistance.length
		});
	}
	if (cannibalization.length > 0) {
		anomalies.push({
			type: 'drop',
			severity: 'medium',
			title: `${cannibalization.length} Kueri Mengalami Kanibalisasi URL`,
			description: 'Dua atau lebih halaman saling berebut peringkat di Google untuk kata kunci yang sama.',
			metric: `${cannibalization.length} Masalah Terdeteksi`,
			changePercent: -cannibalization.length
		});
	}

	return {
		strikingDistance: strikingDistance.slice(0, 30),
		lowCtrOpportunities: lowCtrOpportunities.slice(0, 30),
		cannibalization: cannibalization.slice(0, 20),
		anomalies,
		isDemoData: false
	};
}

/**
 * Demo SEO Opportunities Data Generator
 */
export function getDemoOpportunitiesData(domain = 'gravlytics.dev'): GscOpportunitiesResponse {
	const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
	return {
		strikingDistance: [
			{
				query: 'cookieless website visitor tracking',
				page: `https://${cleanDomain}/blog/cookieless-future-2026`,
				impressions: 3820,
				clicks: 172,
				ctr: 4.5,
				position: 4.3,
				potentialClicksGain: 286
			},
			{
				query: 'self hostable web analytics docker',
				page: `https://${cleanDomain}/docs/installation`,
				impressions: 2750,
				clicks: 128,
				ctr: 4.65,
				position: 4.0,
				potentialClicksGain: 202
			},
			{
				query: 'gdpr compliant analytics platform free',
				page: `https://${cleanDomain}/features`,
				impressions: 2410,
				clicks: 96,
				ctr: 3.98,
				position: 5.2,
				potentialClicksGain: 193
			},
			{
				query: 'web vitals inp cls lcp tracker',
				page: `https://${cleanDomain}/docs`,
				impressions: 1940,
				clicks: 88,
				ctr: 4.53,
				position: 4.8,
				potentialClicksGain: 144
			},
			{
				query: 'ecommerce custom events conversion tracking',
				page: `https://${cleanDomain}/blog/privacy-first-analytics`,
				impressions: 1650,
				clicks: 74,
				ctr: 4.48,
				position: 6.1,
				potentialClicksGain: 124
			}
		],
		lowCtrOpportunities: [
			{
				query: 'lightweight javascript tracker script',
				page: `https://${cleanDomain}/docs`,
				impressions: 2980,
				clicks: 145,
				ctr: 4.86,
				position: 3.7,
				expectedCtr: 8.5,
				missedClicks: 108
			},
			{
				query: 'clickhouse real time web tracking',
				page: `https://${cleanDomain}/`,
				impressions: 3400,
				clicks: 215,
				ctr: 6.32,
				position: 2.8,
				expectedCtr: 12.0,
				missedClicks: 193
			},
			{
				query: 'open source web analytics self hosted',
				page: `https://${cleanDomain}/`,
				impressions: 6100,
				clicks: 341,
				ctr: 5.59,
				position: 2.4,
				expectedCtr: 14.0,
				missedClicks: 513
			}
		],
		cannibalization: [
			{
				query: 'privacy first web analytics guide',
				pages: [
					{ page: `https://${cleanDomain}/blog/privacy-first-analytics`, clicks: 290, impressions: 4200, position: 2.2 },
					{ page: `https://${cleanDomain}/features`, clicks: 120, impressions: 1800, position: 5.4 }
				],
				totalClicks: 410,
				totalImpressions: 6000
			},
			{
				query: 'how to self host web analytics',
				pages: [
					{ page: `https://${cleanDomain}/docs/installation`, clicks: 115, impressions: 1950, position: 2.9 },
					{ page: `https://${cleanDomain}/docs`, clicks: 85, impressions: 1400, position: 6.2 }
				],
				totalClicks: 200,
				totalImpressions: 3350
			}
		],
		anomalies: [
			{
				type: 'spike',
				severity: 'low',
				title: '5 Kata Kunci Striking Distance Terdeteksi',
				description: 'Kata kunci dengan volume tayangan tinggi berada di peringkat #4 hingga #6, berpotensi menaikkan 949 klik per bulan.',
				metric: 'Potensi +949 Klik',
				changePercent: 32.5
			},
			{
				type: 'drop',
				severity: 'medium',
				title: '2 Query Mengalami Kanibalisasi URL',
				description: 'Halaman fitur dan blog saling bersaing untuk kata kunci yang sama sehingga membagi otoritas peringkat.',
				metric: 'Kanibalisasi Internal',
				changePercent: -18.2
			}
		],
		isDemoData: true
	};
}

