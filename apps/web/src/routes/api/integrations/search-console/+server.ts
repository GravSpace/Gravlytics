import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	testSearchConsoleAccess,
	listSearchConsoleProperties,
	getAccessTokenFromServiceAccount
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

	if (!connection) {
		return json({
			connected: false,
			siteDomain: site.domain,
			siteName: site.name,
			suggestedPropertyUrl: `sc-domain:${site.domain}`
		});
	}

	return json({
		connected: true,
		id: connection.id,
		siteId: connection.siteId,
		siteDomain: site.domain,
		authType: connection.authType,
		clientEmail: connection.clientEmail,
		propertyUrl: connection.propertyUrl,
		verifiedSites: connection.verifiedSites || [],
		lastSyncAt: connection.lastSyncAt,
		lastSyncStatus: connection.lastSyncStatus,
		lastError: connection.lastError,
		hasServiceAccountKey: Boolean(connection.serviceAccountKey),
		hasOAuthToken: Boolean(connection.oauthAccessToken || connection.oauthRefreshToken)
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			siteId,
			authType = 'service_account',
			clientEmail,
			serviceAccountKey,
			propertyUrl,
			oauthAccessToken,
			oauthRefreshToken
		} = body;

		if (!siteId) {
			return json({ error: 'siteId is required' }, { status: 400 });
		}

		const site = await db.getSiteById(siteId);
		if (!site) {
			return json({ error: 'Site not found' }, { status: 404 });
		}

		let finalClientEmail = clientEmail?.trim() || '';
		let verifiedProperties: any[] = [];
		let parsedKeyObj: any = null;

		// 1. Process Service Account if chosen
		if (authType === 'service_account') {
			if (!serviceAccountKey) {
				return json({ error: 'Service account JSON key is required' }, { status: 400 });
			}

			try {
				parsedKeyObj = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
			} catch {
				return json({ error: 'Invalid JSON format in Service Account Key' }, { status: 400 });
			}

			if (!parsedKeyObj.client_email || !parsedKeyObj.private_key) {
				return json(
					{ error: 'Service account JSON is missing client_email or private_key fields' },
					{ status: 400 }
				);
			}

			finalClientEmail = parsedKeyObj.client_email;

			// Verify connection with Google Search Console API
			try {
				const testResult = await testSearchConsoleAccess(
					{
						authType: 'service_account',
						serviceAccountKey: typeof serviceAccountKey === 'string' ? serviceAccountKey : JSON.stringify(serviceAccountKey)
					},
					propertyUrl || `sc-domain:${site.domain}`
				);
				verifiedProperties = testResult.accessibleProperties;
			} catch (testErr: any) {
				console.warn('[GSC Connect] Warning on initial connection verification:', testErr.message);
			}
		}

		// 2. Determine target property URL
		const targetPropertyUrl = propertyUrl?.trim() || (verifiedProperties.length > 0 ? verifiedProperties[0].siteUrl : `sc-domain:${site.domain}`);

		// 3. Save connection to Database
		const saved = await db.saveSearchConsoleConnection(site.id, {
			authType,
			clientEmail: finalClientEmail,
			serviceAccountKey: serviceAccountKey ? (typeof serviceAccountKey === 'string' ? serviceAccountKey : JSON.stringify(serviceAccountKey)) : null,
			oauthAccessToken: oauthAccessToken || null,
			oauthRefreshToken: oauthRefreshToken || null,
			propertyUrl: targetPropertyUrl,
			verifiedSites: verifiedProperties,
			lastSyncStatus: 'connected',
			lastError: null
		});

		// 4. Record audit log
		await db.logAuditEvent(site.orgId, locals.user.id, 'gsc_connected', {
			siteId: site.id,
			domain: site.domain,
			propertyUrl: targetPropertyUrl,
			authType,
			clientEmail: finalClientEmail
		});

		return json({
			success: true,
			message: 'Google Search Console connected successfully!',
			connection: {
				id: saved.id,
				siteId: saved.siteId,
				authType: saved.authType,
				clientEmail: saved.clientEmail,
				propertyUrl: saved.propertyUrl,
				verifiedSites: saved.verifiedSites,
				lastSyncAt: saved.lastSyncAt,
				lastSyncStatus: saved.lastSyncStatus
			},
			accessibleProperties: verifiedProperties
		});
	} catch (err: any) {
		console.error('[GSC Save Error]', err);
		return json({ error: err.message || 'Failed to connect Google Search Console' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
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

	await db.deleteSearchConsoleConnection(site.id);

	await db.logAuditEvent(site.orgId, locals.user.id, 'gsc_disconnected', {
		siteId: site.id,
		domain: site.domain
	});

	return json({ success: true, message: 'Google Search Console disconnected successfully' });
};
