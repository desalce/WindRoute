<script>
	import MiniMap from '$lib/components/MiniMap.svelte';

	/** @typedef {import('$lib/models/route.js').Route} Route */

	let { data } = $props();

	// Lokale Liste — wird bei Löschen aktualisiert ohne Seiten-Reload
	/** @type {Route[]} */
	let routes = $state(data.routes);

	// Sortierung: 'date' = neueste zuerst (Standard), 'distance' = längste zuerst
	/** @type {'date' | 'distance'} */
	let sortBy = $state('date');

	/** Sortierte Ansicht der Routen */
	let sortedRoutes = $derived(
		[...routes].sort((a, b) => {
			if (sortBy === 'distance') return b.actualDistanceKm - a.actualDistanceKm;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		})
	);

	// Löschen-State: welche ID gerade gelöscht wird
	/** @type {string | null} */
	let deletingId = $state(null);

	/** Route aus DB und lokaler Liste entfernen */
	/** @param {string} id */
	async function deleteRoute(id) {
		deletingId = id;
		try {
			const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
			if (res.ok || res.status === 404) {
				routes = routes.filter((r) => String(r._id) !== id);
			}
		} finally {
			deletingId = null;
		}
	}

	/** GPX-Datei für eine Route erzeugen und herunterladen */
	/** @param {Route} route */
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

	/** Windrichtung als Himmelsrichtung */
	/** @param {number} deg */
	function windDirLabel(deg) {
		const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
		return dirs[Math.round(deg / 45) % 8];
	}

	/** Datum formatieren */
	/** @param {string | Date} iso */
	function formatDate(iso) {
		return new Date(iso).toLocaleDateString('de-CH', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Meine Routen – WindRoute</title>
</svelte:head>

<main class="archive">
	<div class="archive-header">
		<div class="header-left">
			<h1>Meine Routen</h1>
			{#if routes.length > 0}
				<span class="route-count">{routes.length} {routes.length === 1 ? 'Route' : 'Routen'}</span>
			{/if}
		</div>
		<div class="header-right">
			{#if routes.length > 1}
				<div class="sort-toggle" role="group" aria-label="Sortierung">
					<button
						class:active={sortBy === 'date'}
						onclick={() => (sortBy = 'date')}
					>Neueste zuerst</button>
					<button
						class:active={sortBy === 'distance'}
						onclick={() => (sortBy = 'distance')}
					>Längste zuerst</button>
				</div>
			{/if}
			<a href="/" class="btn-primary">+ Neue Route</a>
		</div>
	</div>

	{#if routes.length === 0}
		<div class="empty-state">
			<div class="empty-icon">🚴</div>
			<h2>Noch keine Routen gespeichert</h2>
			<p>Generiere deine erste Route und sie wird automatisch hier gespeichert.</p>
			<a href="/" class="btn-primary">Erste Route generieren</a>
		</div>
	{:else}
		<div class="route-grid">
			{#each sortedRoutes as route (route._id)}
				<div class="route-card">
					<!-- Mini-Karte -->
					<div class="mini-map-wrap">
						<MiniMap {route} wind={route.wind} />
					</div>

					<!-- Kopfzeile: Sportart + Datum -->
					<div class="card-header">
						<span class="sport-badge {route.sport}">
							{route.sport === 'road' ? 'Rennrad' : 'Gravel'}
						</span>
						<span class="date">{formatDate(route.createdAt)}</span>
					</div>

					<!-- Name + Startpunkt -->
					<h2 class="route-name">{route.name}</h2>
					<p class="start-label">📍 {route.startLabel}</p>

					<!-- Statistiken -->
					<div class="stats">
						<div class="stat">
							<span class="stat-label">Distanz</span>
							<span class="stat-value">{route.actualDistanceKm} km</span>
						</div>
						<div class="stat">
							<span class="stat-label">Dauer</span>
							<span class="stat-value">{route.durationMin} min</span>
						</div>
						<div class="stat">
							<span class="stat-label">Höhenmeter</span>
							<span class="stat-value">{route.elevationGainM} m</span>
						</div>
						<div class="stat">
							<span class="stat-label">Rückenwind</span>
							<span class="stat-value">{route.tailwindPercent}%</span>
						</div>
					</div>

					<!-- Wind-Balken -->
					<div class="wind-bar-wrap" title="{100 - route.tailwindPercent}% Gegenwind, {route.tailwindPercent}% Rückenwind">
						<div class="wind-bar-fill headwind" style="width: {100 - route.tailwindPercent}%"></div>
						<div class="wind-bar-fill tailwind" style="width: {route.tailwindPercent}%"></div>
					</div>
					<div class="wind-bar-labels">
						<span>🔴 Gegenwind</span>
						<span>🟢 Rückenwind</span>
					</div>

					<!-- Winddaten -->
					<div class="wind-info">
						<span class="wind-icon">💨</span>
						{route.wind.speedKmh} km/h aus {windDirLabel(route.wind.directionDeg)}
					</div>

					<!-- Aktions-Buttons -->
					<div class="card-actions">
						<button
							class="btn-gpx"
							onclick={() => exportGpx(route)}
							title="Als GPX herunterladen"
						>
							↓ GPX
						</button>
						<button
							class="btn-delete"
							onclick={() => deleteRoute(String(route._id))}
							disabled={deletingId === String(route._id)}
							title="Route löschen"
							aria-label="Route löschen"
						>
							{deletingId === String(route._id) ? '…' : '🗑'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</main>

<style>
	.archive {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.archive-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
	}

	.route-count {
		font-size: 0.9rem;
		color: #64748b;
		font-weight: 500;
	}

	/* Sortier-Toggle */
	.sort-toggle {
		display: flex;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		overflow: hidden;
	}

	.sort-toggle button {
		padding: 0.45rem 0.9rem;
		border: none;
		background: white;
		color: #475569;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.sort-toggle button:first-child {
		border-right: 1px solid #cbd5e1;
	}

	.sort-toggle button.active {
		background: #1e40af;
		color: white;
	}

	.btn-primary {
		background: #1e40af;
		color: white;
		padding: 0.6rem 1.2rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.btn-primary:hover {
		background: #1d3a9e;
	}

	/* Leerer Zustand */
	.empty-state {
		text-align: center;
		padding: 5rem 2rem;
		color: #64748b;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.empty-icon {
		font-size: 3rem;
	}

	.empty-state h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: #1e293b;
	}

	.empty-state p {
		font-size: 0.95rem;
		max-width: 360px;
	}

	/* Routen-Grid */
	.route-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.25rem;
	}

	.route-card {
		background: white;
		border-radius: 12px;
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		border: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		transition: box-shadow 0.15s;
	}

	.route-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	/* Mini-Karte */
	.mini-map-wrap {
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid #e2e8f0;
	}

	/* Kopfzeile */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sport-badge {
		font-size: 0.72rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.sport-badge.road {
		background: #dbeafe;
		color: #1e40af;
	}

	.sport-badge.gravel {
		background: #dcfce7;
		color: #166534;
	}

	.date {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.route-name {
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
	}

	.start-label {
		font-size: 0.82rem;
		color: #64748b;
	}

	/* Statistiken */
	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.4rem 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.stat-label {
		font-size: 0.7rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.stat-value {
		font-size: 0.95rem;
		font-weight: 600;
		color: #1e293b;
	}

	/* Wind-Balken */
	.wind-bar-wrap {
		display: flex;
		height: 5px;
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

	.wind-bar-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		color: #64748b;
	}

	/* Wind-Info */
	.wind-info {
		font-size: 0.82rem;
		color: #475569;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding-top: 0.25rem;
		border-top: 1px solid #f1f5f9;
	}

	/* Aktions-Buttons */
	.card-actions {
		display: flex;
		gap: 0.5rem;
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
		padding: 0.5rem 0.65rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.15s;
		min-width: 36px;
	}

	.btn-delete:hover:not(:disabled) {
		background: #fee2e2;
	}

	.btn-delete:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
