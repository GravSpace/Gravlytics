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
			visitors: data.visitors || 0,
			pageviews: data.pageviews || 0,
			sessions: data.sessions || 0,
			bounces: data.bounces || 0,
			bounceRate: data.bounce_rate ? Number((data.bounce_rate * 100).toFixed(1)) : 0,
			avgDurationSec: data.avg_duration_sec ? Math.round(data.avg_duration_sec) : 0
		};
	} catch {
		// Fallback mock data
		return {
			visitors: 12847,
			pageviews: 43291,
			sessions: 16420,
			bounces: 6945,
			bounceRate: 42.3,
			avgDurationSec: 185
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
		return points.map((p: any) => {
			const d = new Date(p.timestamp);
			return {
				timestamp: p.timestamp,
				label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
				pageviews: p.pageviews || 0,
				visitors: p.visitors || 0
			};
		});
	} catch {
		// Generate 30 days mock data
		return Array.from({ length: 30 }, (_, i) => {
			const date = new Date();
			date.setDate(date.getDate() - 29 + i);
			const base = 800 + Math.random() * 600;
			const pvs = Math.round(base + Math.sin(i * 0.5) * 200);
			return {
				timestamp: date.toISOString(),
				label: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
				pageviews: pvs,
				visitors: Math.round(pvs * 0.6)
			};
		});
	}
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
		const maxVal = Math.max(...items.map((it: any) => it.pageviews || it.visitors || 0), 1);
		return items.map((it: any) => ({
			label: it.value || '(unknown)',
			value: it.pageviews || it.visitors || 0,
			percentage: Number((((it.pageviews || it.visitors || 0) / maxVal) * 100).toFixed(1)),
			visitors: it.visitors,
			bounceRate: it.bounce_rate ? Number((it.bounce_rate * 100).toFixed(1)) : undefined
		}));
	} catch {
		return [];
	}
}

export async function fetchRealtime(siteId: string): Promise<number> {
	try {
		const res = await fetch(`${API_BASE}/api/stats/realtime?site_id=${siteId}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		return data.active_visitors || 0;
	} catch {
		return Math.floor(Math.random() * 15) + 12;
	}
}
