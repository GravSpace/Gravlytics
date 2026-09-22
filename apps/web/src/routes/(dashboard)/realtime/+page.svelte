<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Activity, Radio, Users, FileText, ArrowUpRight, Sparkles } from '@lucide/svelte';
	import { fetchRealtime } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';

	interface ActivePath {
		path: string;
		visitors: number;
	}

	let activeVisitors = $state(0);
	let activePaths = $state<ActivePath[]>([]);
	let isLoading = $state(true);

	const sortedPaths = $derived([...activePaths].sort((a, b) => b.visitors - a.visitors));
	const maxVisitors = $derived(Math.max(...activePaths.map((p) => p.visitors), 1));

	async function loadRealtime() {
		try {
			const data = await fetchRealtime(siteStore.activeSiteId);
			activeVisitors = data.activeVisitors;
			activePaths = data.activePaths;
		} catch {
			// Query API offline or network issue
		} finally {
			isLoading = false;
		}
	}

	let lastSiteId = '';
	$effect(() => {
		const current = siteStore.activeSiteId;
		if (current && current !== lastSiteId) {
			lastSiteId = current;
			untrack(() => {
				loadRealtime();
			});
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadRealtime();
		}, 3000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Live Telemetry — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<!-- Hero Live Pulse Card -->
	<div class="relative overflow-hidden rounded-xl border border-themed bg-gradient-to-b from-indigo-500/10 to-transparent p-8 text-center shadow-xl" style="background-color: var(--card-bg-solid);">
		<!-- Background ambient glow -->
		<div class="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-indigo-500/20 blur-3xl"></div>

		<div class="relative z-10 flex flex-col items-center justify-center">
			<div class="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-medium text-emerald-500">
				<span class="relative flex h-2 w-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
				</span>
				<span>TELEMETRY ACTIVE (LAST 5 MIN)</span>
			</div>

			<div class="my-2 flex items-baseline justify-center">
				<span class="font-mono text-7xl sm:text-8xl font-black tracking-tight text-heading transition-all duration-300">
					{activeVisitors}
				</span>
			</div>

			<p class="text-sm font-medium text-body">Active Concurrent Visitors</p>
			<p class="mt-1 text-xs text-hint">Live deduplicated visitors active in the past 5 minutes</p>
		</div>
	</div>

	<!-- Active Paths Section -->
	<div class="card-inset p-5">
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
					<Activity size={14} strokeWidth={2} />
				</div>
				<h2 class="text-xs font-semibold uppercase tracking-wider text-body">Active Visited Pages</h2>
			</div>
			<span class="font-mono text-xs text-label">{sortedPaths.length} active paths</span>
		</div>

		{#if sortedPaths.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<Radio size={24} class="text-hint animate-pulse mb-2" />
				<span class="text-xs text-label">No active visitors detected in the last 5 minutes</span>
				<span class="text-[11px] text-hint mt-1 max-w-sm">Browse any page on your tracked site to see real-time paths appear instantly</span>
			</div>
		{:else}
			<div class="flex flex-col" style="border-color: var(--divider);">
				{#each sortedPaths as page, i}
					<div class="flex items-center justify-between py-2.5 px-2 hover:bg-card-hover rounded transition-colors" style="border-top: {i > 0 ? '1px solid var(--divider)' : 'none'};">
						<div class="flex items-center gap-2.5 min-w-0">
							<FileText size={14} class="text-hint shrink-0" />
							<span class="font-mono text-xs text-body truncate">{page.path}</span>
						</div>
						<div class="flex items-center gap-3 shrink-0 font-mono">
							<div class="h-1.5 rounded-full overflow-hidden w-24" style="background: var(--divider-strong);">
								<div
									class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
									style="width: {Math.max((page.visitors / maxVisitors) * 100, 5)}%"
								></div>
							</div>
							<span class="w-8 text-right text-xs font-bold text-heading">{page.visitors}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
