import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { signJWT } from '$lib/server/crypto';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oauth_state_google');

	cookies.delete('oauth_state_google', { path: '/' });

	if (!code || !state || state !== storedState) {
		throw redirect(303, '/login?error=' + encodeURIComponent('Invalid OAuth state or authorization code'));
	}

	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw redirect(303, '/login?error=' + encodeURIComponent('Google OAuth credentials are not configured in .env'));
	}

	try {
		// Exchange authorization code for access token
		const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: `${url.origin}/api/auth/oauth/google/callback`,
				grant_type: 'authorization_code'
			})
		});

		const tokenData = await tokenRes.json();
		if (tokenData.error || !tokenData.access_token) {
			throw new Error(tokenData.error_description || 'Failed to exchange token with Google');
		}

		// Fetch user profile info
		const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${tokenData.access_token}` }
		});
		const userData = await userinfoRes.json();

		if (!userData.email) {
			throw new Error('No email found in Google account');
		}

		const email = userData.email;
		const name = userData.name || userData.given_name || email.split('@')[0];

		// Find or create user
		const existingUser = await db.findUserByEmail(email);
		const user = existingUser || (await db.createUser(email, 'oauth_google_managed', name));
		if (!user) {
			throw new Error('Failed to create user account');
		}

		// Log audit event
		const orgs = await db.getUserOrgs(user.id);
		if (orgs.length > 0) {
			await db.logAuditEvent(orgs[0].id, user.id, 'user.login_oauth_google', {
				email: user.email,
				googleSub: userData.sub
			});
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
	} catch (err: any) {
		if (err?.status === 303) throw err;
		console.error('Google OAuth error:', err);
		throw redirect(303, '/login?error=' + encodeURIComponent(err.message || 'Google OAuth authorization failed'));
	}
};
