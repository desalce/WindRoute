import { GRAPHHOPPER_API_KEY } from '$env/static/private';

const GH_BASE = 'https://graphhopper.com/api/1/route';

/**
 * Berechnet eine Rund-Route via GraphHopper `round_trip`.
 *
 * @param {{
 *   lat: number,
 *   lng: number,
 *   distanceKm: number,
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
export async function generateRoundTrip({ lat, lng, distanceKm, windHeadingDeg, seed = 0 }) {
	const vehicle = 'bike'; // Free Tier: nur car, bike, foot

	// Dreieck-Schleife: Start → WP1 (in Windrichtung) → WP2 (abbiegen) → Start
	// Route 1 (seed=0): Abbiegen nach rechts (+120°) → Uhrzeigersinn
	// Route 2 (seed=1): Abbiegen nach links  (-120°) → Gegenuhrzeigersinn
	// Beide Routen starten mit Gegenwind-Etappe, erkunden aber verschiedene Gebiete.

	const legDistKm = distanceKm / 3;
	const legDistDeg = legDistKm / 111; // 1° Breitengrad ≈ 111 km

	// WP1: Etappe 1 – gerade in den Wind
	const heading1Rad = (windHeadingDeg * Math.PI) / 180;
	const wp1Lat = lat + legDistDeg * Math.cos(heading1Rad);
	const wp1Lng = lng + legDistDeg * Math.sin(heading1Rad) / Math.cos((lat * Math.PI) / 180);

	// WP2: Etappe 2 – 120° abbiegen (Richtung je nach seed)
	const turn = seed === 0 ? 120 : -120;
	const heading2Rad = (((windHeadingDeg + turn) % 360 + 360) % 360 * Math.PI) / 180;
	const wp2Lat = wp1Lat + legDistDeg * Math.cos(heading2Rad);
	const wp2Lng = wp1Lng + legDistDeg * Math.sin(heading2Rad) / Math.cos((wp1Lat * Math.PI) / 180);

	// Vier Punkte: Start → WP1 → WP2 → Start
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
