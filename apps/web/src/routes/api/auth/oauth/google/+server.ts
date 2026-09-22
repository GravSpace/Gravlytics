import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw redirect(303, '/login?error=' + encodeURIComponent('Google OAuth is not configured in .env (missing GOOGLE_CLIENT_ID)'));
	}

	const state = Math.random().toString(36).substring(2, 15);
	cookies.set('oauth_state_google', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 mins
	});

	const redirectUri = `${url.origin}/api/auth/oauth/google/callback`;
	const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email&state=${encodeURIComponent(state)}&prompt=select_account`;

	throw redirect(302, authUrl);
};
