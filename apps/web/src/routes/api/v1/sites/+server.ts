import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		const sites = await db.getSites();
		return json({ sites });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to list sites' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const domain = body.domain;
		const name = body.name || domain;

		if (!domain) {
			return json({ error: 'Missing required field: domain' }, { status: 400 });
		}

		const site = await db.createSite(domain, name);
		return json({ site }, { status: 201 });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create site' }, { status: 500 });
	}
};
