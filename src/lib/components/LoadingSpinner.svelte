<script>
	/** @type {{ message?: string }} */
	let { message = 'Laden…' } = $props();
</script>

<div class="spinner-wrap">
	<div class="spinner"></div>
	<span>{message}</span>
</div>

<style>
	.spinner-wrap {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #64748b;
		font-size: 0.9rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid #e2e8f0;
		border-top-color: #1e40af;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
