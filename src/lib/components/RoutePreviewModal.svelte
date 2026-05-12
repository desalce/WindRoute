<script>
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import WindIndicator from './WindIndicator.svelte';

	/**
	 * @typedef {import('$lib/models/route.js').Route} Route
	 */

	/** @type {{ route: Route | null, onclose: () => void, ondelete: (id: string) => void }} */
	let { route = null, onclose, ondelete } = $props();

	/** @type {HTMLDialogElement | null} */
	let dialogEl = $state(null);

	/** @type {HTMLDivElement | null} */
	let mapEl = $state(null);

	let currentWind = $state(/** @type {{ speedKmh: number, directionDeg: number } | null} */ (null));
	let loadingWind = $state(false);

	// Non-reactive Leaflet internals (mutated outside $state to avoid proxy issues)
	/** @type {any} */
	let L = null;
	/** @type {any} */
	let map = null;
	/** @type {any[]} */
	let layers = [];
	/** @type {string | null} */
	let openedRouteId = null;

	/** Angular difference between two compass directions (0–180°) */
	/** @param {number} a @param {number} b */
	function windAngleDiff(a, b) {
		return Math.abs(((a - b + 540) % 360) - 180);
	}

	let windChangedWarning = $derived(
		!!(route && currentWind && windAngleDiff(currentWind.directionDeg, route.wind.directionDeg) > 45)
	);

	/** @param {[number, number][]} coords @param {number} windHeadingDeg */
	function coloredSegments(coords, windHeadingDeg) {
		/** @type {{ latlngs: [number, number][], color: string }[]} */
		const segments = [];
		let currentColor = '';
		/** @type {[number, number][]} */
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

	/** @param {Route} r */
	function renderRoute(r) {
		if (!map || !L) return;
		layers.forEach((l) => l.remove());
		layers = [];

		const coords = r.geometry.coordinates;
		if (coords.length < 2) return;

		coloredSegments(coords, r.wind.headingDeg).forEach(({ latlngs, color }) => {
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

	$effect(() => {
		if (!browser) return;
		const r = route;
		const dlg = dialogEl;
		if (!dlg) return;

		if (r) {
			const routeId = String(r._id);
			const isOpening = !dlg.open;
			const routeChanged = routeId !== openedRouteId;

			if (isOpening) dlg.showModal();

			if (isOpening || routeChanged) {
				openedRouteId = routeId;
				loadingWind = true;
				currentWind = null;
				fetch(`/api/wind?lat=${r.startLat}&lng=${r.startLng}`)
					.then((res) => (res.ok ? res.json() : null))
					.then((w) => {
						currentWind = w;
						loadingWind = false;
					})
					.catch(() => {
						loadingWind = false;
					});

				// Leaflet loads asynchronously; by the time it resolves, showModal() has run
				// and the dialog container has proper layout dimensions.
				(async () => {
					if (!L) L = (await import('leaflet')).default;
					if (!map && mapEl) {
						map = L.map(mapEl, { zoomControl: true });
						L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
							attribution:
								'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						}).addTo(map);
					}
					if (map && r) renderRoute(r);
				})();
			}
		} else if (dlg.open) {
			dlg.close();
			openedRouteId = null;
			layers.forEach((l) => l.remove());
			layers = [];
		}
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});

	function handleClose() {
		onclose();
	}

	/** @param {Event} e */
	function handleCancel(e) {
		e.preventDefault();
		onclose();
	}

	/** @param {MouseEvent} e */
	function handleBackdropClick(e) {
		if (e.target === dialogEl) onclose();
	}

	/** @param {Route} r */
	function exportGpx(r) {
		const coords = r.geometry.coordinates;
		const trkpts = coords
			.map(([lng, lat]) => `    <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
			.join('\n');
		const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WindRoute">
  <trk>
    <name>${r.name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
		const blob = new Blob([gpx], { type: 'application/gpx+xml' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${r.name.replace(/\s+/g, '-').toLowerCase()}.gpx`;
		a.click();
	}

	/** @param {string | Date} iso */
	function formatDate(iso) {
		return new Date(iso).toLocaleDateString('de-CH', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	/** @param {number} deg */
	function dirLabel(deg) {
		const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
		return dirs[Math.round(deg / 45) % 8];
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	oncancel={handleCancel}
	onclick={handleBackdropClick}
	class="preview-dialog"
	aria-label={route ? `Vorschau: ${route.name}` : 'Routen-Vorschau'}
>
	{#if route}
		<div class="modal-inner" role="document">
			<!-- Header -->
			<div class="modal-header">
				<div class="header-left">
					<span class="sport-badge {route.sport}">
						{route.sport === 'road' ? 'Rennrad' : 'Gravel'}
					</span>
					<h2 class="modal-title">{route.name}</h2>
				</div>
				<button class="btn-close" onclick={handleClose} aria-label="Schliessen">
					✕
				</button>
			</div>

			<!-- Body: map left, info right -->
			<div class="modal-body">
				<div class="map-panel">
					<div bind:this={mapEl} class="modal-map"></div>
					<div class="map-legend">
						<span>🔴 Gegenwind</span>
						<span>🟢 Rückenwind</span>
					</div>
				</div>

				<div class="info-panel">
					<!-- Current wind (lazy-loaded on open) -->
					<div>
						{#if loadingWind}
							<div class="wind-placeholder">Wind wird geladen…</div>
						{:else if currentWind}
							<WindIndicator
								speedKmh={currentWind.speedKmh}
								directionDeg={currentWind.directionDeg}
							/>
						{:else}
							<div class="wind-placeholder wind-error">Winddaten nicht verfügbar</div>
						{/if}
					</div>

					<!-- Wind-change warning -->
					{#if windChangedWarning}
						<div class="wind-warning">
							⚠ Wind hat sich seit der Speicherung geändert — diese Route ist heute eventuell nicht
							mehr ideal.
						</div>
					{/if}

					<!-- Wind at generation time -->
					<div class="saved-wind">
						<span class="meta-label">Wind bei Generierung</span>
						<span class="meta-value">
							{route.wind.speedKmh} km/h aus {dirLabel(route.wind.directionDeg)}
						</span>
					</div>

					<!-- Route metadata -->
					<div class="meta-grid">
						<div class="meta-item">
							<span class="meta-label">Datum</span>
							<span class="meta-value">{formatDate(route.createdAt)}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Distanz</span>
							<span class="meta-value">{route.actualDistanceKm} km</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Dauer</span>
							<span class="meta-value">{route.durationMin} min</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Höhenmeter</span>
							<span class="meta-value">{route.elevationGainM} m</span>
						</div>
						<div class="meta-item meta-item--wide">
							<span class="meta-label">Startpunkt</span>
							<span class="meta-value">{route.startLabel}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Rückenwind</span>
							<span class="meta-value">{route.tailwindPercent}%</span>
						</div>
					</div>

					<!-- Tailwind bar -->
					<div
						class="wind-bar-wrap"
						title="{100 - route.tailwindPercent}% Gegenwind, {route.tailwindPercent}% Rückenwind"
					>
						<div class="wind-bar-fill headwind" style="width: {100 - route.tailwindPercent}%"></div>
						<div class="wind-bar-fill tailwind" style="width: {route.tailwindPercent}%"></div>
					</div>

					<!-- Actions -->
					<div class="modal-actions">
						<button class="btn-gpx" onclick={() => route && exportGpx(route)}>↓ GPX Export</button>
						<button
							class="btn-delete"
							onclick={() => route?._id && ondelete(String(route._id))}
						>
							Löschen
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.preview-dialog {
		/* Explicit centering — more reliable than relying on browser UA defaults */
		position: fixed;
		inset: 0;
		margin: auto;
		border: none;
		border-radius: 16px;
		padding: 0;
		width: min(920px, 95vw);
		max-height: 90vh;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}

	.preview-dialog::backdrop {
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(4px);
	}

	.modal-inner {
		display: flex;
		flex-direction: column;
		max-height: 90vh;
	}

	/* Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e2e8f0;
		background: white;
		flex-shrink: 0;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.modal-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sport-badge {
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		flex-shrink: 0;
	}

	.sport-badge.road {
		background: #dbeafe;
		color: #1e40af;
	}

	.sport-badge.gravel {
		background: #dcfce7;
		color: #166534;
	}

	.btn-close {
		background: #f1f5f9;
		border: none;
		border-radius: 8px;
		width: 32px;
		height: 32px;
		cursor: pointer;
		font-size: 1rem;
		color: #475569;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background 0.15s;
	}

	.btn-close:hover {
		background: #e2e8f0;
	}

	/* Body */
	.modal-body {
		display: grid;
		grid-template-columns: 1fr 300px;
		overflow: hidden;
		min-height: 0;
		flex: 1;
	}

	.map-panel {
		display: flex;
		flex-direction: column;
		background: #dde8f0;
		overflow: hidden;
	}

	.modal-map {
		flex: 1;
		min-height: 300px;
	}

	.map-legend {
		display: flex;
		justify-content: space-between;
		padding: 0.4rem 0.75rem;
		font-size: 0.75rem;
		color: #475569;
		background: white;
		border-top: 1px solid #e2e8f0;
		flex-shrink: 0;
	}

	/* Info sidebar */
	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1rem;
		overflow-y: auto;
		background: white;
		border-left: 1px solid #e2e8f0;
	}

	.wind-placeholder {
		background: #1e40af;
		color: rgba(255, 255, 255, 0.7);
		border-radius: 10px;
		padding: 1rem 1.25rem;
		font-size: 0.85rem;
		min-height: 72px;
		display: flex;
		align-items: center;
	}

	.wind-placeholder.wind-error {
		background: #f1f5f9;
		color: #64748b;
	}

	.wind-warning {
		background: #fffbeb;
		border: 1px solid #fde68a;
		border-radius: 8px;
		padding: 0.65rem 0.9rem;
		font-size: 0.8rem;
		color: #78350f;
		line-height: 1.4;
	}

	.saved-wind {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.65rem 0.75rem;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem 0.5rem;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.meta-item--wide {
		grid-column: 1 / -1;
	}

	.meta-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
		font-weight: 600;
	}

	.meta-value {
		font-size: 0.9rem;
		font-weight: 600;
		color: #1e293b;
	}

	.wind-bar-wrap {
		display: flex;
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
		background: #f1f5f9;
	}

	.wind-bar-fill {
		height: 100%;
	}

	.wind-bar-fill.headwind {
		background: #ef4444;
	}

	.wind-bar-fill.tailwind {
		background: #22c55e;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: auto;
		padding-top: 0.5rem;
	}

	.btn-gpx {
		flex: 1;
		padding: 0.6rem;
		background: #1e40af;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-gpx:hover {
		background: #1d3a9e;
	}

	.btn-delete {
		padding: 0.6rem 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 600;
		color: #dc2626;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.btn-delete:hover {
		background: #fee2e2;
	}

	/* Mobile: full-screen, stacked layout */
	@media (max-width: 700px) {
		.preview-dialog {
			width: 100vw;
			max-height: 100dvh;
			border-radius: 0;
			margin: 0;
		}

		.modal-inner {
			max-height: 100dvh;
		}

		.modal-body {
			grid-template-columns: 1fr;
			grid-template-rows: 220px 1fr;
			overflow-y: auto;
		}

		.map-panel {
			height: 220px;
		}

		.modal-map {
			min-height: 0;
			height: 100%;
		}

		.info-panel {
			border-left: none;
			border-top: 1px solid #e2e8f0;
			overflow-y: visible;
		}

		.modal-actions {
			margin-top: 0;
			padding-top: 0;
		}
	}
</style>
