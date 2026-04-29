/**
 * Holt aktuelle Winddaten von Open-Meteo (kein API-Key nötig).
 *
 * Wind-Richtungs-Semantik (meteorologisch):
 *   directionDeg = woher der Wind kommt (270° = Wind aus West)
 *   headingDeg   = in welche Richtung wir fahren müssen, um gegen den Wind zu fahren
 *                = directionDeg (wir fahren in Richtung der Windquelle)
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<import('$lib/models/route.js').WindSnapshot>}
 */
export async function fetchWind(lat, lng) {
	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', String(lat));
	url.searchParams.set('longitude', String(lng));
	url.searchParams.set('current', 'wind_speed_10m,wind_direction_10m');
	url.searchParams.set('wind_speed_unit', 'kmh');

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 8000);

	try {
		const res = await fetch(url.toString(), { signal: controller.signal });
		if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
		const data = await res.json();
		const current = data.current;
		const speedKmh = Math.round(current.wind_speed_10m);
		const directionDeg = Math.round(current.wind_direction_10m);

		return {
			speedKmh,
			directionDeg,
			headingDeg: directionDeg
		};
	} finally {
		clearTimeout(timeout);
	}
}
