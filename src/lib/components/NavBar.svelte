<script>
	import { page } from '$app/state';
</script>

<nav class="navbar">
	<a href="/" class="brand">
		<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
		WindRoute
	</a>
	<div class="links">
		<a href="/" class:active={page.url.pathname === '/'}>Route planen</a>
		<a href="/routes" class:active={page.url.pathname === '/routes'}>Meine Routen</a>
	</div>
</nav>

<style>
	.navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		height: 56px;
		background: #1e40af;
		color: white;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 1.1rem;
		color: white;
		text-decoration: none;
		letter-spacing: 0.01em;
	}

	.links {
		display: flex;
		gap: 0.25rem;
	}

	.links a {
		color: rgba(255, 255, 255, 0.8);
		text-decoration: none;
		padding: 0.4rem 0.9rem;
		border-radius: 6px;
		font-size: 0.9rem;
		transition: background 0.15s, color 0.15s;
	}

	.links a:hover,
	.links a.active {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}
</style>
