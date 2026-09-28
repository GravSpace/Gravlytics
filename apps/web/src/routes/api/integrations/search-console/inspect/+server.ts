import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	getAccessTokenFromServiceAccount,
	refreshOAuthToken,
	inspectUrl
} from '$lib/server/search-console';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { siteId, inspectionUrl } = body;

		if (!siteId) {
			return json({ error: 'siteId is required' }, { status: 400 });
		}
		if (!inspectionUrl) {
			return json({ error: 'inspectionUrl is required' }, { status: 400 });
		}

		const site = await db.getSiteById(siteId);
		if (!site) {
			return json({ error: 'Site not found' }, { status: 404 });
		}

		const connection = await db.getSearchConsoleConnection(site.id);

		if (!connection || (!connection.serviceAccountKey && !connection.oauthAccessToken && !connection.oauthRefreshToken)) {
			return json(
				{ error: 'Google Search Console belum terhubung. Hubungkan akun di Settings > Integrations untuk melakukan Live URL Inspection Googlebot.' },
				{ status: 400 }
			);
		}

		let accessToken = '';

		if (connection.authType === 'service_account') {
			if (!connection.serviceAccountKey) {
				throw new Error('Service account key is empty');
			}
			const key = JSON.parse(connection.serviceAccountKey);
			const tokenRes = await getAccessTokenFromServiceAccount(key);
			accessToken = tokenRes.token;
		} else {
			if (connection.oauthAccessToken) {
				accessToken = connection.oauthAccessToken;
			} else if (connection.oauthRefreshToken) {
				const refreshed = await refreshOAuthToken(connection.oauthRefreshToken);
				accessToken = refreshed.accessToken;
			} else {
				throw new Error('OAuth token missing');
			}
		}

		const result = await inspectUrl(accessToken, connection.propertyUrl, inspectionUrl);

		return json({
			...result,
			isDemoData: false
		});
	} catch (err: any) {
		console.error('[GSC Inspect Error]', err);
		return json({ error: err.message || 'Failed to inspect URL' }, { status: 500 });
	}
};
