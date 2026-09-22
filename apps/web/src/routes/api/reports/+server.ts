import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const siteId = url.searchParams.get('siteId') || undefined;
	const reports = await db.getSavedReports(locals.user.id, siteId);
	return json(reports);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { siteId, name, filters } = body;

		if (!siteId || !name) {
			return json({ error: 'siteId and name are required' }, { status: 400 });
		}

		const report = await db.createSavedReport(
			locals.user.id,
			siteId,
			name.trim(),
			filters || {}
		);

		return json(report);
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create report' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing report id' }, { status: 400 });
	}

	const success = await db.deleteSavedReport(locals.user.id, id);
	return json({ success });
};
