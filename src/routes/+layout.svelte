<script>
	import NavBar from '$lib/components/NavBar.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<NavBar />
<div class="app-shell">
	{@render children()}
</div>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f8fafc;
		color: #1e293b;
	}

	:global(a) {
		color: inherit;
	}

	.app-shell {
		min-height: calc(100vh - 56px);
	}
</style>
