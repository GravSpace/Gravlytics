import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';
import { parseDateRange } from '$lib/server/api-helpers';
import { fetchOverview } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'read');
	if (errorResponse) return errorResponse;

	const { targetSiteId, site } = auth!;
	const { from, to, period } = parseDateRange(event.url);

	try {
		const overview = await fetchOverview(targetSiteId, from, to);
		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			overview: {
				visitors: overview.visitors,
				pageviews: overview.pageviews,
				sessions: overview.sessions,
				bounces: overview.bounces,
				bounce_rate: overview.bounceRate,
				avg_duration_sec: overview.avgDurationSec
			}
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data overview' }, { status: 500 });
	}
};
