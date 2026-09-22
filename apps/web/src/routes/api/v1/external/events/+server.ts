import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';
import { parseDateRange } from '$lib/server/api-helpers';
import { fetchEvents } from '$lib/api';

export const GET: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'read');
	if (errorResponse) return errorResponse;

	const { targetSiteId, site } = auth!;
	const { from, to, period } = parseDateRange(event.url);
	const limit = Math.min(Math.max(parseInt(event.url.searchParams.get('limit') || '50', 10), 1), 100);

	try {
		const eventsData = await fetchEvents(targetSiteId, from, to, limit);
		if (!eventsData) {
			return json({
				success: true,
				site_id: targetSiteId,
				domain: site.domain,
				period,
				date_range: { from, to },
				overview: { total_events: 0, custom_events: 0, pageviews: 0, unique_event_types: 0 },
				events: [],
				recent_stream: []
			});
		}

		return json({
			success: true,
			site_id: targetSiteId,
			domain: site.domain,
			period,
			date_range: { from, to },
			overview: eventsData.overview,
			events: eventsData.events,
			recent_stream: eventsData.recent_stream
		});
	} catch (err: any) {
		return json({ error: err.message || 'Gagal mengambil data events' }, { status: 500 });
	}
};
