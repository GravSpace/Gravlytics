import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchRealtime } from '$lib/api';

export const GET: RequestHandler = async ({ url }) => {
	const siteId = url.searchParams.get('site_id');
	if (!siteId) {
		return json({ error: 'Missing required query parameter: site_id' }, { status: 400 });
	}

	try {
		const realtime = await fetchRealtime(siteId);
		return json({
			site_id: siteId,
			active_visitors: realtime.activeVisitors,
			active_paths: realtime.activePaths,
			timestamp: new Date().toISOString()
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to query realtime visitors' }, { status: 500 });
	}
};
