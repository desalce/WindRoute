<script>
	let { data } = $props();

	let loadingCheckout = $state(false);
	let loadingPortal = $state(false);
	let errorMsg = $state(/** @type {string | null} */ (null));

	const isPro = $derived(data.plan === 'pro' && data.subscriptionStatus === 'active');

	/** Datum des nächsten Abrechnungstermins formatieren */
	/** @param {string | null} iso */
	function formatPeriodEnd(iso) {
		if (!iso) return null;
		return new Date(iso).toLocaleDateString('de-CH', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
	}

	/** Pro-Checkout starten → weiterleiten zur Stripe-Seite */
	async function startCheckout() {
		loadingCheckout = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/billing/checkout', { method: 'POST' });
			const body = await res.json();
			if (!res.ok) {
				errorMsg = body.message ?? 'Checkout konnte nicht gestartet werden.';
				return;
			}
			window.location.href = body.url;
		} catch {
			errorMsg = 'Netzwerkfehler. Bitte versuche es erneut.';
		} finally {
			loadingCheckout = false;
		}
	}

	/** Stripe Customer Portal öffnen */
	async function openPortal() {
		loadingPortal = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/billing/portal', { method: 'POST' });
			const body = await res.json();
			if (!res.ok) {
				errorMsg = body.message ?? 'Abo-Verwaltung konnte nicht geöffnet werden.';
				return;
			}
			window.location.href = body.url;
		} catch {
			errorMsg = 'Netzwerkfehler. Bitte versuche es erneut.';
		} finally {
			loadingPortal = false;
		}
	}
</script>

<svelte:head>
	<title>Profil – WindRoute</title>
</svelte:head>

<main class="profile-page">
	<h1>Profileinstellungen</h1>

	<!-- Account-Info -->
	<section class="card">
		<h2>Account</h2>
		<div class="info-row">
			<span class="info-label">Name</span>
			<span class="info-value">{data.displayName ?? '–'}</span>
		</div>
		<div class="info-row">
			<span class="info-label">E-Mail</span>
			<span class="info-value">{data.email}</span>
		</div>
	</section>

	<!-- Plan & Abo -->
	<section class="card">
		<h2>Abo & Plan</h2>

		<div class="plan-row">
			<span class="plan-badge {data.plan}">
				{data.plan === 'pro' ? 'Pro' : 'Free'}
			</span>
			{#if isPro}
				<span class="plan-desc">Unbegrenzte Routen</span>
			{:else}
				<span class="plan-desc">Bis zu 3 gespeicherte Routen</span>
			{/if}
		</div>

		{#if isPro && data.subscriptionCurrentPeriodEnd}
			<p class="period-info">
				Nächste Abrechnung: <strong>{formatPeriodEnd(data.subscriptionCurrentPeriodEnd)}</strong>
			</p>
		{/if}

		{#if data.subscriptionStatus === 'canceled'}
			<p class="status-note canceled">
				Dein Abo wurde gekündigt. Pro bleibt aktiv bis {formatPeriodEnd(data.subscriptionCurrentPeriodEnd) ?? 'Ende der Laufzeit'}.
			</p>
		{/if}

		{#if data.subscriptionStatus === 'past_due'}
			<p class="status-note past-due">
				Deine letzte Zahlung ist fehlgeschlagen. Bitte aktualisiere deine Zahlungsmethode.
			</p>
		{/if}

		{#if errorMsg}
			<p class="error-msg">{errorMsg}</p>
		{/if}

		{#if isPro || data.subscriptionStatus === 'canceled'}
			<button class="btn-manage" onclick={openPortal} disabled={loadingPortal}>
				{loadingPortal ? 'Wird geöffnet…' : 'Abo verwalten'}
			</button>
		{:else}
			<div class="upgrade-box">
				<div class="upgrade-header">
					<strong>WindRoute Pro</strong>
					<span class="upgrade-price">5 CHF / Monat</span>
				</div>
				<ul class="upgrade-features">
					<li>✓ Unbegrenzte Routen speichern</li>
					<li>✓ Alle zukünftigen Features inklusive</li>
					<li>✓ Jederzeit kündbar</li>
				</ul>
				<button class="btn-upgrade" onclick={startCheckout} disabled={loadingCheckout}>
					{loadingCheckout ? 'Wird vorbereitet…' : 'Pro aktivieren – 5 CHF / Monat'}
				</button>
			</div>
		{/if}
	</section>
</main>

<style>
	.profile-page {
		max-width: 560px;
		margin: 2rem auto;
		padding: 0 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1e293b;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #e2e8f0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	h2 {
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
		border-bottom: 1px solid #f1f5f9;
		padding-bottom: 0.75rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.info-label {
		font-size: 0.85rem;
		color: #64748b;
		font-weight: 500;
	}

	.info-value {
		font-size: 0.9rem;
		color: #1e293b;
		font-weight: 600;
	}

	.plan-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.plan-badge {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.25rem 0.7rem;
		border-radius: 20px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.plan-badge.free {
		background: #f1f5f9;
		color: #475569;
	}

	.plan-badge.pro {
		background: #1e40af;
		color: white;
	}

	.plan-desc {
		font-size: 0.9rem;
		color: #475569;
	}

	.period-info {
		font-size: 0.85rem;
		color: #475569;
	}

	.status-note {
		font-size: 0.85rem;
		padding: 0.65rem 0.9rem;
		border-radius: 8px;
	}

	.status-note.canceled {
		background: #fffbeb;
		border: 1px solid #fde68a;
		color: #78350f;
	}

	.status-note.past-due {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}

	.error-msg {
		font-size: 0.85rem;
		padding: 0.65rem 0.9rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #dc2626;
	}

	.btn-manage {
		padding: 0.65rem 1.25rem;
		background: #f1f5f9;
		color: #1e293b;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		align-self: flex-start;
	}

	.btn-manage:hover:not(:disabled) {
		background: #e2e8f0;
	}

	.btn-manage:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.upgrade-box {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.upgrade-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.upgrade-header strong {
		font-size: 1rem;
		color: #1e293b;
	}

	.upgrade-price {
		font-size: 0.9rem;
		font-weight: 700;
		color: #1e40af;
	}

	.upgrade-features {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.upgrade-features li {
		font-size: 0.85rem;
		color: #475569;
	}

	.btn-upgrade {
		padding: 0.75rem 1.25rem;
		background: #1e40af;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-upgrade:hover:not(:disabled) {
		background: #1d3a9e;
	}

	.btn-upgrade:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
