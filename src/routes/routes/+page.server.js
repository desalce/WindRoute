import { getDb } from '$lib/server/db/client.js';

/** @typedef {import('$lib/models/route.js').Route} Route */

export async function load() {
	const db = await getDb();
	const raw = await db.collection('routes').find({}).sort({ createdAt: -1 }).toArray();

	/** @type {Route[]} */
	const routes = raw.map((r) => ({
		.../** @type {any} */ (r),
		_id: r._id.toString(),
		createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt
	}));

	return { routes };
}
