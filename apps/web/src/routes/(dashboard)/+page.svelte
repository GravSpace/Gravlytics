<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import TimeSeriesChart from '$lib/components/TimeSeriesChart.svelte';
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';
	import {
		Users,
		Eye,
		Percent,
		Clock,
		Radio,
		FileText,
		Compass,
		Globe,
		Building2,
		MapPin,
		MonitorSmartphone,
		Activity
	} from '@lucide/svelte';
	import { fetchOverview, fetchTimeSeries, fetchBreakdown, type BreakdownItem, type TimeSeriesPoint } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let uniqueVisitors = $state(0);
	let totalPageviews = $state(0);
	let bounceRate = $state(0);
	let avgDuration = $state(0);
	let hasData = $state(false);
	let isLoading = $state(true);

	let chartData = $state<TimeSeriesPoint[]>([]);
	let topPages = $state<BreakdownItem[]>([]);
	let topSources = $state<BreakdownItem[]>([]);
	let topLocations = $state<BreakdownItem[]>([]);
	let geoDimension = $state<'country' | 'region' | 'city'>('country');
	let topDevices = $state<BreakdownItem[]>([]);

	const kpis = $derived([
		{ label: 'Unique Visitors', value: uniqueVisitors, icon: Users, subtitle: 'Total daily unique' },
		{ label: 'Total Pageviews', value: totalPageviews, icon: Eye, subtitle: 'Raw page views' },
		{ label: 'Bounce Rate', value: bounceRate, format: 'percent' as const, icon: Percent, subtitle: 'Single page sessions' },
		{ label: 'Avg. Duration', value: avgDuration, format: 'duration' as const, icon: Clock, subtitle: 'Time per session' }
	]);

	async function loadRealData() {
		try {
			const currentSite = siteStore.activeSiteId;
			if (!currentSite) return;
			const from = dateStore.from;
			const to = dateStore.to;

			const [overview, ts, pages, sources, locations, devices] = await Promise.all([
				fetchOverview(currentSite, from, to),
				fetchTimeSeries(currentSite, from, to),
				fetchBreakdown(currentSite, 'url_path', from, to, 10),
				fetchBreakdown(currentSite, 'referrer_domain', from, to, 10),
				fetchBreakdown(currentSite, geoDimension, from, to, 10),
				fetchBreakdown(currentSite, 'device_type', from, to, 10)
			]);

			uniqueVisitors = overview.visitors;
			totalPageviews = overview.pageviews;
			bounceRate = overview.bounceRate;
			avgDuration = overview.avgDurationSec;
			chartData = ts;
			topPages = pages;
			topSources = sources;
			topLocations = locations;
			topDevices = devices;

			hasData = overview.pageviews > 0;
		} catch {
			// Failed to reach query API
		} finally {
			isLoading = false;
		}
	}

	async function switchGeoDimension(dim: 'country' | 'region' | 'city') {
		geoDimension = dim;
		const currentSite = siteStore.activeSiteId;
		if (currentSite) {
			topLocations = await fetchBreakdown(currentSite, dim, dateStore.from, dateStore.to, 10);
		}
	}

	let lastSiteId = '';
	let lastDateVersion = -1;

	$effect(() => {
		const current = siteStore.activeSiteId;
		const ver = dateStore.version;
		if (current && (current !== lastSiteId || ver !== lastDateVersion)) {
			lastSiteId = current;
			lastDateVersion = ver;
			untrack(() => {
				loadRealData();
			});
		}
	});

	onMount(() => {
		loadRealData();
		const interval = setInterval(() => {
			loadRealData();
		}, 10000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Overview — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<!-- Top status banner when awaiting initial traffic -->
	{#if !hasData && !isLoading}
		<div class="flex items-center justify-between rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 px-4 text-xs">
			<div class="flex items-center gap-3">
				<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
					<Radio size={14} class="animate-pulse" />
				</div>
				<div>
					<span class="font-semibold text-heading">Tracking active for {siteStore.activeSiteId}</span>
					<span class="text-slate-400 ml-1.5 hidden sm:inline">Waiting for incoming events. Open your tracked website to populate metrics!</span>
				</div>
			</div>
			<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-400 border border-emerald-500/20">
				<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
				Awaiting Traffic
			</span>
		</div>
	{/if}

	<!-- KPI Metric Cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		{#each kpis as kpi}
			<KPICard {...kpi} />
		{/each}
	</div>

	<!-- Time Series Chart -->
	<TimeSeriesChart data={chartData} />

	<!-- Breakdown Tables -->
	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<BreakdownTable title="Top Pages" items={topPages} icon={FileText} metricLabel="Pageviews" />
		<BreakdownTable title="Top Referrers" items={topSources} icon={Compass} metricLabel="Visitors" />
		
		<!-- Geographic Distribution with Country / Region / City switcher -->
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between px-1">
				<span class="text-xs font-medium text-label">Geographic View:</span>
				<div class="flex items-center gap-1 rounded bg-input p-0.5 border border-themed text-[11px]">
					<button
						onclick={() => switchGeoDimension('country')}
						class="rounded px-2 py-0.5 font-medium transition-colors {geoDimension === 'country' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}"
					>
						Countries
					</button>
					<button
						onclick={() => switchGeoDimension('region')}
						class="rounded px-2 py-0.5 font-medium transition-colors {geoDimension === 'region' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}"
					>
						Regions
					</button>
					<button
						onclick={() => switchGeoDimension('city')}
						class="rounded px-2 py-0.5 font-medium transition-colors {geoDimension === 'city' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}"
					>
						Cities
					</button>
				</div>
			</div>
			<BreakdownTable
				title={geoDimension === 'country' ? 'Top Countries' : geoDimension === 'region' ? 'Top Regions & Provinces' : 'Top Cities & Metros'}
				items={topLocations}
				icon={geoDimension === 'country' ? Globe : geoDimension === 'region' ? MapPin : Building2}
				metricLabel="Visitors"
			/>
		</div>

		<BreakdownTable title="Device Categories" items={topDevices} icon={MonitorSmartphone} metricLabel="Visitors" />
	</div>
</div>
