import { COOKIE_NAME, validateSession } from '$lib/server/auth/session.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const token = event.cookies.get(COOKIE_NAME);

	if (token) {
		const user = await validateSession(token);
		event.locals.user = user;
	} else {
		event.locals.user = null;
	}

	return resolve(event);
}
