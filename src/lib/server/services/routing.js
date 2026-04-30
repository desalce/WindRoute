import { GRAPHHOPPER_API_KEY } from '$env/static/private';

const GH_BASE = 'https://graphhopper.com/api/1/route';

/**
 * Berechnet eine Rund-Route via GraphHopper `round_trip`.
 *
 * @param {{
 *   lat: number,
 *   lng: number,
 *   distanceKm: number,
 *   sport: 'road' | 'gravel',
 *   windHeadingDeg: number,
 *   seed?: number
 * }} opts
 * @returns {Promise<{
 *   geometry: import('$lib/models/route.js').GeoJsonLineString,
 *   actualDistanceKm: number,
 *   elevationGainM: number,
 *   durationMin: number,
 *   tailwindPercent: number
 * }>}
 */
export async function generateRoundTrip({ lat, lng, distanceKm, sport, windHeadingDeg, seed = 0 }) {
	const vehicle = 'bike'; // Free Tier unterstützt nur car, bike, foot

	const params = new URLSearchParams({
		key: GRAPHHOPPER_API_KEY,
		'point': `${lat},${lng}`,
		algorithm: 'round_trip',
		'point.round_trip.distance': String(distanceKm * 1000),
		'point.round_trip.heading': String(windHeadingDeg),
		'point.round_trip.seed': String(seed),
		vehicle,
		locale: 'de',
		points_encoded: 'false'
	});

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000);

	let data;
	try {
		const res = await fetch(`${GH_BASE}?${params}`, { signal: controller.signal });
		data = await res.json();
		if (!res.ok) {
			const msg = data?.message || `GraphHopper HTTP ${res.status}`;
			throw new Error(msg);
		}
	} finally {
		clearTimeout(timeout);
	}

	const path = data.paths?.[0];
	if (!path) throw new Error('GraphHopper hat keine Route zurückgegeben');

	const coords = path.points.coordinates; // [[lng, lat], ...]
	const actualDistanceKm = Math.round((path.distance / 1000) * 10) / 10;
	const elevationGainM = Math.round(path.ascend ?? 0);
	const durationMin = Math.round(path.time / 60000);
	const tailwindPercent = calcTailwindPercent(coords, windHeadingDeg);

	return {
		geometry: { type: 'LineString', coordinates: coords },
		actualDistanceKm,
		elevationGainM,
		durationMin,
		tailwindPercent
	};
}

/**
 * Berechnet den Rückenwind-Anteil einer Route geometrisch.
 * Für jedes Segment: Fahrtrichtung vs. Windrichtung vergleichen.
 * Segment gilt als Rückenwind wenn Winkel-Differenz < 90°.
 *
 * @param {[number, number][]} coords - [lng, lat][]
 * @param {number} windHeadingDeg - Windquelle-Richtung (= Gegenwindrichtung)
 * @returns {number} Rückenwind-Anteil in Prozent (0–100)
 */
function calcTailwindPercent(coords, windHeadingDeg) {
	if (coords.length < 2) return 50;

	let tailwindDist = 0;
	let totalDist = 0;

	for (let i = 0; i < coords.length - 1; i++) {
		const [lng1, lat1] = coords[i];
		const [lng2, lat2] = coords[i + 1];

		// Distanz des Segments (Pythagorean-Näherung — genug für Prozent-Schätzung)
		const dx = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180);
		const dy = lat2 - lat1;
		const segDist = Math.sqrt(dx * dx + dy * dy);

		// Fahrtrichtung dieses Segments in Grad (0=N, 90=E, …)
		const bearingRad = Math.atan2(dx, dy);
		const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

		// Rückenwind wenn Fahrtrichtung mit Windrichtung übereinstimmt
		// Wind kommt aus windHeadingDeg → Rückenwind wenn wir IN diese Richtung fahren
		const angleDiff = Math.abs(((bearingDeg - windHeadingDeg + 540) % 360) - 180);

		totalDist += segDist;
		if (angleDiff < 90) tailwindDist += segDist;
	}

	if (totalDist === 0) return 50;
	return Math.round((tailwindDist / totalDist) * 100);
}
