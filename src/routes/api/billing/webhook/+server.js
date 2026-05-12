import { error } from '@sveltejs/kit';
import { getStripe } from '$lib/server/billing/stripe.js';
import { getDb } from '$lib/server/db/client.js';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { ObjectId } from 'mongodb';

/**
 * POST /api/billing/webhook — Stripe-Webhook-Handler
 *
 * Behandelte Events:
 *   checkout.session.completed   → User auf Pro setzen
 *   customer.subscription.updated → Status & PeriodEnd aktualisieren
 *   customer.subscription.deleted → User auf Free zurücksetzen
 */
export async function POST({ request }) {
	const rawBody = await request.text();
	const sig = request.headers.get('stripe-signature');

	if (!sig) throw error(400, 'Fehlende Stripe-Signatur');

	let event;
	try {
		event = getStripe().webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('Webhook-Signatur ungültig:', err);
		throw error(400, 'Ungültige Signatur');
	}

	const db = await getDb();

	// Idempotenz: bereits verarbeitete Events überspringen
	const alreadyProcessed = await db
		.collection('processedWebhookEvents')
		.findOne({ stripeEventId: event.id });
	if (alreadyProcessed) {
		return new Response(null, { status: 200 });
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = /** @type {any} */ (event.data.object);
				const userId = session.metadata?.userId;
				if (!userId) break;

				await db.collection('users').updateOne(
					{ _id: new ObjectId(userId) },
					{
						$set: {
							plan: 'pro',
							stripeCustomerId: session.customer,
							stripeSubscriptionId: session.subscription,
							subscriptionStatus: 'active'
						}
					}
				);
				console.log(`checkout.session.completed: userId=${userId} → Pro`);
				break;
			}

			case 'customer.subscription.updated': {
				const sub = /** @type {any} */ (event.data.object);
				const periodEnd = sub.current_period_end
					? new Date(sub.current_period_end * 1000)
					: null;

				// Abo ist aktiv oder läuft noch bis PeriodEnd (cancel_at_period_end)
				const isPro =
					sub.status === 'active' ||
					(sub.status === 'active' && sub.cancel_at_period_end);

				await db.collection('users').updateOne(
					{ stripeSubscriptionId: sub.id },
					{
						$set: {
							plan: isPro ? 'pro' : 'free',
							subscriptionStatus: sub.status,
							subscriptionCurrentPeriodEnd: periodEnd
						}
					}
				);
				console.log(`customer.subscription.updated: subId=${sub.id} status=${sub.status}`);
				break;
			}

			case 'customer.subscription.deleted': {
				const sub = /** @type {any} */ (event.data.object);
				await db.collection('users').updateOne(
					{ stripeSubscriptionId: sub.id },
					{
						$set: {
							plan: 'free',
							subscriptionStatus: 'canceled',
							subscriptionCurrentPeriodEnd: null
						}
					}
				);
				console.log(`customer.subscription.deleted: subId=${sub.id} → Free`);
				break;
			}

			default:
				break;
		}

		// Event als verarbeitet markieren
		await db
			.collection('processedWebhookEvents')
			.insertOne({ stripeEventId: event.id, processedAt: new Date() });
	} catch (err) {
		console.error(`Webhook-Verarbeitung fehlgeschlagen (${event.type}):`, err);
		// 500 zurückgeben damit Stripe es erneut versucht
		throw error(500, 'Webhook-Verarbeitung fehlgeschlagen');
	}

	return new Response(null, { status: 200 });
}
