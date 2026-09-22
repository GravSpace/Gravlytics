<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData, ActionData } from './$types';
	import KPICard from '$lib/components/KPICard.svelte';
	import TimeSeriesChart from '$lib/components/TimeSeriesChart.svelte';
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';
	import {
		Users,
		Eye,
		Percent,
		Clock,
		Globe,
		FileText,
		Compass,
		MonitorSmartphone,
		Lock,
		KeyRound,
		ExternalLink,
		Calendar
	} from '@lucide/svelte';
	import { fetchOverview, fetchTimeSeries, fetchBreakdown, type BreakdownItem, type TimeSeriesPoint } from '$lib/api';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let passwordInput = $state('');
	let dateRange = $state<'24h' | '7d' | '30d'>('7d');

	let uniqueVisitors = $state(0);
	let totalPageviews = $state(0);
	let bounceRate = $state(0);
	let avgDuration = $state(0);
	let isLoading = $state(true);

	let chartData = $state<TimeSeriesPoint[]>([]);
	let topPages = $state<BreakdownItem[]>([]);
	let topSources = $state<BreakdownItem[]>([]);
	let topLocations = $state<BreakdownItem[]>([]);
	let topDevices = $state<BreakdownItem[]>([]);

	const kpis = $derived([
		{ label: 'Unique Visitors', value: uniqueVisitors, icon: Users, subtitle: 'Total daily unique' },
		{ label: 'Total Pageviews', value: totalPageviews, icon: Eye, subtitle: 'Raw page views' },
		{ label: 'Bounce Rate', value: bounceRate, format: 'percent' as const, icon: Percent, subtitle: 'Single page sessions' },
		{ label: 'Avg. Duration', value: avgDuration, format: 'duration' as const, icon: Clock, subtitle: 'Time per session' }
	]);

	function calculateDateRange(range: '24h' | '7d' | '30d') {
		const now = new Date();
		const to = now.toISOString().split('T')[0];
		const fromDate = new Date();
		if (range === '24h') {
			fromDate.setDate(now.getDate() - 1);
		} else if (range === '7d') {
			fromDate.setDate(now.getDate() - 7);
		} else {
			fromDate.setDate(now.getDate() - 30);
		}
		const from = fromDate.toISOString().split('T')[0];
		return { from, to };
	}

	async function loadStats() {
		if (data.requiresPassword) return;
		isLoading = true;
		try {
			const { from, to } = calculateDateRange(dateRange);
			const trackingId = data.site.trackingId;

			const [overview, ts, pages, sources, locations, devices] = await Promise.all([
				fetchOverview(trackingId, from, to),
				fetchTimeSeries(trackingId, from, to),
				fetchBreakdown(trackingId, 'url_path', from, to, 10),
				fetchBreakdown(trackingId, 'referrer_domain', from, to, 10),
				fetchBreakdown(trackingId, 'country', from, to, 10),
				fetchBreakdown(trackingId, 'device_type', from, to, 10)
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
		} catch (err) {
			console.error('Failed to load shared stats', err);
		} finally {
			isLoading = false;
		}
	}

	function switchRange(range: '24h' | '7d' | '30d') {
		dateRange = range;
		loadStats();
	}

	onMount(() => {
		loadStats();
	});
</script>

<svelte:head>
	<title>{data.site.name || data.site.domain} — Public Analytics | Gravlytics</title>
</svelte:head>

<div class="min-h-screen bg-canvas text-body">
	<!-- Top Navigation Bar -->
	<header class="border-b border-themed bg-card/60 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5">
		<div class="max-w-7xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="gradient-accent flex h-9 w-9 items-center justify-center rounded-lg shadow-md shadow-primary/20 text-white font-bold text-sm">
					G
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h1 class="font-bold text-heading text-sm sm:text-base leading-tight">
							{data.site.name || data.site.domain}
						</h1>
						<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
							<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
							Live Dashboard
						</span>
					</div>
					<a
						href="https://{data.site.domain}"
						target="_blank"
						rel="noopener noreferrer"
						class="text-xs text-label hover:text-indigo-400 flex items-center gap-1 transition-colors"
					>
						<span>{data.site.domain}</span>
						<ExternalLink size={10} />
					</a>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#if !data.requiresPassword}
					<div class="flex items-center rounded-lg bg-input p-0.5 border border-themed text-xs">
						<button
							onclick={() => switchRange('24h')}
							class="rounded px-2.5 py-1 font-medium transition-colors {dateRange === '24h' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
						>
							24h
						</button>
						<button
							onclick={() => switchRange('7d')}
							class="rounded px-2.5 py-1 font-medium transition-colors {dateRange === '7d' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
						>
							7d
						</button>
						<button
							onclick={() => switchRange('30d')}
							class="rounded px-2.5 py-1 font-medium transition-colors {dateRange === '30d' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
						>
							30d
						</button>
					</div>
				{/if}

				<a
					href="/"
					class="btn-ghost hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-label hover:text-heading transition-colors"
				>
					<span>Powered by Gravlytics</span>
				</a>
			</div>
		</div>
	</header>

	<!-- Main Content Area -->
	<main class="max-w-7xl mx-auto px-4 lg:px-8 py-6">
		{#if data.requiresPassword}
			<!-- Password Gate -->
			<div class="flex min-h-[60vh] items-center justify-center">
				<div class="glass-card w-full max-w-md p-8 text-center shadow-xl">
					<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
						<Lock size={22} />
					</div>
					<h2 class="text-xl font-bold text-heading">Protected Dashboard</h2>
					<p class="mt-1.5 text-xs text-label leading-relaxed">
						The analytics for <strong class="text-heading">{data.site.name || data.site.domain}</strong> are password-protected.
					</p>

					{#if form?.error}
						<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
							{form.error}
						</div>
					{/if}

					<form method="POST" action="?/unlock" class="mt-6 flex flex-col gap-3">
						<div class="relative">
							<KeyRound size={14} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-label" />
							<input
								type="password"
								name="password"
								bind:value={passwordInput}
								placeholder="Enter dashboard password..."
								required
								class="w-full rounded-lg border border-themed bg-input pl-9 pr-3.5 py-2.5 text-xs text-heading placeholder:text-hint focus:border-indigo-500 outline-none transition-colors"
							/>
						</div>
						<button
							type="submit"
							class="rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
						>
							Unlock Dashboard
						</button>
					</form>
				</div>
			</div>
		{:else}
			<!-- Analytics Dashboard -->
			<div class="flex flex-col gap-5">
				<!-- KPI Cards -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{#each kpis as kpi}
						<KPICard {...kpi} />
					{/each}
				</div>

				<!-- Time Series Chart -->
				<TimeSeriesChart data={chartData} />

				<!-- Breakdown Tables -->
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<BreakdownTable title="Top Pages" items={topPages} icon={FileText} metricLabel="Pageviews" />
					<BreakdownTable title="Top Referrers" items={topSources} icon={Compass} metricLabel="Visitors" />
					<BreakdownTable title="Top Countries" items={topLocations} icon={Globe} metricLabel="Visitors" />
					<BreakdownTable title="Devices" items={topDevices} icon={MonitorSmartphone} metricLabel="Visitors" />
				</div>
			</div>
		{/if}
	</main>
</div>
