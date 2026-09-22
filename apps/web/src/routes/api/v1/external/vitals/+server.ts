import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';
import { parseDateRange } from '$lib/server/api-helpers';
import { fetchVitals } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'read');
	if (errorResponse) return errorResponse;

	const { targetSiteId, site } = auth!;
	const { from, to, period } = parseDateRange(event.url);

	try {
		const vitals = await fetchVitals(targetSiteId, from, to);
		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			vitals: vitals || { metrics: [], slowest_pages: [], total_samples: 0 }
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data core web vitals' }, { status: 500 });
	}
};
