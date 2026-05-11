import { GRAPHHOPPER_API_KEY } from '$env/static/private';

const GH_BASE = 'https://graphhopper.com/api/1/route';

/**
 * Berechnet eine Rund-Route via GraphHopper und passt die Distanz iterativ an,
 * bis das Ergebnis innerhalb von ±5 km des Ziels liegt (max. 3 Versuche).
 *
 * @param {{
 *   lat: number,
 *   lng: number,
 *   distanceKm: number,
 *   windHeadingDeg: number,
 *   sport?: string,
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
export async function generateRoundTrip({ lat, lng, distanceKm, windHeadingDeg, seed = 0 }) {
	const TOLERANCE_KM = 5;
	const MAX_ATTEMPTS = 3;

	// requestedKm wird nach jedem Versuch skaliert, damit das geroutete Ergebnis
	// näher am Zielwert liegt (Strassen sind länger als Luftlinie)
	let requestedKm = distanceKm;
	let lastResult = null;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const result = await callGraphHopper({ lat, lng, distanceKm: requestedKm, windHeadingDeg, seed });
		lastResult = result;

		if (Math.abs(result.actualDistanceKm - distanceKm) <= TOLERANCE_KM) break;

		requestedKm = requestedKm * (distanceKm / result.actualDistanceKm);
	}

	return /** @type {NonNullable<typeof lastResult>} */ (lastResult);
}

/**
 * Einzelner GraphHopper-Aufruf mit Dreieck-Wegpunkten.
 *
 * @param {{
 *   lat: number,
 *   lng: number,
 *   distanceKm: number,
 *   windHeadingDeg: number,
 *   seed: number
 * }} opts
 */
async function callGraphHopper({ lat, lng, distanceKm, windHeadingDeg, seed }) {
	const vehicle = 'bike'; // Free Tier: nur car, bike, foot

	// Dreieck-Schleife: Start → WP1 (in Windrichtung) → WP2 (abbiegen) → Start
	// Route 1 (seed=0): Abbiegen nach rechts (+120°) → Uhrzeigersinn
	// Route 2 (seed=1): Abbiegen nach links  (-120°) → Gegenuhrzeigersinn
	const legDistKm = distanceKm / 3;
	const legDistDeg = legDistKm / 111;

	const heading1Rad = (windHeadingDeg * Math.PI) / 180;
	const wp1Lat = lat + legDistDeg * Math.cos(heading1Rad);
	const wp1Lng = lng + (legDistDeg * Math.sin(heading1Rad)) / Math.cos((lat * Math.PI) / 180);

	const turn = seed === 0 ? 120 : -120;
	const heading2Rad = ((((windHeadingDeg + turn) % 360) + 360) % 360 * Math.PI) / 180;
	const wp2Lat = wp1Lat + legDistDeg * Math.cos(heading2Rad);
	const wp2Lng = wp1Lng + (legDistDeg * Math.sin(heading2Rad)) / Math.cos((wp1Lat * Math.PI) / 180);

	const params = new URLSearchParams({
		key: GRAPHHOPPER_API_KEY,
		vehicle,
		locale: 'de',
		points_encoded: 'false'
	});
	params.append('point', `${lat},${lng}`);
	params.append('point', `${wp1Lat.toFixed(6)},${wp1Lng.toFixed(6)}`);
	params.append('point', `${wp2Lat.toFixed(6)},${wp2Lng.toFixed(6)}`);
	params.append('point', `${lat},${lng}`);

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
		geometry: /** @type {import('$lib/models/route.js').GeoJsonLineString} */ ({ type: 'LineString', coordinates: coords }),
		actualDistanceKm,
		elevationGainM,
		durationMin,
		tailwindPercent
	};
}

/**
 * Berechnet den Rückenwind-Anteil einer Route geometrisch.
 * @param {[number, number][]} coords - [lng, lat][]
 * @param {number} windHeadingDeg
 * @returns {number} Rückenwind-Anteil in Prozent (0–100)
 */
function calcTailwindPercent(coords, windHeadingDeg) {
	if (coords.length < 2) return 50;

	let tailwindDist = 0;
	let totalDist = 0;

	for (let i = 0; i < coords.length - 1; i++) {
		const [lng1, lat1] = coords[i];
		const [lng2, lat2] = coords[i + 1];

		const dx = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180);
		const dy = lat2 - lat1;
		const segDist = Math.sqrt(dx * dx + dy * dy);

		const bearingRad = Math.atan2(dx, dy);
		const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

		const angleDiff = Math.abs(((bearingDeg - windHeadingDeg + 540) % 360) - 180);

		totalDist += segDist;
		if (angleDiff < 90) tailwindDist += segDist;
	}

	if (totalDist === 0) return 50;
	return Math.round((tailwindDist / totalDist) * 100);
}
