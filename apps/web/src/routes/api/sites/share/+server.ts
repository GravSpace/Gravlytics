import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { siteId, isPublic, password } = body;

		if (!siteId) {
			return json({ error: 'siteId is required' }, { status: 400 });
		}

		// Verify user owns/members this site
		const userSites = await db.getUserSites(locals.user.id);
		const userSite = userSites.find((s) => s.id === siteId);
		if (!userSite) {
			return json({ error: 'Site not found or access denied' }, { status: 404 });
		}

		const result = await db.updateSiteSharing(siteId, Boolean(isPublic), password);
		const orgs = await db.getUserOrgs(locals.user.id);
		if (orgs.length > 0) {
			await db.logAuditEvent(orgs[0].id, locals.user.id, 'site.share_updated', {
				siteId,
				domain: userSite.domain,
				isPublic: Boolean(isPublic),
				hasPassword: Boolean(password)
			});
		}
		return json(result);
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update sharing' }, { status: 500 });
	}
};
