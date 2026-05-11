import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { hashPassword } from '$lib/server/auth/password.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (locals.user) redirect(302, '/routes');
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();
		const password = String(data.get('password') ?? '');
		const displayName = String(data.get('displayName') ?? '').trim();

		// Einfache Validierung
		if (!email || !password) {
			return fail(400, { error: 'Bitte alle Pflichtfelder ausfüllen.', email, displayName });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, { error: 'Bitte eine gültige E-Mail-Adresse eingeben.', email, displayName });
		}

		if (password.length < 8) {
			return fail(400, {
				error: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
				email,
				displayName
			});
		}

		const db = await getDb();

		const existing = await db.collection('users').findOne({ email });
		if (existing) {
			return fail(409, { error: 'Diese E-Mail-Adresse ist bereits registriert.', email, displayName });
		}

		const passwordHash = await hashPassword(password);
		const result = await db.collection('users').insertOne({
			email,
			passwordHash,
			displayName: displayName || null,
			createdAt: new Date()
		});

		const token = await createSession(result.insertedId);
		setSessionCookie(cookies, token);
		redirect(302, '/routes');
	}
};
