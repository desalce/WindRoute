import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { ObjectId } from 'mongodb';

/** GET /api/routes/[id] — einzelne Route */
export async function GET({ params }) {
	const id = parseId(params.id);
	const db = await getDb();
	const route = await db.collection('routes').findOne({ _id: id });
	if (!route) throw error(404, 'Route nicht gefunden');
	return json({ ...route, _id: route._id.toString() });
}

/** DELETE /api/routes/[id] — Route löschen */
export async function DELETE({ params }) {
	const id = parseId(params.id);
	const db = await getDb();
	const result = await db.collection('routes').deleteOne({ _id: id });
	if (result.deletedCount === 0) throw error(404, 'Route nicht gefunden');
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
