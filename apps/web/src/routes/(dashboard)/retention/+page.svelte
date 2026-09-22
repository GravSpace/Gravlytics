<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Repeat, Calendar, Clock, Sparkles, RefreshCw, AlertCircle } from '@lucide/svelte';
	import { fetchRetention, type CohortItem } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';

	let granularity = $state<'week' | 'day'>('week');
	let cohorts = $state<CohortItem[]>([]);
	let isLoading = $state(true);

	function getBgColor(value: number | null): string {
		if (value === null) return 'bg-card-hover text-transparent';
		if (value >= 80) return 'bg-indigo-600/90 text-white font-bold';
		if (value >= 35) return 'bg-indigo-600/60 text-white font-semibold';
		if (value >= 25) return 'bg-indigo-600/40 text-indigo-200 font-medium';
		if (value >= 15) return 'bg-indigo-600/20 text-slate-300';
		return 'bg-indigo-600/10 text-slate-400';
	}

	const interval1Avg = $derived.by(() => {
		const vals = cohorts.map((c) => c.intervals[1]).filter((v): v is number => v !== null && v !== undefined);
		if (vals.length === 0) return '—';
		return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + '%';
	});

	const interval2Avg = $derived.by(() => {
		const vals = cohorts.map((c) => c.intervals[2]).filter((v): v is number => v !== null && v !== undefined);
		if (vals.length === 0) return '—';
		return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + '%';
	});

	const interval4Avg = $derived.by(() => {
		const vals = cohorts.map((c) => c.intervals[4]).filter((v): v is number => v !== null && v !== undefined);
		if (vals.length === 0) return '—';
		return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + '%';
	});

	async function loadRetention() {
		try {
			const data = await fetchRetention(siteStore.activeSiteId, granularity);
			if (Array.isArray(data)) {
				cohorts = data;
			} else {
				cohorts = [];
			}
		} catch (err) {
			console.error('Failed to load retention data', err);
			cohorts = [];
		} finally {
			isLoading = false;
		}
	}

	function handleGranularityChange(g: 'week' | 'day') {
		if (granularity === g) return;
		granularity = g;
		isLoading = true;
		loadRetention();
	}

	let lastSiteId = '';
	// Reactively reload when site changes
	$effect(() => {
		const current = siteStore.activeSiteId;
		if (current && current !== lastSiteId) {
			lastSiteId = current;
			untrack(() => {
				loadRetention();
			});
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadRetention();
		}, 15000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Cohort Retention — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Cohort Retention</h1>
			<p class="text-xs text-label">
				Track returning visitors across {granularity === 'day' ? 'daily' : 'weekly'} intervals for
				<span class="font-mono text-indigo-400 font-semibold">{siteStore.activeSiteId}</span>
			</p>
		</div>
		<div class="flex items-center rounded-md border border-themed bg-card-hover p-0.5 text-xs font-mono">
			<button
				onclick={() => handleGranularityChange('day')}
				class="rounded px-2.5 py-1 text-xs transition-colors {granularity === 'day'
					? 'bg-indigo-600 font-semibold text-white'
					: 'text-slate-400 hover:text-white'}"
			>
				Daily (D0–D6)
			</button>
			<button
				onclick={() => handleGranularityChange('week')}
				class="rounded px-2.5 py-1 text-xs transition-colors {granularity === 'week'
					? 'bg-indigo-600 font-semibold text-white'
					: 'text-slate-400 hover:text-white'}"
			>
				Weekly (W0–W6)
			</button>
		</div>
	</div>

	<!-- Retention KPI Cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		<div class="flex flex-col card-inset p-3.5">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">
				{granularity === 'day' ? 'Day 1 Return Rate' : 'Week 1 Retention'}
			</span>
			<span class="font-mono text-2xl font-bold text-emerald-400 mt-1">{interval1Avg}</span>
			<span class="text-[10px] text-slate-500 mt-0.5">Calculated across active visitor cohorts</span>
		</div>
		<div class="flex flex-col card-inset p-3.5">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">
				{granularity === 'day' ? 'Day 2 Return Rate' : 'Week 2 Retention'}
			</span>
			<span class="font-mono text-2xl font-bold text-indigo-400 mt-1">{interval2Avg}</span>
			<span class="text-[10px] text-slate-500 mt-0.5">Short-term stickiness</span>
		</div>
		<div class="flex flex-col card-inset p-3.5">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">
				{granularity === 'day' ? 'Day 4 Return Rate' : 'Week 4 Retention'}
			</span>
			<span class="font-mono text-2xl font-bold text-cyan-400 mt-1">{interval4Avg}</span>
			<span class="text-[10px] text-slate-500 mt-0.5">Mid-term organic retention</span>
		</div>
	</div>

	<!-- Cohort Heatmap Table -->
	<div class="card-inset p-4 overflow-x-auto">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-xs font-semibold uppercase tracking-wider text-body">
				Retention Heatmap Matrix ({granularity === 'day' ? 'Daily' : 'Weekly'})
			</h3>
			<span class="text-[10px] text-hint">First-time acquired visitor cohorts</span>
		</div>

		{#if isLoading}
			<div class="flex items-center justify-center p-8 text-slate-400 text-xs font-mono">
				<RefreshCw size={16} class="animate-spin mr-2 text-indigo-400" />
				<span>Computing cohort matrix...</span>
			</div>
		{:else if cohorts.length === 0}
			<div class="flex flex-col items-center justify-center p-8 text-center">
				<AlertCircle size={24} class="text-slate-500 mb-2" />
				<h4 class="text-xs font-semibold text-heading">No Cohort History Yet</h4>
				<p class="text-[11px] text-slate-400 max-w-sm mt-1">
					Cohort retention requires visitors to return over consecutive days or weeks. As traffic flows into {siteStore.activeSiteId}, return intervals will populate here.
				</p>
			</div>
		{:else}
			<table class="w-full text-xs border-collapse">
				<thead>
					<tr class="border-b border-themed text-[11px] font-mono text-label">
						<th class="pb-2.5 text-left font-medium">Cohort Period</th>
						<th class="pb-2.5 text-right font-medium pr-4">Visitors</th>
						<th class="pb-2.5 text-center font-medium">{granularity === 'day' ? 'D0' : 'W0'}</th>
						<th class="pb-2.5 text-center font-medium">{granularity === 'day' ? 'D1' : 'W1'}</th>
						<th class="pb-2.5 text-center font-medium">{granularity === 'day' ? 'D2' : 'W2'}</th>
						<th class="pb-2.5 text-center font-medium">{granularity === 'day' ? 'D3' : 'W3'}</th>
						<th class="pb-2.5 text-center font-medium">{granularity === 'day' ? 'D4' : 'W4'}</th>
						<th class="pb-2.5 text-center font-medium">{granularity === 'day' ? 'D5' : 'W5'}</th>
						<th class="pb-2.5 text-center font-medium">{granularity === 'day' ? 'D6' : 'W6'}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-themed">
					{#each cohorts as cohort}
						<tr class="hover:bg-card-hover transition-colors">
							<td class="py-2.5 font-medium text-heading">{cohort.period}</td>
							<td class="py-2.5 text-right font-mono font-bold text-heading pr-4">{cohort.size.toLocaleString()}</td>
							{#each cohort.intervals as rate}
								<td class="py-1.5 px-1 text-center font-mono">
									<div class="rounded py-1 px-1.5 {getBgColor(rate)} text-[11px] transition-colors">
										{rate !== null && rate !== undefined ? `${rate}%` : '—'}
									</div>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="mt-4 flex items-center gap-2 rounded-md bg-card-hover border border-themed p-2.5 text-[11px] text-label">
				<Sparkles size={13} class="text-indigo-400 shrink-0" />
				<span>
					Showing live cohort retention matrix. <strong>{granularity === 'day' ? 'D0' : 'W0'}</strong> represents 100% of the newly acquired cohort; subsequent columns track return visits as elapsed intervals occur.
				</span>
			</div>
		{/if}
	</div>
</div>
