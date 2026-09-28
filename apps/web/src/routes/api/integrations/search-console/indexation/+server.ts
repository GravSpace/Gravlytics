import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	getAccessTokenFromServiceAccount,
	refreshOAuthToken,
	fetchIndexationOverview
} from '$lib/server/search-console';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const siteId = url.searchParams.get('siteId');
	if (!siteId) {
		return json({ error: 'siteId is required' }, { status: 400 });
	}

	const site = await db.getSiteById(siteId);
	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const connection = await db.getSearchConsoleConnection(site.id);

	if (!connection || (!connection.serviceAccountKey && !connection.oauthAccessToken && !connection.oauthRefreshToken)) {
		return json({
			totalUrlsIndexed: 0,
			totalUrlsInGoogleSearch: 0,
			totalUrlsInGoogleNews: 0,
			totalExcludedOrPending: 0,
			urls: [],
			connected: false,
			propertyUrl: connection?.propertyUrl || `sc-domain:${site.domain}`,
			isDemoData: false
		});
	}

	try {
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

		const now = new Date();
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(now.getDate() - 30);
		const threeDaysAgo = new Date();
		threeDaysAgo.setDate(now.getDate() - 3);

		const fmt = (d: Date) => d.toISOString().split('T')[0];

		const overview = await fetchIndexationOverview(
			accessToken,
			connection.propertyUrl,
			site.domain,
			fmt(thirtyDaysAgo),
			fmt(threeDaysAgo)
		);

		return json({
			...overview,
			connected: true,
			propertyUrl: connection.propertyUrl,
			isDemoData: false
		});
	} catch (err: any) {
		console.error('[GSC Indexation Error]', err);
		return json({
			totalUrlsIndexed: 0,
			totalUrlsInGoogleSearch: 0,
			totalUrlsInGoogleNews: 0,
			totalExcludedOrPending: 0,
			urls: [],
			connected: true,
			propertyUrl: connection.propertyUrl,
			isDemoData: false,
			errorWarning: `Indexation query error: ${err.message}`
		});
	}
};
