import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const [sites, organizations] = await Promise.all([
		db.getUserSites(locals.user.id),
		db.getUserOrganizations(locals.user.id)
	]);

	return {
		user: locals.user,
		sites,
		organizations
	};
};
