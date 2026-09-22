import { json, type RequestEvent } from '@sveltejs/kit';
import { db, type ApiKey, type Site } from './db';

export interface AuthResult {
	apiKey: ApiKey;
	site: Site;
	targetSiteId: string;
}

export async function authenticateExternalApi(
	event: RequestEvent,
	requiredScope: 'read' | 'write' | 'all' = 'read'
): Promise<{ auth?: AuthResult; errorResponse?: Response }> {
	const authHeader = event.request.headers.get('authorization') || '';
	const xApiKey = event.request.headers.get('x-api-key') || '';
	const queryKey = event.url.searchParams.get('api_key') || '';

	let rawKey = '';
	if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
		rawKey = authHeader.substring(7).trim();
	} else if (authHeader) {
		rawKey = authHeader.trim();
	} else if (xApiKey) {
		rawKey = xApiKey.trim();
	} else if (queryKey) {
		rawKey = queryKey.trim();
	}

	if (!rawKey) {
		return {
			errorResponse: json(
				{
					error: 'Unauthorized: API key required.',
					hint: 'Include your API Key in the "Authorization: Bearer <API_KEY>" or "X-API-Key: <API_KEY>" header.',
					docs: '/docs#api-external'
				},
				{ status: 401 }
			)
		};
	}

	const validated = await db.validateApiKey(rawKey);
	if (!validated) {
		return {
			errorResponse: json(
				{
					error: 'Forbidden: Invalid or revoked API key.',
					docs: '/docs#api-external'
				},
				{ status: 403 }
			)
		};
	}

	// Scope validation
	if (
		requiredScope !== 'read' &&
		validated.apiKey.scope !== 'all' &&
		validated.apiKey.scope !== requiredScope
	) {
		return {
			errorResponse: json(
				{
					error: `Forbidden: API key lacks '${requiredScope}' permission. Current scope: '${validated.apiKey.scope}'`,
					docs: '/docs#api-external'
				},
				{ status: 403 }
			)
		};
	}

	// Determine target site ID (default to site bound to API key, or overridden by site_id query param if valid)
	let targetSiteId = validated.site.trackingId || validated.site.id;
	const requestedSiteId = event.url.searchParams.get('site_id');
	if (requestedSiteId) {
		const targetSite = await db.getSiteByTrackingId(requestedSiteId) || await db.getSiteById(requestedSiteId);
		if (targetSite) {
			targetSiteId = targetSite.trackingId || targetSite.id;
		} else {
			targetSiteId = requestedSiteId;
		}
	}

	return {
		auth: {
			apiKey: validated.apiKey,
			site: validated.site,
			targetSiteId
		}
	};
}
