// Gravlytics Query API Client
// Provides typed endpoints with graceful fallback to simulated data for demo/preview mode

export interface OverviewStats {
	visitors: number;
	pageviews: number;
	sessions: number;
	bounces: number;
	bounceRate: number;
	avgDurationSec: number;
}

export interface TimeSeriesPoint {
	timestamp: string;
	label: string;
	pageviews: number;
	visitors: number;
}

export interface BreakdownItem {
	label: string;
	value: number;
	percentage: number;
	visitors?: number;
	bounceRate?: number;
}

const API_BASE = import.meta.env.VITE_QUERY_API_URL || 'http://localhost:8082';

export async function fetchOverview(siteId: string, from?: string, to?: string): Promise<OverviewStats> {
	const params = new URLSearchParams({ site_id: siteId });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/overview?${params.toString()}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		return {
			visitors: data.unique_visitors ?? data.visitors ?? 0,
			pageviews: data.pageviews ?? 0,
			sessions: data.sessions ?? 0,
			bounces: data.bounces ?? 0,
			bounceRate: data.bounce_rate ? Number(data.bounce_rate.toFixed(1)) : 0,
			avgDurationSec: data.avg_duration ? Math.round(data.avg_duration) : (data.avg_duration_sec ? Math.round(data.avg_duration_sec) : 0)
		};
	} catch {
		// Fallback mock data if query API is unreachable
		return {
			visitors: 0,
			pageviews: 0,
			sessions: 0,
			bounces: 0,
			bounceRate: 0,
			avgDurationSec: 0
		};
	}
}

export async function fetchTimeSeries(
	siteId: string,
	from?: string,
	to?: string,
	interval: 'day' | 'hour' = 'day'
): Promise<TimeSeriesPoint[]> {
	const params = new URLSearchParams({ site_id: siteId, interval });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/timeseries?${params.toString()}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const points = await res.json();
		if (!Array.isArray(points) || points.length === 0) {
			return [];
		}
		return points.map((p: any) => {
			const dateStr = p.date || p.timestamp || '';
			const d = new Date(dateStr);
			return {
				timestamp: dateStr,
				label: isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
				pageviews: p.pageviews || 0,
				visitors: p.unique_visitors ?? p.visitors ?? 0
			};
		});
	} catch {
		return [];
	}
}

const COUNTRY_NAMES: Record<string, string> = {
	ID: '🇮🇩 Indonesia (ID)',
	US: '🇺🇸 United States (US)',
	SG: '🇸🇬 Singapore (SG)',
	MY: '🇲🇾 Malaysia (MY)',
	GB: '🇬🇧 United Kingdom (GB)',
	DE: '🇩🇪 Germany (DE)',
	JP: '🇯🇵 Japan (JP)',
	FR: '🇫🇷 France (FR)',
	NL: '🇳🇱 Netherlands (NL)',
	CA: '🇨🇦 Canada (CA)',
	AU: '🇦🇺 Australia (AU)',
	IN: '🇮🇳 India (IN)',
	CN: '🇨🇳 China (CN)',
	KR: '🇰🇷 South Korea (KR)',
	BR: '🇧🇷 Brazil (BR)',
	RU: '🇷🇺 Russia (RU)',
	TH: '🇹🇭 Thailand (TH)',
	VN: '🇻🇳 Vietnam (VN)',
	PH: '🇵🇭 Philippines (PH)'
};

export function formatCountryName(code: string): string {
	const upper = code.toUpperCase();
	return COUNTRY_NAMES[upper] || `🌐 ${upper}`;
}

export async function fetchBreakdown(
	siteId: string,
	dimension: string,
	from?: string,
	to?: string,
	limit = 20
): Promise<BreakdownItem[]> {
	const params = new URLSearchParams({ site_id: siteId, dimension, limit: String(limit) });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/breakdown?${params.toString()}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const items = await res.json();
		if (!Array.isArray(items) || items.length === 0) {
			return [];
		}
		const maxVal = Math.max(...items.map((it: any) => it.pageviews || it.unique_visitors || it.visitors || 0), 1);
		return items.map((it: any) => {
			let label = it.value || '(unknown)';
			if (dimension === 'country') {
				label = formatCountryName(label);
			} else if (dimension === 'device_type') {
				if (label.toLowerCase() === 'desktop') label = '🖥️ Desktop';
				else if (label.toLowerCase() === 'mobile') label = '📱 Mobile';
				else if (label.toLowerCase() === 'tablet') label = '📟 Tablet';
			}

			return {
				label,
				value: it.pageviews || it.unique_visitors || it.visitors || 0,
				percentage: Number((((it.pageviews || it.unique_visitors || it.visitors || 0) / maxVal) * 100).toFixed(1)),
				visitors: it.unique_visitors ?? it.visitors,
				bounceRate: it.bounce_rate ? Number(it.bounce_rate.toFixed(1)) : undefined
			};
		});
	} catch {
		return [];
	}
}

export async function fetchRealtime(siteId: string): Promise<{ activeVisitors: number; activePaths: { path: string; visitors: number }[] }> {
	try {
		const res = await fetch(`${API_BASE}/api/stats/realtime?site_id=${siteId}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		return {
			activeVisitors: data.active_visitors || 0,
			activePaths: Array.isArray(data.active_paths)
				? data.active_paths.map((p: any) => ({
						path: p.path || p.url_path || '/',
						visitors: p.visitors || 1
					}))
				: []
		};
	} catch {
		return { activeVisitors: 0, activePaths: [] };
	}
}

export interface GoalItem {
	id: string;
	name: string;
	type: 'event' | 'pageview';
	trigger: string;
	conversions: number;
	visitors: number;
	conversionRate: number;
	trend: number;
}

export async function getSavedGoals(siteId: string): Promise<GoalItem[]> {
	try {
		const res = await fetch(`/api/goals?site_id=${siteId}`);
		if (!res.ok) return [];
		const list = await res.json();
		return list.map((g: any) => ({
			id: g.id,
			name: g.name,
			type: g.type,
			trigger: g.trigger,
			conversions: 0,
			visitors: 0,
			conversionRate: 0,
			trend: 0
		}));
	} catch {
		return [];
	}
}

export async function saveGoal(
	siteId: string,
	goal: { name: string; type: string; trigger: string }
): Promise<GoalItem | null> {
	try {
		const res = await fetch('/api/goals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ site_id: siteId, ...goal })
		});
		if (!res.ok) return null;
		const g = await res.json();
		return {
			id: g.id,
			name: g.name,
			type: g.type,
			trigger: g.trigger,
			conversions: 0,
			visitors: 0,
			conversionRate: 0,
			trend: 0
		};
	} catch {
		return null;
	}
}

export async function deleteGoal(goalId: string): Promise<boolean> {
	try {
		const res = await fetch(`/api/goals?id=${goalId}`, { method: 'DELETE' });
		if (!res.ok) return false;
		const data = await res.json();
		return !!data.success;
	} catch {
		return false;
	}
}

export async function fetchGoals(
	siteId: string,
	customGoals?: Array<{ id: string; name: string; type: string; trigger: string }>,
	from?: string,
	to?: string
): Promise<GoalItem[]> {
	const params = new URLSearchParams({ site_id: siteId });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const opts: RequestInit =
			customGoals && customGoals.length > 0
				? {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(customGoals)
					}
				: { method: 'GET' };

		const res = await fetch(`${API_BASE}/api/stats/goals?${params.toString()}`, opts);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch {
		return [];
	}
}

export interface FunnelStep {
	step: number;
	name: string;
	path: string;
	visitors: number;
	conversionFromStart: number;
	conversionFromPrev: number;
	dropoffRate: number;
}

export async function fetchFunnel(
	siteId: string,
	steps?: Array<{ name: string; path: string }>,
	from?: string,
	to?: string
): Promise<FunnelStep[]> {
	const params = new URLSearchParams({ site_id: siteId });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const opts: RequestInit =
			steps && steps.length > 0
				? {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(steps)
					}
				: { method: 'GET' };

		const res = await fetch(`${API_BASE}/api/stats/funnel?${params.toString()}`, opts);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch {
		return [];
	}
}

export interface CohortItem {
	period: string;
	size: number;
	intervals: (number | null)[];
}

export async function fetchRetention(
	siteId: string,
	granularity: 'week' | 'day' = 'week'
): Promise<CohortItem[]> {
	try {
		const res = await fetch(`${API_BASE}/api/stats/retention?site_id=${siteId}&granularity=${granularity}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch {
		return [];
	}
}

// ── Sessions Types & Client ──

export interface SessionJourneyEvent {
	event_name: string;
	url_path: string;
	timestamp: string;
	props?: Record<string, string>;
}

export interface SessionItem {
	session_id: string;
	visitor_id: string;
	started_at: string;
	ended_at: string;
	duration_sec: number;
	events_count: number;
	pageviews_count: number;
	entry_path: string;
	exit_path: string;
	country: string;
	city: string;
	device_type: string;
	browser: string;
	os: string;
	referrer_domain: string;
	events?: SessionJourneyEvent[];
}

export interface SessionDurationBucket {
	bucket: string;
	sessions: number;
	percentage: number;
}

export interface SessionsOverview {
	total_sessions: number;
	unique_visitors: number;
	avg_duration_sec: number;
	bounce_rate: number;
	pages_per_session: number;
	events_per_session: number;
}

export interface SessionsResponse {
	overview: SessionsOverview;
	duration_buckets: SessionDurationBucket[];
	recent_sessions: SessionItem[];
}

export async function fetchSessions(
	siteId: string,
	from?: string,
	to?: string,
	limit = 30
): Promise<SessionsResponse | null> {
	const params = new URLSearchParams({ site_id: siteId, limit: String(limit) });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/sessions?${params.toString()}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch {
		return null;
	}
}

// ── Events Types & Client ──

export interface EventListItem {
	event_name: string;
	category: 'system' | 'custom';
	total_count: number;
	unique_visitors: number;
	unique_sessions: number;
	percentage: number;
}

export interface RecentEventItem {
	event_id: string;
	event_name: string;
	url_path: string;
	timestamp: string;
	session_id: string;
	visitor_id: string;
	country: string;
	device_type: string;
	browser: string;
	props: Record<string, string>;
}

export interface EventsOverview {
	total_events: number;
	custom_events: number;
	pageviews: number;
	unique_event_types: number;
	unique_visitors: number;
	events_per_session: number;
}

export interface EventsResponse {
	overview: EventsOverview;
	events: EventListItem[];
	recent_stream: RecentEventItem[];
}

export async function fetchEvents(
	siteId: string,
	from?: string,
	to?: string,
	limit = 50
): Promise<EventsResponse | null> {
	const params = new URLSearchParams({ site_id: siteId, limit: String(limit) });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/events?${params.toString()}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch {
		return null;
	}
}

export interface EventPropertyValue {
	value: string;
	count: number;
}

export interface EventPropertyItem {
	key: string;
	count: number;
	top_values: EventPropertyValue[];
}

export async function fetchEventProperties(
	siteId: string,
	eventName: string,
	from?: string,
	to?: string
): Promise<EventPropertyItem[]> {
	const params = new URLSearchParams({ site_id: siteId, event_name: eventName });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/events/properties?${params.toString()}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch {
		return [];
	}
}

export interface VitalsMetric {
	name: string;
	description: string;
	unit: string;
	p75: number;
	avg: number;
	good_pct: number;
	needs_improvement_pct: number;
	poor_pct: number;
	status: 'good' | 'needs-improvement' | 'poor';
	threshold_good: number;
	threshold_poor: number;
}

export interface VitalsPageItem {
	path: string;
	samples: number;
	lcp: number;
	cls: number;
	inp: number;
	rating: string;
}

export interface VitalsResult {
	metrics: VitalsMetric[];
	slowest_pages: VitalsPageItem[];
	total_samples: number;
}

const VITALS_META: Record<string, { description: string; threshold_good: number; threshold_poor: number }> = {
	LCP: { description: 'Largest Contentful Paint — measures loading performance', threshold_good: 2500, threshold_poor: 4000 },
	CLS: { description: 'Cumulative Layout Shift — measures visual stability', threshold_good: 0.1, threshold_poor: 0.25 },
	INP: { description: 'Interaction to Next Paint — measures responsiveness', threshold_good: 200, threshold_poor: 500 },
	FCP: { description: 'First Contentful Paint — measures initial render speed', threshold_good: 1800, threshold_poor: 3000 },
	TTFB: { description: 'Time to First Byte — measures server response time', threshold_good: 800, threshold_poor: 1800 },
};

export async function fetchVitals(
	siteId: string,
	from?: string,
	to?: string
): Promise<VitalsResult | null> {
	const params = new URLSearchParams({ site_id: siteId });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/vitals?${params.toString()}`);
		if (res.ok) {
			const data = await res.json();

			// Map backend field names to frontend field names
			const metrics: VitalsMetric[] = Array.isArray(data.metrics)
				? data.metrics.map((m: any) => {
						const meta = VITALS_META[m.name] || { description: '', threshold_good: 0, threshold_poor: 0 };
						return {
							name: m.name,
							description: meta.description,
							unit: m.unit || 'ms',
							p75: m.value_p75 ?? 0,
							avg: m.value_avg ?? 0,
							good_pct: m.good_pct ?? 0,
							needs_improvement_pct: m.needs_improve_pct ?? 0,
							poor_pct: m.poor_pct ?? 0,
							status: m.rating || 'poor',
							threshold_good: meta.threshold_good,
							threshold_poor: meta.threshold_poor,
						};
					})
				: [];

			const slowest_pages: VitalsPageItem[] = Array.isArray(data.slowest_pages)
				? data.slowest_pages.map((p: any) => ({
						path: p.url_path || p.path || '/',
						samples: p.samples ?? 0,
						lcp: p.lcp ?? 0,
						cls: p.cls ?? 0,
						inp: p.inp ?? 0,
						rating: p.rating || 'poor',
					}))
				: [];

			return {
				total_samples: data.total_samples || 0,
				metrics,
				slowest_pages,
			};
		}
	} catch (err) {
		console.error('Failed to fetch vitals', err);
	}

	return {
		total_samples: 0,
		metrics: [],
		slowest_pages: []
	};
}

export interface AdSlotItem {
	slot_id: string;
	impressions: number;
	loaded: number;
	viewed: number;
	clicks: number;
	fill_rate: number;
	viewability: number;
	ctr: number;
	avg_dwell_time: number;
}

export interface AdsResult {
	total_requests: number;
	total_loaded: number;
	total_viewable: number;
	total_clicks: number;
	overall_fill_rate: number;
	overall_viewability: number;
	overall_ctr: number;
	slots: AdSlotItem[];
}

export async function fetchAds(
	siteId: string,
	from?: string,
	to?: string
): Promise<AdsResult | null> {
	const params = new URLSearchParams({ site_id: siteId });
	if (from) params.set('from', from);
	if (to) params.set('to', to);

	try {
		const res = await fetch(`${API_BASE}/api/stats/ads?${params.toString()}`);
		if (res.ok) {
			const data = await res.json();
			const totalReqs = data.total_requests || 0;
			const totalFills = data.total_fills || data.total_loaded || 0;
			const totalViewable = data.viewable_impressions || data.total_viewable || 0;
			const totalImps = data.total_impressions || totalFills || 0;
			const slots: AdSlotItem[] = Array.isArray(data.slots)
				? data.slots.map((s: any) => ({
						slot_id: s.slot_id || 'slot',
						impressions: s.impressions || s.requests || 0,
						loaded: s.fills || s.loaded || 0,
						viewed: s.viewable_impressions || s.viewed || 0,
						clicks: s.clicks || 0,
						fill_rate: s.fill_rate ?? (s.requests > 0 ? (s.fills / s.requests) * 100 : 0),
						viewability: s.viewability_rate ?? (s.impressions > 0 ? (s.viewable_impressions / s.impressions) * 100 : 0),
						ctr: s.ctr || 0,
						avg_dwell_time: s.avg_dwell_time || 0
					}))
				: [];

			return {
				total_requests: totalReqs,
				total_loaded: totalFills,
				total_viewable: totalViewable,
				total_clicks: data.total_clicks || 0,
				overall_fill_rate: data.overall_fill_rate ?? (totalReqs > 0 ? (totalFills / totalReqs) * 100 : 0),
				overall_viewability: data.viewability_rate ?? (totalImps > 0 ? (totalViewable / totalImps) * 100 : 0),
				overall_ctr: data.overall_ctr || 0,
				slots
			};
		}
	} catch (err) {
		console.error('Failed to fetch ads', err);
	}

	return {
		total_requests: 0,
		total_loaded: 0,
		total_viewable: 0,
		total_clicks: 0,
		overall_fill_rate: 0,
		overall_viewability: 0,
		overall_ctr: 0,
		slots: []
	};
}

