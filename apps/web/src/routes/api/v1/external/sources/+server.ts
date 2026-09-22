import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';
import { parseDateRange } from '$lib/server/api-helpers';
import { fetchBreakdown } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'read');
	if (errorResponse) return errorResponse;

	const { targetSiteId, site } = auth!;
	const { from, to, period } = parseDateRange(event.url);
	const limit = Math.min(Math.max(parseInt(event.url.searchParams.get('limit') || '10', 10), 1), 50);

	try {
		const [referrers, utmSources] = await Promise.all([
			fetchBreakdown(targetSiteId, 'referrer', from, to, limit),
			fetchBreakdown(targetSiteId, 'utm_source', from, to, limit)
		]);

		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			sources: {
				referrers: referrers.map((r) => ({
					source: r.label,
					visitors: r.visitors || 0,
					pageviews: r.value,
					percentage: r.percentage
				})),
				utm_sources: utmSources.map((u) => ({
					campaign_source: u.label,
					visitors: u.visitors || 0,
					pageviews: u.value,
					percentage: u.percentage
				}))
			}
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data traffic sources' }, { status: 500 });
	}
};
