import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	getAccessTokenFromServiceAccount,
	refreshOAuthToken,
	listSitemaps,
	submitSitemap,
	deleteSitemap,
	getDemoSitemapsData
} from '$lib/server/search-console';

async function getValidAccessToken(connection: any): Promise<string> {
	if (connection.authType === 'service_account') {
		if (!connection.serviceAccountKey) {
			throw new Error('Service account key is empty');
		}
		const key = JSON.parse(connection.serviceAccountKey);
		const tokenRes = await getAccessTokenFromServiceAccount(key);
		return tokenRes.token;
	} else {
		if (connection.oauthAccessToken) {
			return connection.oauthAccessToken;
		} else if (connection.oauthRefreshToken) {
			const refreshed = await refreshOAuthToken(connection.oauthRefreshToken);
			return refreshed.accessToken;
		} else {
			throw new Error('OAuth token missing');
		}
	}
}

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
		const demo = getDemoSitemapsData(site.domain);
		return json({
			sitemaps: demo,
			connected: false,
			propertyUrl: connection?.propertyUrl || `sc-domain:${site.domain}`,
			isDemoData: true
		});
	}

	try {
		const token = await getValidAccessToken(connection);
		const sitemaps = await listSitemaps(token, connection.propertyUrl);

		return json({
			sitemaps,
			connected: true,
			propertyUrl: connection.propertyUrl,
			isDemoData: false
		});
	} catch (err: any) {
		console.error('[GSC Sitemaps List Error]', err);
		const demo = getDemoSitemapsData(site.domain);
		return json({
			sitemaps: demo,
			connected: true,
			propertyUrl: connection.propertyUrl,
			isDemoData: true,
			errorWarning: `Sitemaps API warning: ${err.message}. Showing simulated sitemap data.`
		});
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { siteId, feedpath } = body;

		if (!siteId || !feedpath) {
			return json({ error: 'siteId and feedpath are required' }, { status: 400 });
		}

		const site = await db.getSiteById(siteId);
		if (!site) {
			return json({ error: 'Site not found' }, { status: 404 });
		}

		const connection = await db.getSearchConsoleConnection(site.id);
		if (!connection) {
			return json({ success: true, isDemoData: true, message: 'Simulated sitemap submission' });
		}

		const token = await getValidAccessToken(connection);
		await submitSitemap(token, connection.propertyUrl, feedpath);

		return json({ success: true, message: 'Sitemap submitted successfully' });
	} catch (err: any) {
		console.error('[GSC Sitemap Submit Error]', err);
		return json({ error: err.message || 'Failed to submit sitemap' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { siteId, feedpath } = body;

		if (!siteId || !feedpath) {
			return json({ error: 'siteId and feedpath are required' }, { status: 400 });
		}

		const site = await db.getSiteById(siteId);
		if (!site) {
			return json({ error: 'Site not found' }, { status: 404 });
		}

		const connection = await db.getSearchConsoleConnection(site.id);
		if (!connection) {
			return json({ success: true, isDemoData: true });
		}

		const token = await getValidAccessToken(connection);
		await deleteSitemap(token, connection.propertyUrl, feedpath);

		return json({ success: true, message: 'Sitemap deleted successfully' });
	} catch (err: any) {
		console.error('[GSC Sitemap Delete Error]', err);
		return json({ error: err.message || 'Failed to delete sitemap' }, { status: 500 });
	}
};
