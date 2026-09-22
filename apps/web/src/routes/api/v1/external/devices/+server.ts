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
		const [deviceTypes, browsers, operatingSystems] = await Promise.all([
			fetchBreakdown(targetSiteId, 'device_type', from, to, limit),
			fetchBreakdown(targetSiteId, 'browser', from, to, limit),
			fetchBreakdown(targetSiteId, 'os', from, to, limit)
		]);

		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			devices: {
				device_types: deviceTypes.map((d) => ({
					device: d.label,
					visitors: d.visitors || 0,
					pageviews: d.value,
					percentage: d.percentage
				})),
				browsers: browsers.map((b) => ({
					browser: b.label,
					visitors: b.visitors || 0,
					pageviews: b.value,
					percentage: b.percentage
				})),
				operating_systems: operatingSystems.map((o) => ({
					os: o.label,
					visitors: o.visitors || 0,
					pageviews: o.value,
					percentage: o.percentage
				}))
			}
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data devices' }, { status: 500 });
	}
};
