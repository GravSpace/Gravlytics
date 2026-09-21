import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('gravlytics_token', { path: '/' });
	throw redirect(303, '/login');
};

export const GET: RequestHandler = async ({ cookies }) => {
	cookies.delete('gravlytics_token', { path: '/' });
	throw redirect(303, '/login');
};
