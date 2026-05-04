<script>
	import WindIndicator from '$lib/components/WindIndicator.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import MapView from '$lib/components/MapView.svelte';

	// --- Formular-State ---
	let startLabel = $state('');
	let startLat = $state(/** @type {number | null} */ (null));
	let startLng = $state(/** @type {number | null} */ (null));
	let distanceKm = $state(50);
	let sport = $state(/** @type {'road' | 'gravel'} */ ('road'));

	// --- Geocoding-Autocomplete ---
	let geocodeResults = $state(/** @type {any[]} */ ([]));
	let geocodeTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

	/** @param {Event} e */
	function onStartInput(e) {
		const val = /** @type {HTMLInputElement} */ (e.target).value;
		startLabel = val;
		startLat = null;
		startLng = null;
		if (geocodeTimer) clearTimeout(geocodeTimer);
		if (val.length < 3) { geocodeResults = []; return; }
		geocodeTimer = setTimeout(() => fetchGeocode(val), 350);
	}

	/** @param {string} query */
	async function fetchGeocode(query) {
		try {
			const res = await fetch(
				`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=de`
			);
			const data = await res.json();
			geocodeResults = data.features ?? [];
		} catch {
			geocodeResults = [];
		}
	}

	/** @param {any} feature */
	function selectGeocode(feature) {
		startLat = feature.geometry.coordinates[1];
		startLng = feature.geometry.coordinates[0];
		const p = feature.properties;
		startLabel = [p.name, p.city || p.state, p.country].filter(Boolean).join(', ');
		geocodeResults = [];
	}

	// --- Generierungslogik ---
	let loading = $state(false);
	let errorMsg = $state(/** @type {string | null} */ (null));

	/** @type {{ wind: import('$lib/models/route.js').WindSnapshot, routes: import('$lib/models/route.js').Route[] } | null} */
	let result = $state(null);

	/** @type {import('$lib/models/route.js').Route | null} */
	let activeRoute = $state(null);

	async function generate() {
		if (!startLat || !startLng) { errorMsg = 'Bitte einen Startpunkt aus der Liste wählen.'; return; }
		errorMsg = null;
		loading = true;
		result = null;

		try {
			// Wind holen
			const windRes = await fetch(`/api/wind?lat=${startLat}&lng=${startLng}`);
			if (!windRes.ok) throw new Error('Winddaten konnten nicht geladen werden. Bitte versuche es erneut.');
			const wind = await windRes.json();

			// Routen generieren
			const genRes = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lat: startLat, lng: startLng, distanceKm, sport, windHeadingDeg: wind.headingDeg })
			});
			if (!genRes.ok) {
				const err = await genRes.json().catch(() => ({}));
				const raw = err.message ?? '';
				// GraphHopper-Fehlermeldungen verständlich übersetzen
				const msg = raw.includes('Cannot find point')
					? 'Kein fahrbarer Weg ab diesem Startpunkt gefunden. Versuche einen anderen Ort.'
					: raw.includes('Connection point') || raw.includes('Cannot find')
						? 'Der Startpunkt liegt ausserhalb des Strassennetzes (z.B. im Wasser).'
						: raw || 'Routen konnten nicht generiert werden.';
				throw new Error(msg);
			}
			const generated = await genRes.json();

			// Routen sofort anzeigen (ohne auf DB-Save zu warten)
			/** @type {any[]} */
			const routesForDisplay = generated.routes.map(
				/** @param {any} r @param {number} i */
				(r, i) => ({
					name: i === 0 ? 'Klassische Runde' : 'Panorama-Tour',
					startLat, startLng, startLabel, distanceKm, sport, wind,
					...r
				})
			);
			result = { wind, routes: routesForDisplay };
			activeRoute = routesForDisplay[0];

			// Auto-Save im Hintergrund (aktualisiert _id für Delete-Button)
			Promise.all(
				routesForDisplay.map(
					/** @param {any} r */
					(r) =>
						fetch('/api/routes', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(r)
						})
						.then((res) => res.ok ? res.json() : null)
						.catch(() => null)
				)
			).then((saved) => {
				const valid = saved.filter(Boolean);
				if (valid.length > 0 && result) {
					result.routes = valid;
					activeRoute = valid[0];
				}
			});
		} catch (/** @type {any} */ err) {
			errorMsg = err.message ?? 'Unbekannter Fehler.';
		} finally {
			loading = false;
		}
	}

	/** @param {string} id */
	async function deleteRoute(id) {
		await fetch(`/api/routes/${id}`, { method: 'DELETE' });
		if (result) {
			result.routes = result.routes.filter((r) => r._id !== id);
			if (activeRoute?._id === id) activeRoute = result.routes[0] ?? null;
		}
	}

	/** GPX-Export für eine Route */
	/** @param {import('$lib/models/route.js').Route} route */
	function exportGpx(route) {
		const coords = route.geometry.coordinates;
		const trkpts = coords
			.map(([lng, lat]) => `    <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
			.join('\n');
		const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WindRoute">
  <trk>
    <name>${route.name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
		const blob = new Blob([gpx], { type: 'application/gpx+xml' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${route.name.replace(/\s+/g, '-').toLowerCase()}.gpx`;
		a.click();
	}

	/** @param {number} deg */
	function windDirLabel(deg) {
		const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
		return dirs[Math.round(deg / 45) % 8];
	}
</script>

<svelte:head>
	<title>Route planen – WindRoute</title>
</svelte:head>

<div class="layout">
	<!-- Linke Spalte: Formular + Ergebnisse -->
	<aside class="sidebar">
		<!-- Formular -->
		<section class="panel form-panel">
			<h2>Route planen</h2>

			<label class="field-label" for="start">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.72 12.06a.5.5 0 0 0 .56 0C12.95 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"/></svg>
				Startpunkt
			</label>
			<div class="autocomplete-wrap">
				<input
					id="start"
					class="input"
					type="text"
					placeholder="Zürich, Schweiz"
					value={startLabel}
					oninput={onStartInput}
					autocomplete="off"
				/>
				{#if geocodeResults.length > 0}
					<ul class="autocomplete-list">
						{#each geocodeResults as feature}
							<li>
								<button type="button" onclick={() => selectGeocode(feature)}>
									{[feature.properties.name, feature.properties.city || feature.properties.state, feature.properties.country].filter(Boolean).join(', ')}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<label class="field-label" for="distance">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
				Distanz: {distanceKm} km
			</label>
			<input
				id="distance"
				class="slider"
				type="range"
				min="20"
				max="150"
				step="5"
				bind:value={distanceKm}
			/>
			<div class="slider-labels">
				<span>20 km</span>
				<span>150 km</span>
			</div>

			<fieldset class="sport-fieldset">
			<legend class="field-label">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
				Sportart
			</legend>
			<div class="sport-toggle">
				<button
					type="button"
					class:active={sport === 'road'}
					onclick={() => (sport = 'road')}
				>Rennrad</button>
				<button
					type="button"
					class:active={sport === 'gravel'}
					onclick={() => (sport = 'gravel')}
				>Gravel</button>
			</div>
			</fieldset>

			{#if errorMsg}
				<p class="error-msg">{errorMsg}</p>
			{/if}

			<button class="btn-generate" onclick={generate} disabled={loading}>
				{#if loading}
					<LoadingSpinner message="Routen werden berechnet…" />
				{:else}
					Routen generieren
				{/if}
			</button>
		</section>

		<!-- Wind-Box (erscheint nach Generierung) -->
		{#if result}
			<WindIndicator speedKmh={result.wind.speedKmh} directionDeg={result.wind.directionDeg} />

			<!-- Routen-Cards -->
			<section class="results-section">
				<h3>Vorgeschlagene Routen</h3>

				{#each result.routes as route, i}
					<div
						class="route-card"
						class:selected={activeRoute?._id === route._id}
						role="button"
						tabindex="0"
						onclick={() => (activeRoute = route)}
						onkeydown={(e) => e.key === 'Enter' && (activeRoute = route)}
					>
						<div class="card-top">
							<h4>Route {i + 1}: {route.name}</h4>
						</div>

						<div class="card-stats">
							<div class="stat">
								<span class="stat-icon">↔</span>
								<div>
									<span class="stat-label">Distanz</span>
									<span class="stat-val">{route.actualDistanceKm} km</span>
								</div>
							</div>
							<div class="stat">
								<span class="stat-icon">⏱</span>
								<div>
									<span class="stat-label">Dauer</span>
									<span class="stat-val">{route.durationMin} min</span>
								</div>
							</div>
							<div class="stat">
								<span class="stat-icon">↗</span>
								<div>
									<span class="stat-label">Höhenmeter</span>
									<span class="stat-val">{route.elevationGainM} m</span>
								</div>
							</div>
							<div class="stat">
								<span class="stat-icon">💨</span>
								<div>
									<span class="stat-label">Rückenwind</span>
									<span class="stat-val">{route.tailwindPercent}%</span>
								</div>
							</div>
						</div>

						<div class="wind-bar-wrap">
							<div
								class="wind-bar-fill headwind"
								style="width: {100 - route.tailwindPercent}%"
							></div>
							<div
								class="wind-bar-fill tailwind"
								style="width: {route.tailwindPercent}%"
							></div>
						</div>
						<div class="wind-bar-labels">
							<span>🔴 Gegenwind</span>
							<span>🟢 Rückenwind</span>
						</div>

						<div class="card-actions">
							<button class="btn-gpx" onclick={(e) => { e.stopPropagation(); exportGpx(route); }}>
								↓ Als GPX exportieren
							</button>
							<button class="btn-delete" title="Route löschen" onclick={(e) => { e.stopPropagation(); deleteRoute(String(route._id)); }}>
								🗑
							</button>
						</div>
					</div>
				{/each}
			</section>
		{/if}

		<!-- Info-Box -->
		<div class="info-box">
			<strong>💡 Warum "Gegenwind zuerst"?</strong>
			<p>
				Die bewährte Strategie: Starte frisch gegen den Wind und profitiere auf dem Rückweg von der
				Unterstützung des Rückenwinds. So kommst du entspannter nach Hause und maximierst den
				Trainingseffekt.
			</p>
		</div>
	</aside>

	<!-- Rechte Spalte: Karte -->
	<main class="map-area">
		{#if activeRoute}
			<div class="map-header">
				<h2>Route {result?.routes.indexOf(activeRoute) !== undefined ? result?.routes.indexOf(activeRoute) + 1 : ''}: {activeRoute.name}</h2>
				<div class="map-legend">
					<span>🔴 Gegenwind zuerst</span>
					<span>🟢 Rückenwind zurück</span>
				</div>
			</div>
		{/if}
		<div class="map-placeholder">
			{#if !result}
				<div class="map-empty">
					<p>Gib einen Startpunkt ein und klicke auf <strong>Routen generieren</strong></p>
				</div>
			{:else}
				<MapView route={activeRoute} wind={result.wind} />
			{/if}
		</div>
	</main>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 320px 1fr;
		height: calc(100vh - 56px);
		overflow: hidden;
	}

	/* Sidebar */
	.sidebar {
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: #f8fafc;
		border-right: 1px solid #e2e8f0;
	}

	.panel {
		background: white;
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		border: 1px solid #e2e8f0;
	}

	.form-panel h2 {
		font-size: 1.1rem;
		font-weight: 700;
		margin-bottom: 1rem;
		color: #1e293b;
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: #475569;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.4rem;
		margin-top: 0.9rem;
	}

	.field-label:first-of-type {
		margin-top: 0;
	}

	/* Autocomplete */
	.autocomplete-wrap {
		position: relative;
	}

	.input {
		width: 100%;
		padding: 0.55rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.input:focus {
		border-color: #1e40af;
	}

	.autocomplete-list {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 10;
		list-style: none;
		overflow: hidden;
	}

	.autocomplete-list li button {
		width: 100%;
		text-align: left;
		padding: 0.6rem 0.9rem;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.85rem;
		color: #1e293b;
		transition: background 0.1s;
	}

	.autocomplete-list li button:hover {
		background: #f1f5f9;
	}

	/* Slider */
	.slider {
		width: 100%;
		accent-color: #1e40af;
		margin: 0.25rem 0;
	}

	.slider-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: #94a3b8;
		margin-top: 0.15rem;
	}

	/* Sport-Toggle */
	.sport-fieldset {
		border: none;
		padding: 0;
		margin: 0;
	}

	.sport-toggle {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
		border: 1px solid #1e40af;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 0.4rem;
	}

	.sport-toggle button {
		padding: 0.55rem;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		background: white;
		color: #1e40af;
		transition: background 0.15s, color 0.15s;
	}

	.sport-toggle button.active {
		background: #1e40af;
		color: white;
	}

	/* Generate button */
	.btn-generate {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0.75rem;
		margin-top: 1rem;
		background: #1e40af;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s;
		min-height: 46px;
	}

	.btn-generate:hover:not(:disabled) {
		background: #1d3a9e;
	}

	.btn-generate:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error-msg {
		color: #dc2626;
		font-size: 0.85rem;
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: #fef2f2;
		border-radius: 6px;
		border: 1px solid #fecaca;
	}

	/* Results */
	.results-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.results-section h3 {
		font-size: 0.9rem;
		font-weight: 700;
		color: #475569;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.route-card {
		background: white;
		border: 2px solid #e2e8f0;
		border-radius: 10px;
		padding: 1rem;
		cursor: pointer;
		transition: border-color 0.15s;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.route-card:hover,
	.route-card.selected {
		border-color: #1e40af;
	}

	.card-top h4 {
		font-size: 0.95rem;
		font-weight: 700;
		color: #1e293b;
	}

	.card-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 0.75rem;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.stat-icon {
		font-size: 0.9rem;
		flex-shrink: 0;
		color: #64748b;
	}

	.stat-label {
		display: block;
		font-size: 0.7rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.stat-val {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: #1e293b;
	}

	/* Wind-Bar */
	.wind-bar-wrap {
		display: flex;
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
		background: #f1f5f9;
	}

	.wind-bar-fill {
		height: 100%;
		transition: width 0.4s ease;
	}

	.wind-bar-fill.headwind {
		background: #ef4444;
	}

	.wind-bar-fill.tailwind {
		background: #22c55e;
	}

	.wind-bar-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.72rem;
		color: #64748b;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.btn-gpx {
		flex: 1;
		padding: 0.5rem;
		background: #1e40af;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-gpx:hover {
		background: #1d3a9e;
	}

	.btn-delete {
		padding: 0.5rem 0.6rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.15s;
	}

	.btn-delete:hover {
		background: #fee2e2;
	}

	/* Info-Box */
	.info-box {
		background: #fffbeb;
		border: 1px solid #fde68a;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		font-size: 0.88rem;
		color: #78350f;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.info-box strong {
		font-size: 0.9rem;
	}

	/* Karten-Bereich */
	.map-area {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.map-header {
		padding: 0.9rem 1.25rem;
		border-bottom: 1px solid #e2e8f0;
		background: white;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.map-header h2 {
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
	}

	.map-legend {
		display: flex;
		gap: 1rem;
		font-size: 0.8rem;
		color: #475569;
	}

	.map-placeholder {
		flex: 1;
		display: flex;
		background: #dde8f0;
		overflow: hidden;
	}

	/* Stretch MapView to fill the entire area */
	.map-placeholder > :global(.map-container) {
		flex: 1;
	}

	.map-empty {
		margin: auto;
		text-align: center;
		color: #475569;
		font-size: 0.95rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
