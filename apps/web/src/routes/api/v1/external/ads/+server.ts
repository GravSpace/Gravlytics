import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';
import { parseDateRange } from '$lib/server/api-helpers';
import { fetchAds } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'read');
	if (errorResponse) return errorResponse;

	const { targetSiteId, site } = auth!;
	const { from, to, period } = parseDateRange(event.url);

	try {
		const ads = await fetchAds(targetSiteId, from, to);
		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			ads: ads || {
				total_requests: 0,
				total_loaded: 0,
				total_viewable: 0,
				total_clicks: 0,
				overall_fill_rate: 0,
				overall_viewability: 0,
				overall_ctr: 0,
				slots: []
			}
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data iklan & viewability' }, { status: 500 });
	}
};
