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

	const from = url.searchParams.get('from') || undefined;
	const to = url.searchParams.get('to') || undefined;

	const annotations = await db.getSiteAnnotations(siteId, from, to);
	return json(annotations);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { siteId, date, title, description, category, color } = body;

		if (!siteId || !date || !title) {
			return json({ error: 'siteId, date, and title are required' }, { status: 400 });
		}

		const annotation = await db.createSiteAnnotation(siteId, {
			date,
			title,
			description,
			category: category || 'release',
			color: color || 'indigo'
		});

		return json(annotation);
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create annotation' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing annotation id' }, { status: 400 });
	}

	const success = await db.deleteSiteAnnotation(id);
	return json({ success });
};
