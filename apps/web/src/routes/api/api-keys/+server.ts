import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const apiKeys = await db.getApiKeysForUser(locals.user.id);
		return json({ apiKeys });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to fetch API keys' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { name, scope = 'all', siteId } = body;

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Key name is required' }, { status: 400 });
		}

		const result = await db.createApiKeyForUser(locals.user.id, name, scope, siteId);
		return json({
			success: true,
			apiKey: result.apiKey,
			rawKey: result.rawKey
		});
	} catch (err: any) {
		return json({ error: err.message || 'Failed to generate API key' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ error: 'Key ID is required' }, { status: 400 });
		}

		const success = await db.revokeApiKeyForUser(locals.user.id, id);
		if (!success) {
			return json({ error: 'API key not found or already revoked' }, { status: 404 });
		}

		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to revoke API key' }, { status: 500 });
	}
};
