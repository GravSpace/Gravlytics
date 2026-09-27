import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

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

	const clientId = process.env.GSC_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw redirect(
			303,
			`/settings/integrations?siteId=${siteId}&error=${encodeURIComponent(
				'Google OAuth Client ID is not configured on the server. Please use Service Account or set GSC_CLIENT_ID in your environment.'
			)}`
		);
	}

	const redirectUri =
		process.env.GSC_REDIRECT_URI || `${url.origin}/api/integrations/search-console/oauth/callback`;

	const state = Buffer.from(
		JSON.stringify({
			siteId: site.id,
			userId: locals.user.id,
			origin: url.origin
		})
	).toString('base64url');

	const scope = encodeURIComponent('https://www.googleapis.com/auth/webmasters.readonly email profile');

	const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
		clientId
	)}&redirect_uri=${encodeURIComponent(
		redirectUri
	)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

	throw redirect(303, authUrl);
};
