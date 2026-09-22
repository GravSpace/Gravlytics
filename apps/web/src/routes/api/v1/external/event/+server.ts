import { json, type RequestHandler } from '@sveltejs/kit';
import { authenticateExternalApi } from '$lib/server/api-auth';

const COLLECTOR_URL = process.env.COLLECTOR_URL || 'http://localhost:8081';

export const POST: RequestHandler = async (event) => {
	const { auth, errorResponse } = await authenticateExternalApi(event, 'write');
	if (errorResponse) return errorResponse;

	const { targetSiteId } = auth!;

	try {
		const body = await event.request.json();
		const eventName = body.name || body.event || body.event_name || 'external_event';
		const clientIP =
			event.request.headers.get('cf-connecting-ip') ||
			event.request.headers.get('x-forwarded-for') ||
			event.getClientAddress();

		const payload = {
			s: body.site_id || targetSiteId,
			n: eventName,
			u: body.url_path || body.path || '/api-server',
			r: body.referrer || 'server-side-api',
			tz: body.timezone || 'UTC',
			l: body.locale || 'id-ID',
			tab_id: body.visitor_id || body.tab_id || ('ext_' + Math.random().toString(36).substring(2, 10)),
			p: {
				...(body.props || body.properties || {}),
				ingestion_source: 'external_api'
			}
		};

		const resp = await fetch(`${COLLECTOR_URL}/api/v1/event`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': event.request.headers.get('user-agent') || 'Gravlytics-External-API/1.0',
				'X-Forwarded-For': clientIP,
				'CF-IPCountry': event.request.headers.get('cf-ipcountry') || '',
				'CF-IPCity': event.request.headers.get('cf-ipcity') || '',
				'CF-Region': event.request.headers.get('cf-region') || ''
			},
			body: JSON.stringify(payload)
		});

		if (!resp.ok) {
			const errText = await resp.text();
			return json({ error: 'Pengiriman event gagal: ' + errText }, { status: resp.status });
		}

		return json({
			success: true,
			event_name: eventName,
			site_id: payload.s,
			timestamp: new Date().toISOString()
		});
	} catch (err: any) {
		return json({ error: err.message || 'Internal error' }, { status: 500 });
	}
};
