<script>
	import { enhance } from '$app/forms';

	let { form } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Registrieren – WindRoute</title>
</svelte:head>

<div class="auth-shell">
	<div class="auth-card">
		<div class="auth-header">
			<svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M36 0H12C5.37258 0 0 5.37258 0 12V36C0 42.6274 5.37258 48 12 48H36C42.6274 48 48 42.6274 48 36V12C48 5.37258 42.6274 0 36 0Z" fill="#1E40AF"/>
				<path d="M15 23L34 14L25 33L23 25L15 23Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<h1>Konto erstellen</h1>
			<p>Speichere und verwalte deine Trainingsrouten.</p>
		</div>

		{#if form?.error}
			<p class="error-msg">{form.error}</p>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<label for="displayName">Name <span class="optional">(optional)</span></label>
			<input
				id="displayName"
				name="displayName"
				type="text"
				autocomplete="name"
				value={form?.displayName ?? ''}
				placeholder="Max Mustermann"
			/>

			<label for="email">E-Mail <span class="required">*</span></label>
			<input
				id="email"
				name="email"
				type="email"
				required
				autocomplete="email"
				value={form?.email ?? ''}
				placeholder="du@beispiel.ch"
			/>

			<label for="password">Passwort <span class="required">*</span></label>
			<input
				id="password"
				name="password"
				type="password"
				required
				autocomplete="new-password"
				minlength="8"
				placeholder="Mindestens 8 Zeichen"
			/>

			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'Konto wird erstellt…' : 'Konto erstellen'}
			</button>
		</form>

		<p class="switch-link">
			Bereits registriert? <a href="/login">Jetzt anmelden</a>
		</p>
	</div>
</div>

<style>
	.auth-shell {
		min-height: calc(100vh - 56px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		background: #f8fafc;
	}

	.auth-card {
		background: white;
		border-radius: 16px;
		padding: 2.5rem 2rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
		border: 1px solid #e2e8f0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.auth-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}

	.auth-header h1 {
		font-size: 1.4rem;
		font-weight: 700;
		color: #1e293b;
	}

	.auth-header p {
		font-size: 0.9rem;
		color: #64748b;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.82rem;
		font-weight: 600;
		color: #475569;
		margin-top: 0.5rem;
	}

	.optional {
		font-weight: 400;
		color: #94a3b8;
	}

	.required {
		color: #ef4444;
	}

	input {
		padding: 0.6rem 0.8rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
	}

	input:focus {
		border-color: #1e40af;
	}

	.btn-primary {
		margin-top: 0.75rem;
		padding: 0.7rem;
		background: #1e40af;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-primary:hover:not(:disabled) {
		background: #1d3a9e;
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error-msg {
		color: #dc2626;
		font-size: 0.85rem;
		padding: 0.6rem 0.8rem;
		background: #fef2f2;
		border-radius: 8px;
		border: 1px solid #fecaca;
	}

	.switch-link {
		text-align: center;
		font-size: 0.875rem;
		color: #64748b;
	}

	.switch-link a {
		color: #1e40af;
		font-weight: 600;
		text-decoration: none;
	}

	.switch-link a:hover {
		text-decoration: underline;
	}
</style>
