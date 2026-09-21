import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword, signJWT } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString() || '';
		const password = data.get('password')?.toString() || '';

		if (!email || !password) {
			return fail(400, { error: 'Please provide both email and password' });
		}

		const user = await db.findUserByEmail(email);
		if (!user || !verifyPassword(password, user.passwordHash)) {
			return fail(400, { error: 'Invalid email or password' });
		}

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
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		throw redirect(303, '/');
	}
};
