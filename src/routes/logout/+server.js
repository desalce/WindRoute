import { redirect } from '@sveltejs/kit';
import { COOKIE_NAME, deleteSession, clearSessionCookie } from '$lib/server/auth/session.js';

/** POST /logout — Session löschen und zur Startseite weiterleiten */
export async function POST({ cookies }) {
	const token = cookies.get(COOKIE_NAME);
	if (token) {
		await deleteSession(token);
	}
	clearSessionCookie(cookies);
	redirect(302, '/');
}
