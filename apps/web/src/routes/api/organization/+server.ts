import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const orgData = await db.getOrganizationForUser(locals.user.id);
		if (!orgData) {
			return json({ error: 'Organization not found' }, { status: 404 });
		}

		return json(orgData);
	} catch (err: any) {
		return json({ error: err.message || 'Failed to fetch organization' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { name, slug } = body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Organization name is required' }, { status: 400 });
		}

		const orgData = await db.getOrganizationForUser(locals.user.id);
		if (!orgData) {
			return json({ error: 'Organization not found' }, { status: 404 });
		}

		const updatedOrg = await db.updateOrganizationForUser(
			locals.user.id,
			orgData.organization.id,
			name,
			slug || orgData.organization.slug
		);

		return json({
			success: true,
			organization: updatedOrg
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update organization' }, { status: 500 });
	}
};
