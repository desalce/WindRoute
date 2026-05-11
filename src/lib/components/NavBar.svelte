<script>
	import { page } from '$app/state';

	/** @type {{ user: { email: string; displayName: string | null } | null }} */
	let { user } = $props();

	/** Angezeigter Name: displayName wenn vorhanden, sonst E-Mail */
	let displayLabel = $derived(user?.displayName || user?.email || '');
</script>

<nav class="navbar">
	<a href="/" class="brand">
		<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_43_324)"><path d="M36 0H12C5.37258 0 0 5.37258 0 12V36C0 42.6274 5.37258 48 12 48H36C42.6274 48 48 42.6274 48 36V12C48 5.37258 42.6274 0 36 0Z" fill="#1E40AF"/><path d="M15 23L34 14L25 33L23 25L15 23Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_43_324"><rect width="48" height="48" fill="white"/></clipPath></defs></svg>
		<span class="brand-text">WindRoute</span>
	</a>

	<div class="links">
		<a href="/" class:active={page.url.pathname === '/'}>Route planen</a>

		{#if user}
			<a href="/routes" class:active={page.url.pathname === '/routes'}>Meine Routen</a>
		{/if}
	</div>

	<div class="auth-section">
		{#if user}
			<span class="user-label">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
				{displayLabel}
			</span>
			<form method="POST" action="/logout">
				<button type="submit" class="btn-logout">Logout</button>
			</form>
		{:else}
			<a href="/login" class="btn-auth">Anmelden</a>
			<a href="/register" class="btn-auth btn-auth--primary">Registrieren</a>
		{/if}
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
		gap: 1rem;
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
		flex-shrink: 0;
	}

	.links {
		display: flex;
		gap: 0.25rem;
		flex: 1;
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

	.auth-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.user-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.9);
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.btn-logout {
		background: rgba(255, 255, 255, 0.15);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		padding: 0.35rem 0.75rem;
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-logout:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	.btn-auth {
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		transition: background 0.15s, color 0.15s;
	}

	.btn-auth:hover {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}

	.btn-auth--primary {
		background: white;
		color: #1e40af;
		font-weight: 600;
	}

	.btn-auth--primary:hover {
		background: rgba(255, 255, 255, 0.9);
		color: #1e40af;
	}

	@media (max-width: 600px) {
		.navbar {
			padding: 0 0.75rem;
			gap: 0.25rem;
		}

		.brand-text {
			display: none;
		}

		.links a {
			padding: 0.4rem 0.5rem;
			font-size: 0.8rem;
		}

		.user-label {
			display: none;
		}

		.btn-auth,
		.btn-logout {
			padding: 0.35rem 0.6rem;
			font-size: 0.8rem;
		}
	}
</style>
