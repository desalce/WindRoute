import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { ObjectId } from 'mongodb';

/** @typedef {import('$lib/models/route.js').Route} Route */

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const db = await getDb();
	const raw = await db
		.collection('routes')
		.find({ userId: locals.user.userId })
		.sort({ createdAt: -1 })
		.toArray();

	/** @type {Route[]} */
	const routes = raw.map((r) => ({
		.../** @type {any} */ (r),
		_id: r._id.toString(),
		userId: r.userId instanceof ObjectId ? r.userId.toString() : r.userId,
		createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt
	}));

	return { routes };
}
