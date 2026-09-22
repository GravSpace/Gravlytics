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
		const [countries, cities] = await Promise.all([
			fetchBreakdown(targetSiteId, 'country', from, to, limit),
			fetchBreakdown(targetSiteId, 'city', from, to, limit)
		]);

		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			locations: {
				countries: countries.map((c) => ({
					country: c.label,
					visitors: c.visitors || 0,
					pageviews: c.value,
					percentage: c.percentage
				})),
				cities: cities.map((c) => ({
					city: c.label,
					visitors: c.visitors || 0,
					pageviews: c.value,
					percentage: c.percentage
				}))
			}
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data locations' }, { status: 500 });
	}
};
