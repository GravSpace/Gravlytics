<script lang="ts">
	import { untrack } from 'svelte';
	import {
		Gauge,
		Activity,
		Zap,
		Clock,
		Layers,
		CheckCircle2,
		AlertTriangle,
		AlertCircle,
		RefreshCw,
		HelpCircle,
		ExternalLink,
		Code
	} from '@lucide/svelte';
	import { fetchVitals, type VitalsResult, type VitalsMetric } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let data = $state<VitalsResult | null>(null);
	let isLoading = $state(true);
	let isRefreshing = $state(false);

	async function loadData() {
		const siteId = siteStore.currentSite?.trackingId;
		if (!siteId) {
			isLoading = false;
			data = null;
			return;
		}

		isLoading = true;
		try {
			const res = await fetchVitals(
				siteId,
				dateStore.selectedRange.from,
				dateStore.selectedRange.to
			);
			data = res;
		} catch {
			data = null;
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	function refresh() {
		isRefreshing = true;
		loadData();
	}

	$effect(() => {
		// Subscribe to reactive dependencies
		const _site = siteStore.currentSite;
		const _from = dateStore.selectedRange.from;
		const _to = dateStore.selectedRange.to;

		untrack(() => {
			loadData();
		});
	});

	function formatMetricValue(name: string, val: number | undefined | null): string {
		if (val == null || isNaN(val)) return '—';
		if (name === 'CLS') return val.toFixed(3);
		if (val >= 1000) return (val / 1000).toFixed(2) + ' s';
		return Math.round(val) + ' ms';
	}

	function getStatusBadge(status: string) {
		if (status === 'good') {
			return { label: 'Good', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
		}
		if (status === 'needs-improvement') {
			return { label: 'Needs Improvement', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
		}
		return { label: 'Poor', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<div class="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
					<Gauge size={20} />
				</div>
				<div>
					<h1 class="text-xl font-bold text-heading">Core Web Vitals</h1>
					<p class="text-xs text-label mt-0.5">
						Real User Monitoring (RUM) aligned with Google standards: LCP, CLS, INP, FCP, and TTFB
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={refresh}
				disabled={isRefreshing}
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-themed bg-card text-xs text-label hover:text-heading transition-colors cursor-pointer disabled:opacity-50"
			>
				<RefreshCw size={13} class={isRefreshing ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- Info Note -->
	<div class="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-start gap-3">
		<div class="text-indigo-400 mt-0.5">
			<Zap size={16} />
		</div>
		<div class="text-xs text-label leading-relaxed">
			<span class="font-semibold text-heading">Zero-Overhead & Automatic:</span> The
			<code class="px-1 py-0.5 rounded bg-card border border-themed text-[11px] font-mono text-indigo-400">gravlytics.js</code>
			tracking script automatically captures Core Web Vitals via the native browser
			<code class="text-[11px] font-mono">PerformanceObserver</code> API. Aggregations calculate the 75th percentile (P75) adhering to Google Search Console and SEO ranking criteria.
		</div>
	</div>

	<!-- Loading State -->
	{#if isLoading && !data}
		<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
			{#each Array(5) as _}
				<div class="h-36 rounded-xl bg-card border border-themed animate-pulse"></div>
			{/each}
		</div>
	{:else if data && data.metrics && data.metrics.length > 0}
		<!-- Metrics Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
			{#each data.metrics as metric}
				{@const badge = getStatusBadge(metric.status)}
				<div class="p-4 rounded-xl border border-themed bg-card flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-themed-strong transition-all">
					<div>
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold font-mono tracking-wide text-heading">{metric.name}</span>
							<span class="px-2 py-0.5 rounded-full text-[10px] font-medium border {badge.bg}">
								{badge.label}
							</span>
						</div>
						<div class="mt-2 flex items-baseline gap-1.5">
							<span class="text-2xl font-black font-mono tracking-tight text-heading">
								{formatMetricValue(metric.name, metric.p75)}
							</span>
							<span class="text-[11px] text-label">P75</span>
						</div>
						<p class="text-[11px] text-label mt-1 line-clamp-2">
							{metric.description}
						</p>
					</div>

					<!-- Distribution Bar -->
					<div class="space-y-1.5 pt-2 border-t border-themed">
						<div class="flex items-center justify-between text-[10px] text-label">
							<span>Visitor Distribution</span>
							<span class="font-mono text-emerald-400">{Math.round(metric.good_pct ?? 0)}% Good</span>
						</div>
						<div class="w-full h-1.5 bg-canvas rounded-full overflow-hidden flex">
							<div
								style="width: {metric.good_pct ?? 0}%"
								class="h-full bg-emerald-500 transition-all duration-500"
								title="Good: {(metric.good_pct ?? 0).toFixed(1)}%"
							></div>
							<div
								style="width: {metric.needs_improvement_pct ?? 0}%"
								class="h-full bg-amber-500 transition-all duration-500"
								title="Needs Improvement: {(metric.needs_improvement_pct ?? 0).toFixed(1)}%"
							></div>
							<div
								style="width: {metric.poor_pct ?? 0}%"
								class="h-full bg-rose-500 transition-all duration-500"
								title="Poor: {(metric.poor_pct ?? 0).toFixed(1)}%"
							></div>
						</div>
						<div class="flex items-center justify-between text-[9px] text-label font-mono">
							<span>Average: {formatMetricValue(metric.name, metric.avg)}</span>
							<span class="text-label">Target: &le; {formatMetricValue(metric.name, metric.threshold_good)}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Slowest Pages Table -->
		<div class="rounded-xl border border-themed bg-card overflow-hidden">
			<div class="p-4 border-b border-themed flex items-center justify-between">
				<div>
					<h3 class="text-sm font-semibold text-heading">Top Sampled Pages & Real User Experience</h3>
					<p class="text-xs text-label mt-0.5">Per-path metric breakdown for prioritized performance and SEO optimization</p>
				</div>
				<div class="text-xs text-label font-mono">
					Total Samples: <span class="font-semibold text-heading">{data.total_samples.toLocaleString()}</span>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-themed text-label font-medium bg-canvas/30">
							<th class="py-3 px-4">URL Path</th>
							<th class="py-3 px-4 text-right">Samples</th>
							<th class="py-3 px-4 text-right">LCP (P75)</th>
							<th class="py-3 px-4 text-right">CLS (P75)</th>
							<th class="py-3 px-4 text-right">INP (P75)</th>
							<th class="py-3 px-4 text-center">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-themed">
						{#if data.slowest_pages && data.slowest_pages.length > 0}
							{#each data.slowest_pages as page}
								{@const badge = getStatusBadge(page.rating)}
								<tr class="table-row-hover transition-colors">
									<td class="py-3 px-4 font-mono font-medium text-heading">
										{page.path}
									</td>
									<td class="py-3 px-4 text-right text-label font-mono">
										{page.samples.toLocaleString()}
									</td>
									<td class="py-3 px-4 text-right font-mono {(page.lcp ?? 0) <= 2500 ? 'text-emerald-400' : (page.lcp ?? 0) <= 4000 ? 'text-amber-400' : 'text-rose-400'}">
										{formatMetricValue('LCP', page.lcp)}
									</td>
									<td class="py-3 px-4 text-right font-mono {(page.cls ?? 0) <= 0.1 ? 'text-emerald-400' : (page.cls ?? 0) <= 0.25 ? 'text-amber-400' : 'text-rose-400'}">
										{(page.cls ?? 0).toFixed(3)}
									</td>
									<td class="py-3 px-4 text-right font-mono {(page.inp ?? 0) <= 200 ? 'text-emerald-400' : (page.inp ?? 0) <= 500 ? 'text-amber-400' : 'text-rose-400'}">
										{formatMetricValue('INP', page.inp)}
									</td>
									<td class="py-3 px-4 text-center">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-medium border {badge.bg}">
											{badge.label}
										</span>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="6" class="py-8 text-center text-label text-xs">
									No Core Web Vitals samples recorded for this period. Browse your site to begin collecting metrics.
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Empty State with Instructions -->
		<div class="p-8 rounded-xl border border-themed bg-card text-center space-y-4">
			<div class="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
				<Gauge size={24} />
			</div>
			<div class="max-w-md mx-auto space-y-1">
				<h3 class="text-sm font-semibold text-heading">Awaiting First Web Vitals Samples</h3>
				<p class="text-xs text-label leading-relaxed">
					Core Web Vitals metrics are dispatched automatically when visitors load pages and navigate. Verify that the latest <code class="text-indigo-400">gravlytics.js</code> tracking script is active on your site.
				</p>
			</div>

			<div class="pt-4 max-w-lg mx-auto text-left">
				<div class="p-3 rounded-lg bg-canvas border border-themed font-mono text-[11px] text-label overflow-x-auto">
					&lt;script defer src="https://gravlytics.dev/gravlytics.js" data-site="{siteStore.currentSite?.trackingId || 'YOUR_SITE_ID'}"&gt;&lt;/script&gt;
				</div>
			</div>
		</div>
	{/if}
</div>
