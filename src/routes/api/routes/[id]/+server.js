import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { ObjectId } from 'mongodb';

/** GET /api/routes/[id] — einzelne Route (nur eigene) */
export async function GET({ params, locals }) {
	if (!locals.user) throw error(401, 'Nicht angemeldet');

	const id = parseId(params.id);
	const db = await getDb();
	const route = await db.collection('routes').findOne({ _id: id });

	if (!route) throw error(404, 'Route nicht gefunden');
	if (!route.userId?.equals(locals.user.userId)) throw error(403, 'Zugriff verweigert');

	return json({ ...route, _id: route._id.toString(), userId: route.userId.toString() });
}

/** DELETE /api/routes/[id] — Route löschen (nur eigene) */
export async function DELETE({ params, locals }) {
	if (!locals.user) throw error(401, 'Nicht angemeldet');

	const id = parseId(params.id);
	const db = await getDb();

	const route = await db.collection('routes').findOne({ _id: id });
	if (!route) throw error(404, 'Route nicht gefunden');
	if (!route.userId?.equals(locals.user.userId)) throw error(403, 'Zugriff verweigert');

	await db.collection('routes').deleteOne({ _id: id });
	return new Response(null, { status: 204 });
}

/** @param {string} raw */
function parseId(raw) {
	try {
		return new ObjectId(raw);
	} catch {
		throw error(400, 'Ungültige Route-ID');
	}
}
