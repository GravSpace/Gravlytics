import type { Handle } from '@sveltejs/kit';
import { verifyJWT } from '$lib/server/crypto';
import { db } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('gravlytics_token');

	if (token) {
		const payload = verifyJWT(token);
		if (payload && payload.userId) {
			const user = await db.findUserById(payload.userId);
			if (user) {
				event.locals.user = user;
			}
		}
	}

	return resolve(event);
};
