import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { testSearchConsoleAccess } from '$lib/server/search-console';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			siteId,
			authType = 'service_account',
			serviceAccountKey,
			propertyUrl,
			oauthAccessToken,
			oauthRefreshToken
		} = body;

		let finalKey = serviceAccountKey;
		let finalPropertyUrl = propertyUrl;

		// If no raw key passed in body, try loading from saved connection if siteId given
		if (!finalKey && siteId) {
			const saved = await db.getSearchConsoleConnection(siteId);
			if (saved) {
				finalKey = saved.serviceAccountKey;
				finalPropertyUrl = finalPropertyUrl || saved.propertyUrl;
			}
		}

		if (authType === 'service_account' && !finalKey) {
			return json({ error: 'Service account JSON key is required for testing' }, { status: 400 });
		}

		const keyStr = typeof finalKey === 'object' ? JSON.stringify(finalKey) : finalKey;

		const result = await testSearchConsoleAccess(
			{
				authType,
				serviceAccountKey: keyStr,
				oauthAccessToken,
				oauthRefreshToken
			},
			finalPropertyUrl || ''
		);

		return json({
			success: result.success,
			message: result.message,
			accessibleProperties: result.accessibleProperties
		});
	} catch (err: any) {
		console.error('[GSC Test Error]', err);
		return json({
			success: false,
			error: err.message || 'Connection test failed',
			message: err.message || 'Connection test failed'
		}, { status: 400 });
	}
};
