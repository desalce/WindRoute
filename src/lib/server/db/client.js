import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

/** @type {MongoClient | null} */
let client = null;

/** @returns {Promise<import('mongodb').Db>} */
export async function getDb() {
	if (!client) {
		client = new MongoClient(MONGODB_URI);
		await client.connect();
	}
	return client.db('windroute');
}
