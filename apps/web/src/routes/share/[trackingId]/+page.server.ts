import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const trackingId = params.trackingId;
	const shareData = await db.getSiteByTrackingIdForShare(trackingId);

	if (!shareData) {
		throw error(404, {
			message: 'This dashboard is private or does not exist.'
		});
	}

	const { site, hasPassword } = shareData;

	if (hasPassword) {
		const authCookie = cookies.get(`gly_share_${trackingId}`);
		if (authCookie !== 'authorized') {
			return {
				site: {
					name: site.name,
					domain: site.domain,
					trackingId: site.trackingId
				},
				requiresPassword: true
			};
		}
	}

	return {
		site,
		requiresPassword: false
	};
};

export const actions: Actions = {
	unlock: async ({ request, params, cookies }) => {
		const trackingId = params.trackingId;
		const data = await request.formData();
		const password = data.get('password')?.toString() || '';

		if (!password) {
			return fail(400, { error: 'Please enter a password' });
		}

		const isValid = await db.verifySharePassword(trackingId, password);
		if (!isValid) {
			return fail(401, { error: 'Incorrect password' });
		}

		cookies.set(`gly_share_${trackingId}`, 'authorized', {
			path: `/share/${trackingId}`,
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 // 24 hours
		});

		return { success: true };
	}
};
