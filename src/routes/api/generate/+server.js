import { json, error } from '@sveltejs/kit';
import { generateRoundTrip } from '$lib/server/services/routing.js';

/**
 * POST /api/generate
 * Body: { lat, lng, distanceKm, sport, windHeadingDeg }
 * Response: { routes: [RouteData, RouteData?] }
 */
export async function POST({ request }) {
	const body = await request.json().catch(() => null);
	if (!body) throw error(400, 'Ungültiger Request-Body');

	const { lat, lng, distanceKm, sport, windHeadingDeg } = body;

	if (
		typeof lat !== 'number' ||
		typeof lng !== 'number' ||
		typeof distanceKm !== 'number' ||
		!['road', 'gravel'].includes(sport) ||
		typeof windHeadingDeg !== 'number'
	) {
		throw error(400, 'Fehlende oder ungültige Parameter');
	}

	try {
		// Zwei Routen parallel anfragen (seed 0 und 1)
		const results = await Promise.allSettled([
			generateRoundTrip({ lat, lng, distanceKm, sport, windHeadingDeg, seed: 0 }),
			generateRoundTrip({ lat, lng, distanceKm, sport, windHeadingDeg, seed: 1 })
		]);

		const routes = results
			.filter((r) => r.status === 'fulfilled')
			.map((r) => /** @type {PromiseFulfilledResult<any>} */ (r).value);

		if (routes.length === 0) {
			const firstError = results.find((r) => r.status === 'rejected');
			const msg = firstError?.status === 'rejected' ? firstError.reason?.message : 'Unbekannter Fehler';
			throw error(502, msg || 'GraphHopper konnte keine Route berechnen');
		}

		return json({ routes });
	} catch (err) {
		if (err && /** @type {any} */ (err).status) throw err;
		console.error('Routing-Fehler:', err);
		throw error(502, 'Routing-Service nicht verfügbar');
	}
}
