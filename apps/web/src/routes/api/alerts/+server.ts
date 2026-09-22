import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const siteId = url.searchParams.get('siteId');
	if (!siteId) {
		return json({ error: 'siteId is required' }, { status: 400 });
	}

	const alerts = await db.getAlerts(siteId);
	return json(alerts);
};

export const POST: RequestHandler = async ({ request, url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const action = url.searchParams.get('action');

	// Webhook test ping action
	if (action === 'test') {
		try {
			const body = await request.json();
			const { webhookUrl, alertName } = body;
			if (!webhookUrl) {
				return json({ error: 'webhookUrl is required' }, { status: 400 });
			}

			const payload = {
				source: 'Gravlytics Telemetry Alert System',
				event: 'test_alert_ping',
				alert: alertName || 'Test Anomaly Alert',
				timestamp: new Date().toISOString(),
				message: '🔔 Test notification from Gravlytics: your webhook integration is properly configured!'
			};

			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			return json({
				success: response.ok,
				status: response.status,
				statusText: response.statusText
			});
		} catch (err: any) {
			return json({ error: err.message || 'Webhook ping failed' }, { status: 500 });
		}
	}

	try {
		const body = await request.json();
		const { siteId, name, metric, condition, threshold, windowMinutes, webhookUrl } = body;

		if (!siteId || !name || !metric || !threshold || !webhookUrl) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const alert = await db.createAlert(siteId, {
			name: name.trim(),
			metric,
			condition: condition || 'greater_than',
			threshold: Number(threshold),
			windowMinutes: Number(windowMinutes || 60),
			webhookUrl: webhookUrl.trim()
		});

		return json(alert);
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create alert' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { alertId, enabled } = body;

		if (!alertId || typeof enabled !== 'boolean') {
			return json({ error: 'alertId and enabled are required' }, { status: 400 });
		}

		const success = await db.toggleAlert(alertId, enabled);
		return json({ success });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update alert' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing alert id' }, { status: 400 });
	}

	const success = await db.deleteAlert(id);
	return json({ success });
};
