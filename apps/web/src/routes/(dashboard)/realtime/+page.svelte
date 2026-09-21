<script lang="ts">
	import { onMount } from 'svelte';

	let activeVisitors = $state(23);
	let activePaths = $state([
		{ path: '/', visitors: 8 },
		{ path: '/docs/getting-started', visitors: 5 },
		{ path: '/pricing', visitors: 4 },
		{ path: '/blog/privacy-first', visitors: 3 },
		{ path: '/features', visitors: 2 },
		{ path: '/about', visitors: 1 }
	]);

	// Simulate realtime updates
	onMount(() => {
		const interval = setInterval(() => {
			activeVisitors = Math.max(1, activeVisitors + Math.round((Math.random() - 0.5) * 4));
			activePaths = activePaths.map((p) => ({
				...p,
				visitors: Math.max(0, p.visitors + Math.round((Math.random() - 0.5) * 2))
			}));
		}, 3000);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Realtime — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<!-- Big realtime counter -->
	<div class="glass-card flex flex-col items-center justify-center py-12">
		<div class="relative">
			<span
				class="gradient-accent-text text-7xl font-bold tabular-nums"
				style="transition: all 0.3s ease"
			>
				{activeVisitors}
			</span>
			<!-- Pulse indicator -->
			<span class="absolute -right-4 -top-1 flex h-3 w-3">
				<span
					class="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75"
				></span>
				<span class="relative inline-flex h-3 w-3 rounded-full bg-positive"></span>
			</span>
		</div>
		<p class="mt-3 text-sm text-muted-light">current visitors on site</p>
		<p class="mt-1 text-xs text-muted">Last 5 minutes</p>
	</div>

	<!-- Active pages -->
	<div class="glass-card p-5">
		<h3 class="mb-4 text-sm font-semibold text-white">⚡ Active Pages</h3>
		<div class="flex flex-col gap-3">
			{#each activePaths.sort((a, b) => b.visitors - a.visitors) as page}
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-light">{page.path}</span>
					<div class="flex items-center gap-2">
						<div
							class="h-2 rounded-full bg-accent/60"
							style="width: {Math.max(8, (page.visitors / Math.max(...activePaths.map((p) => p.visitors), 1)) * 120)}px; transition: width 0.5s ease"
						></div>
						<span class="w-6 text-right font-medium text-white tabular-nums">
							{page.visitors}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
