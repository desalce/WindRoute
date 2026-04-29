import { getDb } from '$lib/server/db/client.js';

export async function load() {
	const db = await getDb();
	const routes = await db.collection('routes').find({}).sort({ createdAt: -1 }).toArray();
	return {
		routes: routes.map((r) => ({
			...r,
			_id: r._id.toString(),
			createdAt: r.createdAt.toISOString()
		}))
	};
}
