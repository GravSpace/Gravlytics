import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const orgs = await db.getUserOrgs(locals.user.id);
	if (orgs.length === 0) {
		return json([]);
	}

	const activeOrg = orgs[0];
	const logs = await db.getAuditLogs(activeOrg.id, 100);
	return json(logs);
};
