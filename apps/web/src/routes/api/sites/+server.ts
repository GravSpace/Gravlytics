import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sites = await db.getUserSites(locals.user.id);
	return json(
		sites.map((s) => ({
			id: s.id,
			domain: s.domain,
			name: s.name,
			trackingId: s.trackingId,
			timezone: s.timezone,
			isPublic: Boolean(s.isPublic),
			hasPassword: Boolean(s.sharePasswordHash),
			createdAt: s.createdAt
		}))
	);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { domain, name } = body;
		if (!domain) {
			return json({ error: 'Domain is required' }, { status: 400 });
		}
		const site = await db.createSiteForUser(locals.user.id, domain.trim(), (name || domain).trim());
		const orgs = await db.getUserOrgs(locals.user.id);
		if (orgs.length > 0) {
			await db.logAuditEvent(orgs[0].id, locals.user.id, 'site.created', { domain: site.domain, name: site.name });
		}
		return json({
			id: site.id,
			domain: site.domain,
			name: site.name,
			trackingId: site.trackingId,
			timezone: site.timezone,
			createdAt: site.createdAt
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create site' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ error: 'Missing id parameter' }, { status: 400 });
	}
	const success = await db.deleteSiteForUser(locals.user.id, id);
	if (success) {
		const orgs = await db.getUserOrgs(locals.user.id);
		if (orgs.length > 0) {
			await db.logAuditEvent(orgs[0].id, locals.user.id, 'site.deleted', { siteId: id });
		}
	}
	return json({ success });
};
