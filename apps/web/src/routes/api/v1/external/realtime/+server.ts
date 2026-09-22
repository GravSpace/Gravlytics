import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';
import { fetchRealtime } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'read');
	if (errorResponse) return errorResponse;

	const { targetSiteId, site } = auth!;

	try {
		const realtime = await fetchRealtime(targetSiteId);
		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			active_visitors: realtime.activeVisitors,
			active_paths: realtime.activePaths,
			timestamp: new Date().toISOString()
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data realtime' }, { status: 500 });
	}
};
