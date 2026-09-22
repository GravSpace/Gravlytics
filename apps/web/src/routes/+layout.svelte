<script lang="ts">
	import './layout.css';
	import type { Snippet } from 'svelte';
	import { themeStore } from '$lib/stores/theme.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Gravlytics — Where your data finds its center</title>
	<meta name="description" content="Privacy-first, self-hostable web analytics platform" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
	{@html `<script>
		try {
			var t = localStorage.getItem('gravlytics_theme');
			if (t === 'light' || (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)) {
				document.documentElement.classList.add('light');
				document.documentElement.classList.remove('dark');
				document.documentElement.setAttribute('data-theme', 'light');
			} else {
				document.documentElement.classList.add('dark');
				document.documentElement.classList.remove('light');
				document.documentElement.setAttribute('data-theme', 'dark');
			}
		} catch (e) {}
	</script>`}
</svelte:head>

{@render children()}
