import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { verifyPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	// Bereits eingeloggte User direkt weiterleiten
	if (locals.user) redirect(302, '/routes');
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Bitte alle Felder ausfüllen.', email });
		}

		const db = await getDb();
		const user = await db.collection('users').findOne({ email });

		// Gleiche Fehlermeldung für "User nicht gefunden" und "falsches Passwort"
		// um User-Enumeration zu verhindern
		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(401, { error: 'E-Mail oder Passwort falsch.', email });
		}

		const token = await createSession(user._id);
		setSessionCookie(cookies, token);
		redirect(302, '/routes');
	}
};
