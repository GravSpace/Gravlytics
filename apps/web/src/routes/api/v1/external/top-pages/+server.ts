import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';
import { parseDateRange } from '$lib/server/api-helpers';
import { fetchBreakdown } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'read');
	if (errorResponse) return errorResponse;

	const { targetSiteId, site } = auth!;
	const { from, to, period } = parseDateRange(event.url);
	const limit = Math.min(Math.max(parseInt(event.url.searchParams.get('limit') || '5', 10), 1), 100);

	try {
		const items = await fetchBreakdown(targetSiteId, 'url_path', from, to, limit);
		const totalPageviews = items.reduce((sum, it) => sum + it.value, 0);

		const topPages = items.map((it, idx) => ({
			rank: idx + 1,
			path: it.label,
			pageviews: it.value,
			visitors: it.visitors || 0,
			percentage: totalPageviews > 0 ? Number(((it.value / totalPageviews) * 100).toFixed(1)) : 0,
			bounce_rate: it.bounceRate ?? null
		}));

		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			total_top_pageviews: totalPageviews,
			limit,
			top_pages: topPages
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data top pages' }, { status: 500 });
	}
};
