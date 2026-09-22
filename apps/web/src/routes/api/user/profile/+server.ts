import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const user = await db.findUserById(locals.user.id);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const orgs = await db.getUserOrganizations(locals.user.id);

	return json({
		user,
		organizations: orgs
	});
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { name, email } = body;

		if (!name || !name.trim()) {
			return json({ error: 'Name cannot be empty' }, { status: 400 });
		}
		if (!email || !email.includes('@')) {
			return json({ error: 'A valid email address is required' }, { status: 400 });
		}

		// Check if email taken by another user
		const existing = await db.findUserByEmail(email.trim());
		if (existing && existing.id !== locals.user.id) {
			return json({ error: 'This email address is already in use by another account' }, { status: 409 });
		}

		const updated = await db.updateUserProfile(locals.user.id, name.trim(), email.trim());
		if (!updated) {
			return json({ error: 'Failed to update user profile' }, { status: 500 });
		}

		return json({
			success: true,
			user: updated
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update profile' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { currentPassword, newPassword } = body;

		if (!currentPassword || !newPassword) {
			return json({ error: 'Current password and new password are required' }, { status: 400 });
		}

		if (newPassword.length < 6) {
			return json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
		}

		const result = await db.updateUserPassword(locals.user.id, currentPassword, newPassword);
		if (!result.success) {
			return json({ error: result.error || 'Password update failed' }, { status: 400 });
		}

		return json({
			success: true,
			message: 'Password updated successfully'
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to change password' }, { status: 500 });
	}
};
