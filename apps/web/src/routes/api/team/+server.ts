import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const orgs = await db.getUserOrganizations(locals.user.id);
		const primaryOrg = orgs[0];
		if (!primaryOrg) {
			return json({ organization: null, members: [], invitations: [] });
		}

		const [members, invitations] = await Promise.all([
			db.getOrgMembers(primaryOrg.id),
			db.getOrgInvitations(primaryOrg.id)
		]);

		return json({
			organization: primaryOrg,
			members,
			invitations
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to fetch team data' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { email, role = 'Viewer' } = body;

		if (!email || !email.includes('@')) {
			return json({ error: 'Valid email address is required' }, { status: 400 });
		}

		const orgs = await db.getUserOrganizations(locals.user.id);
		const primaryOrg = orgs[0];
		if (!primaryOrg) {
			return json({ error: 'Organization not found' }, { status: 404 });
		}

		const invitation = await db.createOrgInvitation(
			primaryOrg.id,
			locals.user.id,
			email,
			role as 'Admin' | 'Editor' | 'Viewer'
		);

		const origin = url.origin;
		const inviteUrl = `${origin}/invite/${invitation.token}`;

		return json({
			success: true,
			invitation,
			inviteUrl
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create invitation' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const orgs = await db.getUserOrganizations(locals.user.id);
		const primaryOrg = orgs[0];
		if (!primaryOrg) {
			return json({ error: 'Organization not found' }, { status: 404 });
		}

		const memberId = url.searchParams.get('memberId');
		const inviteId = url.searchParams.get('inviteId');

		if (memberId) {
			const success = await db.removeOrgMember(primaryOrg.id, memberId);
			if (!success) {
				return json({ error: 'Cannot remove the organization owner' }, { status: 400 });
			}
			return json({ success: true });
		}

		if (inviteId) {
			const success = await db.cancelOrgInvitation(primaryOrg.id, inviteId);
			return json({ success });
		}

		return json({ error: 'Missing memberId or inviteId parameter' }, { status: 400 });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to remove team entity' }, { status: 500 });
	}
};
