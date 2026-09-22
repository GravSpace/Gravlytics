import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const token = params.token;
	const invite = await db.getInvitationByToken(token);

	if (!invite) {
		throw error(404, {
			message: 'This invitation link is invalid, expired, or has already been accepted.'
		});
	}

	return {
		invite: {
			...invite.invitation,
			orgName: invite.organization.name,
			inviterName: invite.inviterName
		},
		user: locals.user || null
	};
};

export const actions: Actions = {
	default: async ({ params, locals }) => {
		if (!locals.user) {
			throw redirect(303, `/login?redirect=/invite/${params.token}`);
		}

		const result = await db.acceptInvitation(params.token, locals.user.id);
		if (!result.success) {
			throw error(400, { message: result.error || 'Failed to accept invitation.' });
		}

		throw redirect(303, '/');
	}
};
