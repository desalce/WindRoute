<script>
	/** @type {{ speedKmh: number, directionDeg: number }} */
	let { speedKmh, directionDeg } = $props();

	/** @param {number} deg */
	function dirLabel(deg) {
		const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
		return dirs[Math.round(deg / 45) % 8];
	}

	/** Pfeil zeigt woher der Wind kommt */
	let arrowRotation = $derived(directionDeg);
</script>

<div class="wind-box">
	<div class="wind-top">
		<span class="wind-label">Aktueller Wind</span>
	</div>
	<div class="wind-main">
		<svg
			class="wind-arrow"
			style="transform: rotate({arrowRotation}deg)"
			xmlns="http://www.w3.org/2000/svg"
			width="32"
			height="32"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<line x1="12" y1="19" x2="12" y2="5" />
			<polyline points="5 12 12 5 19 12" />
		</svg>
		<div>
			<span class="wind-speed">{speedKmh} km/h</span>
			<span class="wind-dir">aus {dirLabel(directionDeg)}</span>
		</div>
	</div>
</div>

<style>
	.wind-box {
		background: #1e40af;
		color: white;
		border-radius: 10px;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.wind-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.75;
	}

	.wind-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.wind-arrow {
		flex-shrink: 0;
		opacity: 0.9;
		transition: transform 0.4s ease;
	}

	.wind-speed {
		display: block;
		font-size: 1.4rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.wind-dir {
		font-size: 0.9rem;
		opacity: 0.85;
	}
</style>
