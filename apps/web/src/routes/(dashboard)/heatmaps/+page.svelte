<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Flame,
		MousePointerClick,
		ArrowDown,
		Layers,
		Globe,
		Filter,
		RefreshCw,
		Eye,
		HelpCircle
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import {
		fetchScrollDepth,
		fetchHeatmap,
		fetchBreakdown,
		type ScrollDepthResult,
		type HeatmapResult,
		type BreakdownItem
	} from '$lib/api';
	import KPICard from '$lib/components/KPICard.svelte';

	let selectedPath = $state('/');
	let availablePages = $state<BreakdownItem[]>([]);
	let scrollData = $state<ScrollDepthResult | null>(null);
	let heatmapData = $state<HeatmapResult | null>(null);
	let isLoading = $state(true);

	async function loadHeatmapAndScroll() {
		const siteId = siteStore.activeSiteId;
		if (!siteId) return;
		isLoading = true;
		try {
			const [pages, scroll, heat] = await Promise.all([
				fetchBreakdown(siteId, 'url_path', dateStore.from, dateStore.to, 20),
				fetchScrollDepth(siteId, selectedPath, dateStore.from, dateStore.to),
				fetchHeatmap(siteId, selectedPath, dateStore.from, dateStore.to)
			]);

			availablePages = pages;
			scrollData = scroll;
			heatmapData = heat;
		} catch (err) {
			console.error('Failed to load heatmap and scroll data', err);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const s = siteStore.activeSiteId;
		const v = dateStore.version;
		const p = selectedPath;
		if (s) {
			untrack(() => {
				loadHeatmapAndScroll();
			});
		}
	});

	onMount(() => {
		loadHeatmapAndScroll();
	});
</script>

<svelte:head>
	<title>Heatmaps & Scroll Depth — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-7xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
					<Flame size={18} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">Heatmaps & Scroll Depth</h1>
			</div>
			<p class="text-xs text-label mt-1">
				Analyze visitor reading depth milestones and aggregate user click locations on your pages.
			</p>
		</div>

		<!-- Path selector and refresh -->
		<div class="flex items-center gap-2.5">
			<div class="flex items-center gap-1.5 rounded-lg border border-themed bg-card px-2.5 py-1 text-xs">
				<Globe size={13} class="text-indigo-400" />
				<select
					bind:value={selectedPath}
					onchange={loadHeatmapAndScroll}
					class="bg-transparent font-mono text-xs text-heading focus:outline-none cursor-pointer"
				>
					<option value="/">/ (Homepage)</option>
					{#each availablePages as page}
						{#if page.label !== '/'}
							<option value={page.label}>{page.label}</option>
						{/if}
					{/each}
				</select>
			</div>

			<button
				type="button"
				onclick={loadHeatmapAndScroll}
				disabled={isLoading}
				class="btn-ghost flex items-center gap-1.5 rounded-lg border border-themed px-3 py-1.5 text-xs text-body hover:text-heading cursor-pointer shadow-sm"
			>
				<RefreshCw size={13} class={isLoading ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- KPI Summary Metrics -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<KPICard
			label="Analyzed Pageviews"
			value={scrollData?.total_views || 0}
			icon={Eye}
			subtitle="Total views on {selectedPath}"
		/>
		<KPICard
			label="Average Scroll Depth"
			value={scrollData?.avg_scroll_depth || 0}
			format="percent"
			icon={ArrowDown}
			subtitle="Average vertical page descent"
		/>
		<KPICard
			label="Full Read Rate (100%)"
			value={scrollData?.scroll_100_pct || 0}
			format="percent"
			icon={Flame}
			subtitle="Reached the end of the page"
		/>
		<KPICard
			label="Total Clicks Captured"
			value={heatmapData?.total_clicks || 0}
			icon={MousePointerClick}
			subtitle="Click interactions on this path"
		/>
	</div>

	<!-- Scroll Depth Progression Funnel -->
	<div class="card p-6 flex flex-col gap-5">
		<div class="flex items-center justify-between border-b border-themed pb-4">
			<div class="flex items-center gap-2">
				<ArrowDown size={16} class="text-indigo-400" />
				<h3 class="font-semibold text-sm text-heading">Scroll Depth Milestones</h3>
			</div>
			<span class="text-xs font-mono text-hint">Target URL: <strong class="text-heading font-sans">{selectedPath}</strong></span>
		</div>

		<!-- Progression Bars -->
		<div class="flex flex-col gap-4">
			<!-- 0% (Top of Page) -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between text-xs font-mono">
					<span class="font-semibold text-heading flex items-center gap-2">
						<span class="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 text-[10px]">0%</span>
						Top of Page (Viewport)
					</span>
					<span class="text-heading font-bold">{scrollData?.total_views.toLocaleString() || 0} visitors (100%)</span>
				</div>
				<div class="h-3 w-full rounded-full bg-input overflow-hidden">
					<div class="h-full bg-indigo-500 rounded-full transition-all duration-500" style="width: 100%"></div>
				</div>
			</div>

			<!-- 25% Depth -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between text-xs font-mono">
					<span class="font-semibold text-heading flex items-center gap-2">
						<span class="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 text-[10px]">25%</span>
						Quarter Page Depth
					</span>
					<span class="text-heading font-bold">{scrollData?.scroll_25_count.toLocaleString() || 0} visitors ({scrollData?.scroll_25_pct.toFixed(1) || 0}%)</span>
				</div>
				<div class="h-3 w-full rounded-full bg-input overflow-hidden">
					<div class="h-full bg-indigo-500/80 rounded-full transition-all duration-500" style="width: {scrollData?.scroll_25_pct || 0}%"></div>
				</div>
			</div>

			<!-- 50% Depth -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between text-xs font-mono">
					<span class="font-semibold text-heading flex items-center gap-2">
						<span class="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 text-[10px]">50%</span>
						Half Page Depth (Fold)
					</span>
					<span class="text-heading font-bold">{scrollData?.scroll_50_count.toLocaleString() || 0} visitors ({scrollData?.scroll_50_pct.toFixed(1) || 0}%)</span>
				</div>
				<div class="h-3 w-full rounded-full bg-input overflow-hidden">
					<div class="h-full bg-indigo-500/70 rounded-full transition-all duration-500" style="width: {scrollData?.scroll_50_pct || 0}%"></div>
				</div>
			</div>

			<!-- 75% Depth -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between text-xs font-mono">
					<span class="font-semibold text-heading flex items-center gap-2">
						<span class="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 text-[10px]">75%</span>
						Three-Quarter Page Depth
					</span>
					<span class="text-heading font-bold">{scrollData?.scroll_75_count.toLocaleString() || 0} visitors ({scrollData?.scroll_75_pct.toFixed(1) || 0}%)</span>
				</div>
				<div class="h-3 w-full rounded-full bg-input overflow-hidden">
					<div class="h-full bg-indigo-500/60 rounded-full transition-all duration-500" style="width: {scrollData?.scroll_75_pct || 0}%"></div>
				</div>
			</div>

			<!-- 100% Depth -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between text-xs font-mono">
					<span class="font-semibold text-heading flex items-center gap-2">
						<span class="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 text-[10px]">100%</span>
						Footer / Full Read
					</span>
					<span class="text-heading font-bold">{scrollData?.scroll_100_count.toLocaleString() || 0} visitors ({scrollData?.scroll_100_pct.toFixed(1) || 0}%)</span>
				</div>
				<div class="h-3 w-full rounded-full bg-input overflow-hidden">
					<div class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: {scrollData?.scroll_100_pct || 0}%"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Click Density Heatmap & Element Clicks -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Click Canvas Map Simulation -->
		<div class="card p-5 flex flex-col gap-4">
			<div class="flex items-center justify-between border-b border-themed pb-3">
				<div class="flex items-center gap-2">
					<MousePointerClick size={16} class="text-indigo-400" />
					<h3 class="font-semibold text-sm text-heading">Click Density Map</h3>
				</div>
				<span class="text-[11px] font-mono text-hint">{heatmapData?.total_clicks || 0} clicks</span>
			</div>

			<div class="relative w-full h-80 rounded-xl border border-themed bg-canvas/60 overflow-hidden flex flex-col items-center justify-center">
				{#if !heatmapData || heatmapData.points.length === 0}
					<div class="flex flex-col items-center justify-center text-center p-6 text-xs text-hint">
						<MousePointerClick size={24} class="mb-2 opacity-40 text-indigo-400" />
						<span>No click coordinates recorded for {selectedPath}</span>
						<p class="text-[10px] text-hint mt-1">Clicks are recorded automatically when users interact with the page.</p>
					</div>
				{:else}
					<!-- Simulated Webpage Layout with Click Dots -->
					<div class="relative w-full h-full p-4 pointer-events-none">
						<!-- Mock Navbar -->
						<div class="w-full h-5 rounded bg-input/80 border border-themed/40 mb-3"></div>

						<!-- Mock Content Blocks -->
						<div class="grid grid-cols-3 gap-2 mb-3">
							<div class="h-14 rounded bg-input/40 border border-themed/30 col-span-2"></div>
							<div class="h-14 rounded bg-input/40 border border-themed/30"></div>
						</div>
						<div class="w-full h-24 rounded bg-input/40 border border-themed/30 mb-2"></div>

						<!-- Real Click Points Overlay -->
						{#each heatmapData.points as pt}
							<div
								class="absolute rounded-full pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-150"
								style="left: {pt.x}%; top: {pt.y}%; width: {Math.max(12, Math.min(32, pt.count * 4))}px; height: {Math.max(12, Math.min(32, pt.count * 4))}px; background: radial-gradient(circle, rgba(249, 115, 22, 0.85) 0%, rgba(239, 68, 68, 0.4) 60%, transparent 100%);"
								title="<{pt.tag}> {pt.text ? `"${pt.text}"` : ''} - {pt.count} clicks at ({pt.x}%, {pt.y}%)"
							></div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Top Clicked Elements Table -->
		<div class="card p-5 flex flex-col gap-4">
			<div class="flex items-center justify-between border-b border-themed pb-3">
				<div class="flex items-center gap-2">
					<Layers size={16} class="text-indigo-400" />
					<h3 class="font-semibold text-sm text-heading">Top Clicked Elements</h3>
				</div>
				<span class="text-[11px] font-mono text-hint">{heatmapData?.points.length || 0} unique targets</span>
			</div>

			{#if !heatmapData || heatmapData.points.length === 0}
				<div class="flex h-64 items-center justify-center text-xs text-hint">
					Waiting for click interaction data...
				</div>
			{:else}
				<div class="overflow-x-auto max-h-80 overflow-y-auto pr-1">
					<table class="w-full text-left text-xs font-mono">
						<thead>
							<tr class="border-b border-themed text-[11px] font-semibold text-hint">
								<th class="py-2 px-2.5">Tag</th>
								<th class="py-2 px-2.5">Text / Identifier</th>
								<th class="py-2 px-2.5 text-right">Clicks</th>
								<th class="py-2 px-2.5 text-right">Position</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-themed/50">
							{#each heatmapData.points.slice(0, 15) as pt}
								<tr class="hover:bg-card-hover transition-colors">
									<td class="py-2 px-2.5">
										<span class="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400">
											&lt;{pt.tag}&gt;
										</span>
									</td>
									<td class="py-2 px-2.5 text-heading font-sans font-medium truncate max-w-[140px]">
										{pt.text || '(unlabeled element)'}
									</td>
									<td class="py-2 px-2.5 text-right font-bold text-heading">
										{pt.count.toLocaleString()}
									</td>
									<td class="py-2 px-2.5 text-right text-hint text-[10px]">
										{pt.x}%, {pt.y}%
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
