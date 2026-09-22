import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchTimeSeries } from '$lib/api';

export const GET: RequestHandler = async ({ url }) => {
	const siteId = url.searchParams.get('site_id');
	if (!siteId) {
		return json({ error: 'Missing required query parameter: site_id' }, { status: 400 });
	}

	const from = url.searchParams.get('from') || undefined;
	const to = url.searchParams.get('to') || undefined;
	const interval = (url.searchParams.get('interval') === 'hour' ? 'hour' : 'day') as 'day' | 'hour';

	try {
		const points = await fetchTimeSeries(siteId, from, to, interval);
		return json({
			site_id: siteId,
			interval,
			data: points
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to query timeseries' }, { status: 500 });
	}
};
