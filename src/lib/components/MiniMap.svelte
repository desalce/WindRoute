<script>
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	/**
	 * @typedef {import('$lib/models/route.js').Route} Route
	 * @typedef {import('$lib/models/route.js').WindSnapshot} WindSnapshot
	 */

	/** @type {{ route: Route, wind: WindSnapshot }} */
	let { route, wind } = $props();

	/** @type {HTMLDivElement | null} */
	let mapEl = $state(null);

	/** @type {any} */
	let L = null;
	/** @type {any} */
	let map = null;

	/** Farbcodierte Segmente: grün = Rückenwind, rot = Gegenwind */
	/** @param {[number, number][]} coords @param {number} windHeadingDeg */
	function coloredSegments(coords, windHeadingDeg) {
		/** @type {{ latlngs: [number,number][], color: string }[]} */
		const segments = [];
		let currentColor = '';
		/** @type {[number,number][]} */
		let currentPts = [];

		for (let i = 0; i < coords.length - 1; i++) {
			const [lng1, lat1] = coords[i];
			const [lng2, lat2] = coords[i + 1];
			const dx = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180);
			const dy = lat2 - lat1;
			const bearingDeg = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
			const angleDiff = Math.abs(((bearingDeg - windHeadingDeg + 540) % 360) - 180);
			const color = angleDiff < 90 ? '#22c55e' : '#ef4444';

			if (color !== currentColor) {
				if (currentPts.length > 0) {
					currentPts.push([lat1, lng1]);
					segments.push({ latlngs: currentPts, color: currentColor });
				}
				currentColor = color;
				currentPts = [[lat1, lng1]];
			}
			currentPts.push([lat2, lng2]);
		}
		if (currentPts.length > 0) segments.push({ latlngs: currentPts, color: currentColor });
		return segments;
	}

	onMount(async () => {
		if (!browser || !mapEl) return;
		L = (await import('leaflet')).default;

		// Alle Interaktionen deaktivieren — rein statische Vorschau
		map = L.map(mapEl, {
			zoomControl: false,
			dragging: false,
			touchZoom: false,
			scrollWheelZoom: false,
			doubleClickZoom: false,
			boxZoom: false,
			keyboard: false,
			attributionControl: false
		});

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

		const coords = route.geometry.coordinates;
		const windHeadingDeg = wind.headingDeg;

		coloredSegments(coords, windHeadingDeg).forEach(({ latlngs, color }) => {
			L.polyline(latlngs, { color, weight: 3, opacity: 0.9 }).addTo(map);
		});

		// Startpunkt markieren
		L.circleMarker([coords[0][1], coords[0][0]], {
			radius: 5,
			fillColor: '#1e40af',
			color: 'white',
			weight: 2,
			fillOpacity: 1
		}).addTo(map);

		map.fitBounds(
			L.latLngBounds(coords.map((/** @type {[number,number]} */ [lng, lat]) => [lat, lng])),
			{ padding: [8, 8] }
		);
	});

	onDestroy(() => {
		if (map) { map.remove(); map = null; }
	});
</script>

{#if browser}
	<div bind:this={mapEl} class="mini-map"></div>
{/if}

<style>
	.mini-map {
		width: 100%;
		height: 140px;
		border-radius: 8px;
		overflow: hidden;
		background: #e8edf2;
		/* Pointer-Events deaktivieren damit Klicks auf die Card durchgehen */
		pointer-events: none;
	}
</style>
