import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	getAccessTokenFromServiceAccount,
	refreshOAuthToken,
	fetchFullSearchConsoleReport,
	getDemoSearchConsoleData
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

	const from = url.searchParams.get('from') || '';
	const to = url.searchParams.get('to') || '';
	const searchType = (url.searchParams.get('searchType') || 'web') as 'web' | 'news' | 'discover';

	const connection = await db.getSearchConsoleConnection(site.id);

	// If no connection is configured, return demo/mock data with clear indicator
	if (!connection || (!connection.serviceAccountKey && !connection.oauthAccessToken && !connection.oauthRefreshToken)) {
		const demo = getDemoSearchConsoleData(site.domain, from, to, searchType);
		return json({
			...demo,
			connected: false,
			propertyUrl: connection?.propertyUrl || `sc-domain:${site.domain}`,
			isDemoData: true
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

		// Calculate reasonable dates (GSC typically has a 2-3 day lag)
		let startDate = from;
		let endDate = to;

		if (!startDate || !endDate) {
			const now = new Date();
			const threeDaysAgo = new Date();
			threeDaysAgo.setDate(now.getDate() - 3);
			const thirtyThreeDaysAgo = new Date();
			thirtyThreeDaysAgo.setDate(now.getDate() - 33);

			const fmt = (d: Date) => d.toISOString().split('T')[0];
			startDate = startDate || fmt(thirtyThreeDaysAgo);
			endDate = endDate || fmt(threeDaysAgo);
		}

		const report = await fetchFullSearchConsoleReport(
			accessToken,
			connection.propertyUrl,
			startDate,
			endDate,
			searchType
		);

		await db.updateSearchConsoleSyncStatus(site.id, 'connected', null);

		return json({
			...report,
			connected: true,
			propertyUrl: connection.propertyUrl,
			lastSyncAt: new Date().toISOString(),
			isDemoData: false
		});
	} catch (err: any) {
		console.error('[GSC Fetch Data Error]', err);
		await db.updateSearchConsoleSyncStatus(site.id, 'error', err.message);

		// Graceful fallback to demo data with warning so the dashboard never breaks
		const demo = getDemoSearchConsoleData(site.domain, from, to, searchType);
		return json({
			...demo,
			connected: true,
			propertyUrl: connection.propertyUrl,
			isDemoData: true,
			errorWarning: `Search Console live query error: ${err.message}. Showing simulated data preview.`
		});
	}
};
