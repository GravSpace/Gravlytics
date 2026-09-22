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
			? (portfolioSites.reduce((acc, s) => acc + (s.stats?.bounceRate || 0), 0) / portfolioSites.length).toFixed(1)
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

<div class="flex flex-col gap-6 max-w-6xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					<Layers size={18} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">Multi-Domain Network Portfolio</h1>
			</div>
			<p class="text-xs text-label mt-1">
				Consolidated performance rollup across all web properties managed in your workspace.
			</p>
		</div>

		<a
			href="/settings/sites"
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
		>
			<Plus size={14} />
			<span>Add Domain</span>
		</a>
	</div>

	<!-- Top Aggregate Metrics Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="card p-4 flex flex-col justify-between">
			<span class="text-xs font-medium text-label">Total Network Visitors</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-2xl font-bold tracking-tight text-heading font-mono">{totalVisitors.toLocaleString()}</p>
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					<Users size={14} />
				</div>
			</div>
			<span class="mt-2 text-[10px] text-hint">Last 30 days aggregate</span>
		</div>

		<div class="card p-4 flex flex-col justify-between">
			<span class="text-xs font-medium text-label">Total Pageviews</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-2xl font-bold tracking-tight text-heading font-mono">{totalPageviews.toLocaleString()}</p>
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
					<Eye size={14} />
				</div>
			</div>
			<span class="mt-2 text-[10px] text-hint">Across all sites</span>
		</div>

		<div class="card p-4 flex flex-col justify-between">
			<span class="text-xs font-medium text-label">Tracked Domains</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-2xl font-bold tracking-tight text-heading font-mono">{portfolioSites.length}</p>
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
					<Globe size={14} />
				</div>
			</div>
			<span class="mt-2 text-[10px] text-hint">Active properties</span>
		</div>

		<div class="card p-4 flex flex-col justify-between">
			<span class="text-xs font-medium text-label">Avg Bounce Rate</span>
			<div class="mt-2 flex items-baseline justify-between">
				<p class="text-2xl font-bold tracking-tight text-heading font-mono">{avgBounceRate}%</p>
				<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
					<Activity size={14} />
				</div>
			</div>
			<span class="mt-2 text-[10px] text-hint">Network average</span>
		</div>
	</div>

	<!-- Domain Leaderboard Table -->
	<div class="card p-5 flex flex-col gap-4">
		<div class="flex items-center justify-between border-b border-themed pb-3">
			<h2 class="text-sm font-bold text-heading">Domain Performance Leaderboard</h2>
			<span class="text-[11px] text-hint">Sorted by 30-day visitors</span>
		</div>

		{#if isLoading}
			<div class="flex h-40 items-center justify-center">
				<Clock size={20} class="animate-spin text-indigo-400" />
			</div>
		{:else if portfolioSites.length === 0}
			<div class="p-10 text-center flex flex-col items-center">
				<Globe size={24} class="text-slate-500 mb-2" />
				<h3 class="text-sm font-semibold text-heading">No sites registered yet</h3>
				<p class="text-xs text-label mt-1 mb-4">Register your first website domain to see cross-site telemetry rollup.</p>
				<a href="/settings/sites" class="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white">
					Register Site
				</a>
			</div>
		{:else}
			<div class="rounded-lg border border-themed divide-y divide-themed overflow-hidden">
				<div class="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold text-label bg-sidebar">
					<span class="col-span-5">Domain & Property</span>
					<span class="col-span-2 text-right">Visitors</span>
					<span class="col-span-2 text-right">Pageviews</span>
					<span class="col-span-1 text-right">Bounce</span>
					<span class="col-span-2 text-right">Action</span>
				</div>

				{#each [...portfolioSites].sort((a, b) => (b.stats?.visitors || 0) - (a.stats?.visitors || 0)) as site}
					<div class="grid grid-cols-12 gap-3 p-3 px-4 items-center text-xs hover:bg-card-hover transition-colors">
						<div class="col-span-5 flex items-center gap-2.5">
							<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
								<Globe size={13} />
							</div>
							<div class="flex flex-col truncate">
								<span class="font-semibold text-heading truncate">{site.name}</span>
								<span class="font-mono text-[11px] text-label truncate">{site.domain}</span>
							</div>
						</div>

						<div class="col-span-2 text-right font-mono text-body">
							{site.stats ? site.stats.visitors.toLocaleString() : '—'}
						</div>

						<div class="col-span-2 text-right font-mono text-indigo-400 font-semibold">
							{site.stats ? site.stats.pageviews.toLocaleString() : '—'}
						</div>

						<div class="col-span-1 text-right font-mono text-hint">
							{site.stats ? `${site.stats.bounceRate}%` : '—'}
						</div>

						<div class="col-span-2 flex items-center justify-end">
							<button
								type="button"
								onclick={() => selectAndNavigate(site)}
								class="flex items-center gap-1 rounded bg-input px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-heading hover:bg-card-hover transition-colors"
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
