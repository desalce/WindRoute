import { json, error } from '@sveltejs/kit';
import { getStripe } from '$lib/server/billing/stripe.js';
import { getDb } from '$lib/server/db/client.js';
import { STRIPE_PRICE_ID, APP_URL } from '$env/static/private';

/** POST /api/billing/checkout — Stripe-Checkout-Session erstellen und URL zurückgeben */
export async function POST({ locals }) {
	if (!locals.user) throw error(401, 'Nicht angemeldet');

	const db = await getDb();
	const user = await db.collection('users').findOne({ _id: locals.user.userId });
	if (!user) throw error(401, 'Nicht angemeldet');

	// Bereits Pro → kein neues Checkout nötig
	if (user.plan === 'pro' && user.subscriptionStatus === 'active') {
		throw error(400, 'Du hast bereits ein aktives Pro-Abo.');
	}

	try {
		const stripe = getStripe();

		const sessionParams = {
			mode: /** @type {'subscription'} */ ('subscription'),
			line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
			success_url: `${APP_URL}/profile?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${APP_URL}/profile`,
			locale: /** @type {'de'} */ ('de'),
			allow_promotion_codes: true,
			metadata: { userId: locals.user.userId.toString() }
		};

		// Existierenden Stripe-Customer wiederverwenden, sonst E-Mail vorausfüllen
		if (user.stripeCustomerId) {
			/** @type {any} */ (sessionParams).customer = user.stripeCustomerId;
		} else {
			/** @type {any} */ (sessionParams).customer_email = locals.user.email;
		}

		const session = await stripe.checkout.sessions.create(/** @type {any} */ (sessionParams));

		return json({ url: session.url });
	} catch (err) {
		console.error('POST /api/billing/checkout:', err);
		throw error(500, 'Checkout konnte nicht erstellt werden');
	}
}
