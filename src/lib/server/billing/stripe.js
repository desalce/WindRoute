import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

/** @type {Stripe | null} */
let client = null;

/** @returns {Stripe} */
export function getStripe() {
	if (!client) {
		client = new Stripe(STRIPE_SECRET_KEY);
	}
	return client;
}
