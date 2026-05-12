import { json, error } from '@sveltejs/kit';
import { getStripe } from '$lib/server/billing/stripe.js';
import { getDb } from '$lib/server/db/client.js';
import { APP_URL } from '$env/static/private';

/** POST /api/billing/portal — Stripe Customer Portal Session erstellen */
export async function POST({ locals }) {
	if (!locals.user) throw error(401, 'Nicht angemeldet');

	const db = await getDb();
	const user = await db.collection('users').findOne({ _id: locals.user.userId });
	if (!user?.stripeCustomerId) {
		throw error(400, 'Kein aktives Abo vorhanden.');
	}

	try {
		const stripe = getStripe();
		const session = await stripe.billingPortal.sessions.create({
			customer: user.stripeCustomerId,
			return_url: `${APP_URL}/profile`
		});
		return json({ url: session.url });
	} catch (err) {
		console.error('POST /api/billing/portal:', err);
		throw error(500, 'Abo-Verwaltung konnte nicht geöffnet werden');
	}
}
