<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Globe,
		TrendingUp,
		Users,
		Eye,
		Activity,
		ExternalLink,
		Plus,
		ArrowRight,
		Clock,
		Sparkles,
		Layers
	} from '@lucide/svelte';
	import { siteStore, type SiteInfo } from '$lib/stores/site.svelte';
	import { fetchOverview, type OverviewStats } from '$lib/api';

	interface SiteWithStats extends SiteInfo {
		stats?: OverviewStats;
		isLoadingStats?: boolean;
	}

	let portfolioSites = $state<SiteWithStats[]>([]);
	let isLoading = $state(true);

	const totalVisitors = $derived(
		portfolioSites.reduce((acc, s) => acc + (s.stats?.visitors || 0), 0)
	);
	const totalPageviews = $derived(
		portfolioSites.reduce((acc, s) => acc + (s.stats?.pageviews || 0), 0)
	);
	const avgBounceRate = $derived(
		portfolioSites.length > 0
			? (
					portfolioSites.reduce((acc, s) => acc + (s.stats?.bounceRate || 0), 0) /
					portfolioSites.length
				).toFixed(1)
			: '0.0'
	);

	async function loadPortfolio() {
		isLoading = true;
		try {
			const res = await fetch('/api/sites');
			if (res.ok) {
				const sites: SiteInfo[] = await res.json();
				portfolioSites = sites.map((s) => ({
					...s,
					isLoadingStats: true
				}));

				// Load overview metrics concurrently for each site
				await Promise.all(
					portfolioSites.map(async (site, idx) => {
						try {
							const stats = await fetchOverview(site.trackingId, '30d');
							portfolioSites[idx].stats = stats;
						} catch {
							portfolioSites[idx].stats = {
								visitors: 0,
								pageviews: 0,
								sessions: 0,
								bounces: 0,
								bounceRate: 0,
								avgDurationSec: 0
							};
						} finally {
							portfolioSites[idx].isLoadingStats = false;
						}
					})
				);
			}
		} catch (err) {
			console.error('Failed to load portfolio rollup', err);
		} finally {
			isLoading = false;
		}
	}

	function selectAndNavigate(site: SiteInfo) {
		siteStore.setSite(site.trackingId);
		window.location.href = '/';
	}

	onMount(() => {
		loadPortfolio();
	});
</script>

<svelte:head>
	<title>Multi-Domain Network Portfolio — Gravlytics</title>
</svelte:head>

<div class="flex max-w-full flex-col gap-6">
	<!-- Page Header -->
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
				>
					<Layers size={18} />
				</div>
				<h1 class="text-heading text-xl font-bold tracking-tight">
					Multi-Domain Network Portfolio
				</h1>
			</div>
			<p class="text-label mt-1 text-xs">
				Consolidated performance rollup across all web properties managed in your workspace.
			</p>
		</div>

		<a
			href="/settings/sites"
			class="flex items-center gap-1.5 self-start rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 sm:self-auto"
		>
			<Plus size={14} />
			<span>Add Domain</span>
		</a>
	</div>

	<!-- Top Aggregate Metrics Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="card flex flex-col justify-between p-4">
			<span class="text-label text-xs font-medium">Total Network Visitors</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-heading font-mono text-2xl font-bold tracking-tight">
					{totalVisitors.toLocaleString()}
				</p>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
				>
					<Users size={14} />
				</div>
			</div>
			<span class="text-hint mt-2 text-[10px]">Last 30 days aggregate</span>
		</div>

		<div class="card flex flex-col justify-between p-4">
			<span class="text-label text-xs font-medium">Total Pageviews</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-heading font-mono text-2xl font-bold tracking-tight">
					{totalPageviews.toLocaleString()}
				</p>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
				>
					<Eye size={14} />
				</div>
			</div>
			<span class="text-hint mt-2 text-[10px]">Across all sites</span>
		</div>

		<div class="card flex flex-col justify-between p-4">
			<span class="text-label text-xs font-medium">Tracked Domains</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-heading font-mono text-2xl font-bold tracking-tight">
					{portfolioSites.length}
				</p>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400"
				>
					<Globe size={14} />
				</div>
			</div>
			<span class="text-hint mt-2 text-[10px]">Active properties</span>
		</div>

		<div class="card flex flex-col justify-between p-4">
			<span class="text-label text-xs font-medium">Avg Bounce Rate</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-heading font-mono text-2xl font-bold tracking-tight">{avgBounceRate}%</p>
				<div
					class="flex h-7 w-7 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400"
				>
					<Activity size={14} />
				</div>
			</div>
			<span class="text-hint mt-2 text-[10px]">Network average</span>
		</div>
	</div>

	<!-- Domain Leaderboard Table -->
	<div class="card flex flex-col gap-4 p-5">
		<div class="border-themed flex items-center justify-between border-b pb-3">
			<h2 class="text-heading text-sm font-bold">Domain Performance Leaderboard</h2>
			<span class="text-hint text-[11px]">Sorted by 30-day visitors</span>
		</div>

		{#if isLoading}
			<div class="flex h-40 items-center justify-center">
				<Clock size={20} class="animate-spin text-indigo-400" />
			</div>
		{:else if portfolioSites.length === 0}
			<div class="flex flex-col items-center p-10 text-center">
				<Globe size={24} class="mb-2 text-slate-500" />
				<h3 class="text-heading text-sm font-semibold">No sites registered yet</h3>
				<p class="text-label mt-1 mb-4 text-xs">
					Register your first website domain to see cross-site telemetry rollup.
				</p>
				<a
					href="/settings/sites"
					class="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white"
				>
					Register Site
				</a>
			</div>
		{:else}
			<div class="border-themed divide-themed divide-y overflow-hidden rounded-lg border">
				<div
					class="text-label bg-sidebar grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold"
				>
					<span class="col-span-5">Domain & Property</span>
					<span class="col-span-2 text-right">Visitors</span>
					<span class="col-span-2 text-right">Pageviews</span>
					<span class="col-span-1 text-right">Bounce</span>
					<span class="col-span-2 text-right">Action</span>
				</div>

				{#each [...portfolioSites].sort((a, b) => (b.stats?.visitors || 0) - (a.stats?.visitors || 0)) as site}
					<div
						class="hover:bg-card-hover grid grid-cols-12 items-center gap-3 p-3 px-4 text-xs transition-colors"
					>
						<div class="col-span-5 flex items-center gap-2.5">
							<div
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
							>
								<Globe size={13} />
							</div>
							<div class="flex flex-col truncate">
								<span class="text-heading truncate font-semibold">{site.name}</span>
								<span class="text-label truncate font-mono text-[11px]">{site.domain}</span>
							</div>
						</div>

						<div class="text-body col-span-2 text-right font-mono">
							{site.stats ? site.stats.visitors.toLocaleString() : '—'}
						</div>

						<div class="col-span-2 text-right font-mono font-semibold text-indigo-400">
							{site.stats ? site.stats.pageviews.toLocaleString() : '—'}
						</div>

						<div class="text-hint col-span-1 text-right font-mono">
							{site.stats ? `${site.stats.bounceRate}%` : '—'}
						</div>

						<div class="col-span-2 flex items-center justify-end">
							<button
								type="button"
								onclick={() => selectAndNavigate(site)}
								class="bg-input hover:text-heading hover:bg-card-hover flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors"
							>
								<span>Dashboard</span>
								<ArrowRight size={11} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
