import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Passwort hashen.
 * @param {string} plain
 * @returns {Promise<string>}
 */
export async function hashPassword(plain) {
	return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Klartext-Passwort gegen gespeicherten Hash prüfen.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plain, hash) {
	return bcrypt.compare(plain, hash);
}
