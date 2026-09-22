import { json, type RequestHandler } from '@sveltejs/kit';

const COLLECTOR_URL = process.env.COLLECTOR_URL || 'http://localhost:8081';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const siteId = body.site_id || body.siteId;

		if (!siteId) {
			return json({ error: 'Missing site_id parameter' }, { status: 400 });
		}

		const eventName = body.name || body.event || body.event_name || 'custom_event';
		const clientIP = request.headers.get('cf-connecting-ip') ||
			request.headers.get('x-forwarded-for') ||
			getClientAddress();

		const payload = {
			s: siteId,
			n: eventName,
			u: body.url_path || body.path || '/',
			r: body.referrer || '',
			tz: body.timezone || 'UTC',
			l: body.locale || 'en-US',
			tab_id: body.tab_id || body.visitor_id || Math.random().toString(36).substring(2, 10),
			p: body.props || body.properties || {}
		};

		// Forward event payload to collector ingestion service
		const resp = await fetch(`${COLLECTOR_URL}/api/v1/event`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': request.headers.get('user-agent') || 'Gravlytics-API-Client/1.0',
				'X-Forwarded-For': clientIP,
				'CF-IPCountry': request.headers.get('cf-ipcountry') || '',
				'CF-IPCity': request.headers.get('cf-ipcity') || '',
				'CF-Region': request.headers.get('cf-region') || ''
			},
			body: JSON.stringify(payload)
		});

		if (!resp.ok) {
			const errText = await resp.text();
			return json({ error: 'Ingestion failed: ' + errText }, { status: resp.status });
		}

		return json({
			success: true,
			event_name: eventName,
			site_id: siteId,
			timestamp: new Date().toISOString()
		});
	} catch (err: any) {
		return json({ error: err.message || 'Internal error' }, { status: 500 });
	}
};
