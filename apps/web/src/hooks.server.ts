import { redirect, type Handle } from '@sveltejs/kit';
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

	const path = event.url.pathname;
	const isAuthRoute = path === '/login' || path === '/register';
	const isPublicRoute = isAuthRoute || path.startsWith('/share') || path.startsWith('/invite');
	const isApiRoute = path.startsWith('/api');
	const isStaticAsset = path.startsWith('/_app') || path.startsWith('/favicon') || path.includes('.');

	// Redirect authenticated users away from login/register
	if (isAuthRoute && event.locals.user) {
		throw redirect(303, '/');
	}

	// Protect dashboard and internal routes
	if (!isPublicRoute && !isApiRoute && !isStaticAsset && path !== '/logout') {
		if (!event.locals.user) {
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};

export const handleError = ({ error }: { error: any }) => {
	console.error('[hooks:handleError]', error);
	return {
		message: error?.message || 'Internal Error'
	};
};
