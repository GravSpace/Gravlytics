<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Megaphone,
		Eye,
		MousePointer,
		Percent,
		RefreshCw,
		Copy,
		Check,
		Layers,
		CheckCircle2,
		Sparkles,
		Code
	} from '@lucide/svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import { fetchAds, type AdsResult } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let data = $state<AdsResult | null>(null);
	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let copiedSnippet = $state(false);

	async function loadData() {
		const siteId = siteStore.currentSite?.trackingId;
		if (!siteId) {
			isLoading = false;
			data = null;
			return;
		}

		isLoading = true;
		try {
			const res = await fetchAds(
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
		const _site = siteStore.currentSite;
		const _from = dateStore.selectedRange.from;
		const _to = dateStore.selectedRange.to;

		untrack(() => {
			loadData();
		});
	});

	onMount(() => {
		loadData();
	});

	const sampleSnippet = `<!-- 1. Automatic HTML Attribute (IAB Standard: 50% surface visible for >= 1 continuous second) -->
<div
  class="ad-banner"
  data-gravlytics-ad-slot="header_banner_728x90"
>
  <!-- Your Google Ad Manager / Adsense / Prebid ad tag -->
</div>

<!-- 2. Programmatic JavaScript API (Prebid.js / GPT integrations) -->
<script>
  // When an ad slot successfully loads (fill)
  gravlytics.ad.impression('sidebar_sticky_300x250');

  // When the ad slot receives a click
  gravlytics.ad.click('sidebar_sticky_300x250');
<\/script>`;

	function copySnippet() {
		navigator.clipboard.writeText(sampleSnippet);
		copiedSnippet = true;
		setTimeout(() => (copiedSnippet = false), 2000);
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<div class="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
					<Megaphone size={20} />
				</div>
				<div>
					<h1 class="text-xl font-bold text-heading">Ads & Viewability</h1>
					<p class="text-xs text-label mt-0.5">
						Inventory performance audit, publisher fill rates, and IAB-standard viewability (50% in-view for &ge; 1 continuous second)
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

	<!-- KPI Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<KPICard
			label="Total Ad Requests"
			value={data ? data.total_requests.toLocaleString() : '0'}
			icon={Layers}
		/>
		<KPICard
			label="Overall Fill Rate"
			value={data ? `${data.overall_fill_rate.toFixed(1)}%` : '0.0%'}
			icon={Percent}
			subtitle="Percentage of ad requests filled"
		/>
		<KPICard
			label="Viewability Rate (IAB)"
			value={data ? `${data.overall_viewability.toFixed(1)}%` : '0.0%'}
			icon={Eye}
			subtitle="50% visible for &ge; 1 second"
		/>
		<KPICard
			label="Click-Through Rate (CTR)"
			value={data ? `${data.overall_ctr.toFixed(2)}%` : '0.00%'}
			icon={MousePointer}
			subtitle={data ? `${data.total_clicks.toLocaleString()} total clicks` : '0 total clicks'}
		/>
	</div>

	<!-- Ad Slots Table -->
	<div class="rounded-xl border border-themed bg-card overflow-hidden">
		<div class="p-4 border-b border-themed flex items-center justify-between">
			<div>
				<h3 class="text-sm font-semibold text-heading">Ad Slot Placement Performance</h3>
				<p class="text-xs text-label mt-0.5">Inventory efficiency, in-view ratios, and reader interaction metrics per slot</p>
			</div>
			<div class="text-xs text-label font-mono">
				Slots Detected: <span class="font-semibold text-heading">{data ? data.slots.length : 0}</span>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-themed text-label font-medium bg-canvas/30">
						<th class="py-3 px-4">Slot Name / ID</th>
						<th class="py-3 px-4 text-right">Requests (Req)</th>
						<th class="py-3 px-4 text-right">Loaded</th>
						<th class="py-3 px-4 text-right">Viewed</th>
						<th class="py-3 px-4 text-right">Fill Rate</th>
						<th class="py-3 px-4 text-right">Viewability (IAB)</th>
						<th class="py-3 px-4 text-right">Clicks</th>
						<th class="py-3 px-4 text-right">CTR</th>
						<th class="py-3 px-4 text-right">Dwell Time</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-themed">
					{#if data && data.slots && data.slots.length > 0}
						{#each data.slots as slot}
							<tr class="table-row-hover transition-colors">
								<td class="py-3 px-4 font-mono font-medium text-heading">
									<div class="flex items-center gap-1.5">
										<span class="w-2 h-2 rounded-full {slot.viewability >= 70 ? 'bg-emerald-400' : slot.viewability >= 50 ? 'bg-amber-400' : 'bg-rose-400'}"></span>
										<span>{slot.slot_id}</span>
									</div>
								</td>
								<td class="py-3 px-4 text-right text-label font-mono">
									{slot.impressions.toLocaleString()}
								</td>
								<td class="py-3 px-4 text-right text-label font-mono">
									{slot.loaded.toLocaleString()}
								</td>
								<td class="py-3 px-4 text-right text-heading font-mono font-medium">
									{slot.viewed.toLocaleString()}
								</td>
								<td class="py-3 px-4 text-right font-mono font-medium {slot.fill_rate >= 80 ? 'text-emerald-400' : slot.fill_rate >= 60 ? 'text-amber-400' : 'text-rose-400'}">
									{slot.fill_rate.toFixed(1)}%
								</td>
								<td class="py-3 px-4 text-right font-mono font-medium {slot.viewability >= 70 ? 'text-emerald-400' : slot.viewability >= 50 ? 'text-amber-400' : 'text-rose-400'}">
									{slot.viewability.toFixed(1)}%
								</td>
								<td class="py-3 px-4 text-right text-label font-mono">
									{slot.clicks.toLocaleString()}
								</td>
								<td class="py-3 px-4 text-right text-cyan-400 font-mono font-medium">
									{slot.ctr.toFixed(2)}%
								</td>
								<td class="py-3 px-4 text-right text-label font-mono">
									{slot.avg_dwell_time > 0 ? `${slot.avg_dwell_time.toFixed(1)}s` : '-'}
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="9" class="py-8 text-center text-label text-xs">
								No ad slot data recorded for this period. Add <code class="text-cyan-400">data-gravlytics-ad-slot</code> attributes to ad elements on your website.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Integration Guide for Publishers -->
	<div class="rounded-xl border border-themed bg-card p-5 space-y-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Code size={18} class="text-cyan-400" />
				<h3 class="text-sm font-semibold text-heading">Ad Placement & Viewability Integration Guide</h3>
			</div>
			<button
				onclick={copySnippet}
				class="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-themed bg-card text-xs text-label hover:text-heading transition-colors cursor-pointer"
			>
				{#if copiedSnippet}
					<Check size={12} class="text-emerald-400" />
					<span class="text-emerald-400">Copied</span>
				{:else}
					<Copy size={12} />
					<span>Copy Code</span>
				{/if}
			</button>
		</div>

		<p class="text-xs text-label leading-relaxed">
			Viewability measurement utilizes a high-precision <strong>IntersectionObserver</strong> algorithm running directly in the visitor's browser. When an ad unit enters the viewport with at least 50% surface area visible for 1 full continuous second (IAB standard), a viewable signal is automatically dispatched to Gravlytics without delaying page rendering.
		</p>

		<pre class="p-4 rounded-xl bg-canvas border border-themed text-label font-mono text-xs overflow-x-auto leading-relaxed"><code>{sampleSnippet}</code></pre>
	</div>
</div>
