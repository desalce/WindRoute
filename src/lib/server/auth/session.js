import { randomBytes } from 'node:crypto';
import { dev } from '$app/environment';
import { getDb } from '$lib/server/db/client.js';

const COOKIE_NAME = 'windroute_session';
const DURATION_DAYS = 30;

/**
 * Neue Session anlegen, Token in MongoDB speichern und zurückgeben.
 * @param {import('mongodb').ObjectId} userId
 * @returns {Promise<string>} Session-Token (base64url, 32 Byte Entropie)
 */
export async function createSession(userId) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + DURATION_DAYS * 86_400_000);
	const db = await getDb();
	await db.collection('sessions').insertOne(/** @type {any} */ ({ _id: token, userId, expiresAt }));
	return token;
}

/**
 * Token validieren und zugehörigen User zurückgeben.
 * Abgelaufene Sessions werden automatisch gelöscht.
 * @param {string} token
 * @returns {Promise<{userId: import('mongodb').ObjectId, email: string, displayName: string | null} | null>}
 */
export async function validateSession(token) {
	const db = await getDb();
	// Cast nötig weil MongoDB-Typen _id standardmässig als ObjectId erwarten
	const session = await db.collection('sessions').findOne(/** @type {any} */ ({ _id: token }));

	if (!session) return null;

	if (session.expiresAt < new Date()) {
		await db.collection('sessions').deleteOne(/** @type {any} */ ({ _id: token }));
		return null;
	}

	const user = await db.collection('users').findOne({ _id: session.userId });
	if (!user) return null;

	return {
		userId: user._id,
		email: user.email,
		displayName: user.displayName ?? null
	};
}

/**
 * Session aus DB entfernen (Logout).
 * @param {string} token
 */
export async function deleteSession(token) {
	const db = await getDb();
	await db.collection('sessions').deleteOne(/** @type {any} */ ({ _id: token }));
}

/**
 * Session-Cookie setzen.
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} token
 */
export function setSessionCookie(cookies, token) {
	cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: !dev, // in Produktion nur über HTTPS
		sameSite: 'lax',
		path: '/',
		maxAge: DURATION_DAYS * 86_400
	});
}

/**
 * Session-Cookie löschen.
 * @param {import('@sveltejs/kit').Cookies} cookies
 */
export function clearSessionCookie(cookies) {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export { COOKIE_NAME };
