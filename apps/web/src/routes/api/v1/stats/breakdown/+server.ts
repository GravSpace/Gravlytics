import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchBreakdown } from '$lib/api';

export const GET: RequestHandler = async ({ url }) => {
	const siteId = url.searchParams.get('site_id');
	if (!siteId) {
		return json({ error: 'Missing required query parameter: site_id' }, { status: 400 });
	}

	const dimension = url.searchParams.get('dimension') || 'url_path';
	const from = url.searchParams.get('from') || undefined;
	const to = url.searchParams.get('to') || undefined;
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	try {
		const items = await fetchBreakdown(siteId, dimension, from, to, limit);
		return json({
			site_id: siteId,
			dimension,
			from: from || null,
			to: to || null,
			count: items.length,
			items
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to query breakdown' }, { status: 500 });
	}
};
