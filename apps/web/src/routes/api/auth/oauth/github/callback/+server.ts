import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { signJWT } from '$lib/server/crypto';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oauth_state_github');

	cookies.delete('oauth_state_github', { path: '/' });

	if (!code || !state || state !== storedState) {
		throw redirect(303, '/login?error=' + encodeURIComponent('Invalid OAuth state or authorization code'));
	}

	const clientId = process.env.GITHUB_CLIENT_ID;
	const clientSecret = process.env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw redirect(303, '/login?error=' + encodeURIComponent('GitHub OAuth credentials are not configured in .env'));
	}

	try {
		// Exchange code for access token
		const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: `${url.origin}/api/auth/oauth/github/callback`
			})
		});

		const tokenData = await tokenRes.json();
		if (tokenData.error || !tokenData.access_token) {
			throw new Error(tokenData.error_description || 'Failed to obtain access token from GitHub');
		}

		// Fetch user profile
		const userRes = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`,
				'User-Agent': 'Gravlytics-Auth'
			}
		});
		const userData = await userRes.json();

		// Fetch user email if not public
		let email = userData.email;
		if (!email) {
			const emailsRes = await fetch('https://api.github.com/user/emails', {
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
					'User-Agent': 'Gravlytics-Auth'
				}
			});
			const emails = await emailsRes.json();
			if (Array.isArray(emails)) {
				const primary = emails.find((e: any) => e.primary && e.verified);
				email = primary?.email || emails[0]?.email;
			}
		}

		if (!email) {
			throw new Error('No verified email found on your GitHub profile');
		}

		const name = userData.name || userData.login || email.split('@')[0];

		// Check if user already exists
		const existingUser = await db.findUserByEmail(email);
		const user = existingUser || (await db.createUser(email, 'oauth_github_managed', name));
		if (!user) {
			throw new Error('Failed to create user account');
		}

		// Log audit event
		const orgs = await db.getUserOrgs(user.id);
		if (orgs.length > 0) {
			await db.logAuditEvent(orgs[0].id, user.id, 'user.login_oauth_github', {
				email: user.email,
				githubId: userData.id
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
		console.error('GitHub OAuth error:', err);
		throw redirect(303, '/login?error=' + encodeURIComponent(err.message || 'GitHub OAuth authorization failed'));
	}
};
