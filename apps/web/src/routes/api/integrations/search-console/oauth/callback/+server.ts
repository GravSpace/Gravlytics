import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	exchangeOAuthCode,
	listSearchConsoleProperties
} from '$lib/server/search-console';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');
	const stateParam = url.searchParams.get('state');

	if (error) {
		throw redirect(303, `/settings/integrations?error=${encodeURIComponent(`Google OAuth denied: ${error}`)}`);
	}

	if (!code || !stateParam) {
		throw redirect(303, `/settings/integrations?error=${encodeURIComponent('Missing OAuth authorization code or state')}`);
	}

	let state: { siteId: string; userId: string; origin: string };
	try {
		state = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
	} catch {
		throw redirect(303, `/settings/integrations?error=${encodeURIComponent('Invalid OAuth state parameter')}`);
	}

	const site = await db.getSiteById(state.siteId);
	if (!site) {
		throw redirect(303, `/settings/integrations?error=${encodeURIComponent('Site not found for OAuth flow')}`);
	}

	try {
		const redirectUri =
			process.env.GSC_REDIRECT_URI || `${url.origin}/api/integrations/search-console/oauth/callback`;

		const tokenData = await exchangeOAuthCode(code, redirectUri);

		// Fetch user email using access token
		let userEmail = '';
		try {
			const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: { Authorization: `Bearer ${tokenData.accessToken}` }
			});
			if (userInfoRes.ok) {
				const info = await userInfoRes.json();
				userEmail = info.email || '';
			}
		} catch {}

		// List accessible properties
		let accessibleProperties: any[] = [];
		try {
			accessibleProperties = await listSearchConsoleProperties(tokenData.accessToken);
		} catch (err: any) {
			console.warn('[GSC OAuth Callback] Warning listing properties:', err.message);
		}

		const propertyUrl = accessibleProperties.length > 0 ? accessibleProperties[0].siteUrl : `sc-domain:${site.domain}`;

		const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

		await db.saveSearchConsoleConnection(site.id, {
			authType: 'oauth',
			clientEmail: userEmail || locals?.user?.email || 'OAuth Account',
			oauthAccessToken: tokenData.accessToken,
			oauthRefreshToken: tokenData.refreshToken || null,
			oauthTokenExpiresAt: expiresAt,
			propertyUrl,
			verifiedSites: accessibleProperties,
			lastSyncStatus: 'connected',
			lastError: null
		});

		await db.logAuditEvent(site.orgId, locals?.user?.id || null, 'gsc_oauth_connected', {
			siteId: site.id,
			domain: site.domain,
			propertyUrl
		});

		throw redirect(303, `/settings/integrations?siteId=${site.id}&connected=true`);
	} catch (err: any) {
		if (err.status === 303) throw err;
		console.error('[GSC OAuth Callback Error]', err);
		throw redirect(303, `/settings/integrations?siteId=${state.siteId}&error=${encodeURIComponent(err.message || 'OAuth verification failed')}`);
	}
};
