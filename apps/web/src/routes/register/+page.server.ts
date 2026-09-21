import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { hashPassword, signJWT } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString() || '';
		const email = data.get('email')?.toString() || '';
		const password = data.get('password')?.toString() || '';

		if (!email || !password || !name) {
			return fail(400, { error: 'Please fill in all required fields' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long' });
		}

		const existing = await db.findUserByEmail(email);
		if (existing) {
			return fail(400, { error: 'An account with this email already exists' });
		}

		const passwordHash = hashPassword(password);
		const user = await db.createUser(email, passwordHash, name);

		const token = signJWT({
			userId: user.id,
			email: user.email,
			name: user.name
		});

		cookies.set('gravlytics_token', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7
		});

		throw redirect(303, '/');
	}
};
