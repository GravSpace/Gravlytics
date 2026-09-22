import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchOverview } from '$lib/api';

export const GET: RequestHandler = async ({ url }) => {
	const siteId = url.searchParams.get('site_id');
	if (!siteId) {
		return json({ error: 'Missing required query parameter: site_id' }, { status: 400 });
	}

	const from = url.searchParams.get('from') || undefined;
	const to = url.searchParams.get('to') || undefined;

	try {
		const overview = await fetchOverview(siteId, from, to);
		return json({
			site_id: siteId,
			from: from || null,
			to: to || null,
			visitors: overview.visitors,
			pageviews: overview.pageviews,
			sessions: overview.sessions,
			bounces: overview.bounces,
			bounce_rate: overview.bounceRate,
			avg_duration_sec: overview.avgDurationSec
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to query overview stats' }, { status: 500 });
	}
};
