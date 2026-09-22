import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const clientId = process.env.GITHUB_CLIENT_ID;
	if (!clientId) {
		throw redirect(303, '/login?error=' + encodeURIComponent('GitHub OAuth is not configured in .env (missing GITHUB_CLIENT_ID)'));
	}

	const state = Math.random().toString(36).substring(2, 15);
	cookies.set('oauth_state_github', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 mins
	});

	const redirectUri = `${url.origin}/api/auth/oauth/github/callback`;
	const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${encodeURIComponent(state)}`;

	throw redirect(302, authUrl);
};
