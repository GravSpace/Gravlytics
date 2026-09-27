import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	getAccessTokenFromServiceAccount,
	refreshOAuthToken,
	listSearchConsoleProperties
} from '$lib/server/search-console';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const siteId = url.searchParams.get('siteId');
	if (!siteId) {
		return json({ error: 'siteId is required' }, { status: 400 });
	}

	const connection = await db.getSearchConsoleConnection(siteId);
	if (!connection) {
		return json({ error: 'No Google Search Console connection found for this site' }, { status: 404 });
	}

	try {
		let accessToken = '';

		if (connection.authType === 'service_account') {
			if (!connection.serviceAccountKey) {
				return json({ error: 'Service account credentials not configured' }, { status: 400 });
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
				return json({ error: 'OAuth tokens missing' }, { status: 400 });
			}
		}

		const properties = await listSearchConsoleProperties(accessToken);

		// Update stored verified sites
		await db.saveSearchConsoleConnection(siteId, {
			authType: connection.authType,
			clientEmail: connection.clientEmail,
			serviceAccountKey: connection.serviceAccountKey,
			oauthAccessToken: connection.oauthAccessToken,
			oauthRefreshToken: connection.oauthRefreshToken,
			propertyUrl: connection.propertyUrl,
			verifiedSites: properties
		});

		return json({ properties });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to list Search Console properties' }, { status: 500 });
	}
};
