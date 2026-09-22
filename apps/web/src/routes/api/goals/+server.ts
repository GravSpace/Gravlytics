import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const siteId = url.searchParams.get('site_id');
	if (!siteId) return json([]);
	const goals = await db.getGoals(siteId);
	return json(
		goals.map((g) => ({
			id: g.id,
			siteId: g.siteId,
			name: g.name,
			type: g.eventName ? 'event' : 'pageview',
			trigger: g.eventName || g.pagePath || '/',
			createdAt: g.createdAt
		}))
	);
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { site_id, name, type, trigger } = body;

		if (!site_id || !name || !trigger) {
			return json({ error: 'Missing required fields: site_id, name, trigger' }, { status: 400 });
		}

		const eventName = type === 'event' ? trigger : undefined;
		const pagePath = type === 'pageview' ? trigger : undefined;

		const goal = await db.createGoal(site_id, name, eventName, pagePath);
		return json({
			id: goal.id,
			siteId: goal.siteId,
			name: goal.name,
			type: goal.eventName ? 'event' : 'pageview',
			trigger: goal.eventName || goal.pagePath || '/',
			createdAt: goal.createdAt
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create goal' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing id parameter' }, { status: 400 });
	}

	const success = await db.deleteGoal(id);
	return json({ success });
};
