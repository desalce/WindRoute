import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';

/** GET /api/routes — alle gespeicherten Routen, neueste zuerst */
export async function GET() {
	try {
		const db = await getDb();
		const routes = await db.collection('routes').find({}).sort({ createdAt: -1 }).toArray();
		return json(routes.map(serializeRoute));
	} catch (err) {
		console.error('GET /api/routes:', err);
		throw error(500, 'Datenbankfehler');
	}
}

/** POST /api/routes — neue Route speichern */
export async function POST({ request }) {
	try {
		const body = await request.json();
		const db = await getDb();
		const doc = { ...body, createdAt: new Date() };
		const result = await db.collection('routes').insertOne(doc);
		return json({ ...serializeRoute(doc), _id: result.insertedId.toString() }, { status: 201 });
	} catch (err) {
		console.error('POST /api/routes:', err);
		throw error(500, 'Route konnte nicht gespeichert werden');
	}
}

/** @param {any} route */
function serializeRoute(route) {
	return { ...route, _id: route._id?.toString() };
}
