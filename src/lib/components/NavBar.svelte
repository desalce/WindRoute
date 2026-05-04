<script>
	import { page } from '$app/state';
</script>

<nav class="navbar">
	<a href="/" class="brand">
		<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_43_324)"><path d="M36 0H12C5.37258 0 0 5.37258 0 12V36C0 42.6274 5.37258 48 12 48H36C42.6274 48 48 42.6274 48 36V12C48 5.37258 42.6274 0 36 0Z" fill="#1E40AF"/><path d="M15 23L34 14L25 33L23 25L15 23Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_43_324"><rect width="48" height="48" fill="white"/></clipPath></defs></svg>
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
