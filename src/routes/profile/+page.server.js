import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { getStripe } from '$lib/server/billing/stripe.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url }) {
	if (!locals.user) redirect(302, '/login');

	const db = await getDb();

	// Fallback-Sync: Wenn Stripe nach Checkout hierher leitet, Plan direkt abgleichen.
	// Das stellt sicher, dass der Plan gesetzt ist, auch wenn der Webhook verzögert ankommt.
	const sessionId = url.searchParams.get('session_id');
	if (sessionId) {
		try {
			const stripe = getStripe();
			const session = await stripe.checkout.sessions.retrieve(sessionId);

			if (session.payment_status === 'paid' && session.customer && session.subscription) {
				await db.collection('users').updateOne(
					{ _id: locals.user.userId },
					{
						$set: {
							plan: 'pro',
							stripeCustomerId: session.customer,
							stripeSubscriptionId: session.subscription,
							subscriptionStatus: 'active'
						}
					}
				);
			}
		} catch (err) {
			console.error('Session-Sync fehlgeschlagen:', err);
		}
	}

	const user = await db.collection('users').findOne({ _id: locals.user.userId });

	return {
		email: locals.user.email,
		displayName: locals.user.displayName,
		plan: /** @type {'free' | 'pro'} */ (user?.plan ?? 'free'),
		subscriptionStatus: /** @type {string | null} */ (user?.subscriptionStatus ?? null),
		subscriptionCurrentPeriodEnd:
			user?.subscriptionCurrentPeriodEnd instanceof Date
				? user.subscriptionCurrentPeriodEnd.toISOString()
				: null
	};
}
