<script>
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	/**
	 * @typedef {import('$lib/models/route.js').Route} Route
	 * @typedef {import('$lib/models/route.js').WindSnapshot} WindSnapshot
	 */

	/** @type {{ route: Route | null, wind: WindSnapshot | null }} */
	let { route = null, wind = null } = $props();

	/** @type {HTMLDivElement | null} */
	let mapEl = $state(null);

	/** @type {any} Leaflet-Instanz (nach dynamischem Import) */
	let L = null;
	/** @type {any} Map-Instanz */
	let map = null;
	/** @type {any[]} */
	let layers = [];

	/** @param {[number,number][]} coords - [lng, lat][]
	 *  @param {number} windHeadingDeg */
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

	function renderRoute() {
		if (!map || !route || !L) return;

		layers.forEach((l) => l.remove());
		layers = [];

		const coords = route.geometry.coordinates;
		const windHeadingDeg = wind?.headingDeg ?? 0;
		if (coords.length < 2) return;

		coloredSegments(coords, windHeadingDeg).forEach(({ latlngs, color }) => {
			layers.push(L.polyline(latlngs, { color, weight: 4, opacity: 0.85 }).addTo(map));
		});

		layers.push(
			L.circleMarker([coords[0][1], coords[0][0]], {
				radius: 8,
				fillColor: '#1e40af',
				color: 'white',
				weight: 2,
				fillOpacity: 1
			}).addTo(map)
		);

		map.fitBounds(
			L.latLngBounds(coords.map((/** @type {[number,number]} */ [lng, lat]) => [lat, lng])),
			{ padding: [24, 24] }
		);
	}

	onMount(async () => {
		if (!browser || !mapEl) return;
		L = (await import('leaflet')).default;

		map = L.map(mapEl, { zoomControl: true });
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		if (route) renderRoute();
	});

	onDestroy(() => {
		if (map) { map.remove(); map = null; }
	});

	$effect(() => {
		if (route && map && L) renderRoute();
	});
</script>

{#if browser}
	<div bind:this={mapEl} class="map-container"></div>
{/if}

<style>
	.map-container {
		width: 100%;
		height: 100%;
		min-height: 300px;
	}
</style>
