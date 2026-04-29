<script>
	/** @param {number} deg */
	function windDirLabel(deg) {
		const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
		return dirs[Math.round(deg / 45) % 8];
	}

	/** @param {string} iso */
	function formatDate(iso) {
		return new Date(iso).toLocaleDateString('de-CH', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	let { data } = $props();
</script>

<svelte:head>
	<title>Meine Routen – WindRoute</title>
</svelte:head>

<main class="archive">
	<div class="archive-header">
		<h1>Meine Routen</h1>
		<a href="/" class="btn-primary">+ Neue Route</a>
	</div>

	{#if data.routes.length === 0}
		<div class="empty-state">
			<p>Noch keine Routen gespeichert.</p>
			<a href="/" class="btn-primary">Erste Route generieren</a>
		</div>
	{:else}
		<div class="route-grid">
			{#each data.routes as route}
				<div class="route-card">
					<div class="card-header">
						<span class="sport-badge {route.sport}">{route.sport === 'road' ? 'Rennrad' : 'Gravel'}</span>
						<span class="date">{formatDate(route.createdAt)}</span>
					</div>

					<h2 class="route-name">{route.name}</h2>
					<p class="start-label">{route.startLabel}</p>

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

					<div class="wind-info">
						<span class="wind-icon">💨</span>
						{route.wind.speedKmh} km/h aus {windDirLabel(route.wind.directionDeg)}
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
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
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
	}

	.btn-primary:hover {
		background: #1d3a9e;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: #64748b;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.route-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	.route-card {
		background: white;
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		border: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sport-badge {
		font-size: 0.75rem;
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
		font-size: 1.05rem;
		font-weight: 700;
		color: #1e293b;
	}

	.start-label {
		font-size: 0.85rem;
		color: #64748b;
	}

	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 600;
		color: #1e293b;
	}

	.wind-info {
		font-size: 0.85rem;
		color: #475569;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding-top: 0.25rem;
		border-top: 1px solid #f1f5f9;
	}
</style>
