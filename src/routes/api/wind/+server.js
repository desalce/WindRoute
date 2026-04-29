import { json, error } from '@sveltejs/kit';
import { fetchWind } from '$lib/server/services/wind.js';

/** GET /api/wind?lat=&lng= */
export async function GET({ url }) {
	const lat = parseFloat(url.searchParams.get('lat') ?? '');
	const lng = parseFloat(url.searchParams.get('lng') ?? '');

	if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
		throw error(400, 'Ungültige Koordinaten');
	}

	try {
		const wind = await fetchWind(lat, lng);
		return json(wind);
	} catch (err) {
		console.error('Wind-Abfrage fehlgeschlagen:', err);
		throw error(502, 'Winddaten konnten nicht abgerufen werden');
	}
}
