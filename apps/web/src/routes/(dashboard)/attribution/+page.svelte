<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		GitCompare,
		Layers,
		ArrowRight,
		TrendingUp,
		TrendingDown,
		Split,
		Target,
		Compass,
		Smartphone,
		Monitor,
		Globe,
		Filter,
		RefreshCw,
		HelpCircle,
		ArrowUpRight,
		Sliders
	} from '@lucide/svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import {
		fetchAttribution,
		fetchSegmentComparison,
		fetchBreakdown,
		type AttributionResponse,
		type AttributionChannel,
		type SegmentComparisonResponse
	} from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let activeTab = $state<'attribution' | 'segments'>('attribution');

	// Attribution State
	let goalEvent = $state('pageview');
	let attrData = $state<AttributionResponse | null>(null);
	let isAttrLoading = $state(true);
	let activeAttributionModel = $state<'all' | 'first' | 'last' | 'linear'>('all');

	// Segment Comparison State
	let selectedPreset = $state<'mobile_desktop' | 'chrome_safari' | 'id_us'>('mobile_desktop');
	let segmentA = $state('device:mobile');
	let segmentB = $state('device:desktop');
	let segmentData = $state<SegmentComparisonResponse | null>(null);
	let isSegmentLoading = $state(true);
	let isRefreshing = $state(false);

	const segmentPresets = [
		{ id: 'mobile_desktop', label: 'Mobile vs. Desktop', a: 'device:mobile', b: 'device:desktop' },
		{ id: 'chrome_safari', label: 'Chrome vs. Safari', a: 'browser:Chrome', b: 'browser:Safari' },
		{ id: 'id_us', label: 'Indonesia vs. US', a: 'country:ID', b: 'country:US' }
	];

	function applyPreset(presetId: 'mobile_desktop' | 'chrome_safari' | 'id_us') {
		selectedPreset = presetId;
		const found = segmentPresets.find((p) => p.id === presetId);
		if (found) {
			segmentA = found.a;
			segmentB = found.b;
			loadSegments();
		}
	}

	let availableGoals = $state<string[]>(['pageview', 'outbound_click', 'file_download', 'search', 'form_submit', 'purchase']);

	async function loadAvailableGoals() {
		const current = siteStore.currentSite?.trackingId || siteStore.activeSiteId;
		if (!current) return;
		try {
			const items = await fetchBreakdown(current, 'event_name', dateStore.from, dateStore.to, 20);
			if (items.length > 0) {
				const names = items.map((it) => it.label).filter((n) => n && !n.startsWith('$'));
				const merged = Array.from(new Set(['pageview', ...names, 'outbound_click', 'file_download', 'search', 'form_submit', 'purchase']));
				availableGoals = merged;
			}
		} catch (e) {}
	}

	async function loadAttribution() {
		const current = siteStore.currentSite?.trackingId || siteStore.activeSiteId;
		if (!current) return;
		isAttrLoading = true;
		try {
			const res = await fetchAttribution(current, dateStore.from, dateStore.to, goalEvent);
			attrData = res;
		} catch (err) {
			console.error('Failed to load attribution', err);
		} finally {
			isAttrLoading = false;
		}
	}

	async function loadSegments() {
		const current = siteStore.currentSite?.trackingId || siteStore.activeSiteId;
		if (!current) return;
		isSegmentLoading = true;
		try {
			const res = await fetchSegmentComparison(current, dateStore.from, dateStore.to, segmentA, segmentB);
			segmentData = res;
		} catch (err) {
			console.error('Failed to load segment comparison', err);
		} finally {
			isSegmentLoading = false;
		}
	}

	let lastSiteId = '';
	let lastDateVersion = -1;

	$effect(() => {
		const current = siteStore.currentSite?.trackingId || siteStore.activeSiteId;
		const ver = dateStore.version;
		if (current && (current !== lastSiteId || ver !== lastDateVersion)) {
			lastSiteId = current;
			lastDateVersion = ver;
			untrack(() => {
				loadAvailableGoals();
				loadAttribution();
				loadSegments();
			});
		}
	});

	$effect(() => {
		const g = goalEvent;
		if (siteStore.currentSite?.trackingId || siteStore.activeSiteId) {
			untrack(() => loadAttribution());
		}
	});

	onMount(() => {
		loadAvailableGoals();
		loadAttribution();
		loadSegments();
	});

	function calculateDelta(valA: number, valB: number): { text: string; positive: boolean } {
		if (valB === 0) return { text: valA > 0 ? '+100%' : '0%', positive: valA >= 0 };
		const diff = ((valA - valB) / valB) * 100;
		return {
			text: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
			positive: diff >= 0
		};
	}
</script>

<svelte:head>
	<title>Attribution & Segments — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
		<div>
			<h1 class="text-lg font-bold tracking-tight text-heading flex items-center gap-2">
				<GitCompare size={18} class="text-indigo-400" />
				Attribution & Segment Analysis
			</h1>
			<p class="text-xs text-label">
				Google Analytics 4 Model Comparison (First Click, Last Click, Linear) and audience segment comparison.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => {
					isRefreshing = true;
					loadAttribution();
					loadSegments();
					setTimeout(() => (isRefreshing = false), 600);
				}}
				class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
				title="Refresh data"
			>
				<RefreshCw size={13} class={isRefreshing ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- Main Sub-Navigation Tabs -->
	<div class="flex items-center gap-1 border-b border-themed pb-1 text-xs font-medium">
		<button
			onclick={() => (activeTab = 'attribution')}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors {activeTab === 'attribution'
				? 'bg-indigo-500/15 text-heading font-semibold border border-indigo-500/30'
				: 'text-label hover:text-body hover:bg-card-hover'}"
		>
			<Target size={14} class="text-indigo-400" />
			<span>Multi-Touch Attribution Models</span>
		</button>

		<button
			onclick={() => (activeTab = 'segments')}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors {activeTab === 'segments'
				? 'bg-indigo-500/15 text-heading font-semibold border border-indigo-500/30'
				: 'text-label hover:text-body hover:bg-card-hover'}"
		>
			<Split size={14} class="text-emerald-400" />
			<span>Segment Comparison (Side-by-Side)</span>
		</button>
	</div>

	<!-- TAB 1: ATTRIBUTION MODELS -->
	{#if activeTab === 'attribution'}
		<div class="flex flex-col gap-4">
			<!-- Controls Bar -->
			<div class="card-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-xs">
					<span class="font-medium text-heading">Conversion Target:</span>
					<select
						bind:value={goalEvent}
						class="input-field py-1 text-xs font-mono font-medium"
					>
						{#each availableGoals as g}
							<option value={g}>{g === 'pageview' ? 'All Traffic (pageview)' : g}</option>
						{/each}
					</select>
				</div>

				<!-- Model Filter Pills -->
				<div class="flex items-center gap-1 text-xs bg-input p-0.5 rounded-md">
					<button
						onclick={() => (activeAttributionModel = 'all')}
						class="px-2.5 py-1 rounded transition-colors {activeAttributionModel === 'all' ? 'bg-card-solid text-heading font-semibold shadow-xs' : 'text-label hover:text-body'}"
					>
						Compare All Models
					</button>
					<button
						onclick={() => (activeAttributionModel = 'first')}
						class="px-2.5 py-1 rounded transition-colors {activeAttributionModel === 'first' ? 'bg-card-solid text-heading font-semibold shadow-xs' : 'text-label hover:text-body'}"
					>
						First Touch
					</button>
					<button
						onclick={() => (activeAttributionModel = 'last')}
						class="px-2.5 py-1 rounded transition-colors {activeAttributionModel === 'last' ? 'bg-card-solid text-heading font-semibold shadow-xs' : 'text-label hover:text-body'}"
					>
						Last Touch
					</button>
					<button
						onclick={() => (activeAttributionModel = 'linear')}
						class="px-2.5 py-1 rounded transition-colors {activeAttributionModel === 'linear' ? 'bg-card-solid text-heading font-semibold shadow-xs' : 'text-label hover:text-body'}"
					>
						Linear
					</button>
				</div>
			</div>

			<!-- Attribution Model Explanation Card -->
			<div class="card-surface p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-l-4 border-indigo-500">
				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-1.5 font-semibold text-xs text-heading">
						<span class="h-2 w-2 rounded-full bg-sky-400"></span>
						First-Touch (First Click)
					</div>
					<p class="text-[11px] text-label">
						Attributes 100% of conversion credit to the very first touchpoint channel that introduced the user to your brand.
					</p>
				</div>

				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-1.5 font-semibold text-xs text-heading">
						<span class="h-2 w-2 rounded-full bg-indigo-400"></span>
						Last-Touch (Last Click)
					</div>
					<p class="text-[11px] text-label">
						Attributes 100% of conversion credit to the final channel immediately preceding the goal completion.
					</p>
				</div>

				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-1.5 font-semibold text-xs text-heading">
						<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
						Linear Model
					</div>
					<p class="text-[11px] text-label">
						Distributes equal credit across every channel touchpoint in the customer journey from start to finish.
					</p>
				</div>
			</div>

			<!-- Attribution Breakdown Table -->
			<div class="card-surface overflow-hidden">
				<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
					<div>
						<h3 class="text-xs font-semibold text-heading tracking-wide uppercase">Channel Attribution Comparison</h3>
						<p class="text-[11px] text-label">Evaluates channel performance across First-Touch, Last-Touch, and Linear weighting</p>
					</div>

					<span class="text-xs font-mono font-medium text-body">
						Total Conversions: <strong class="text-heading">{attrData?.total_goals?.toLocaleString() ?? 0}</strong>
					</span>
				</div>

				{#if isAttrLoading}
					<div class="py-12 text-center text-xs text-hint">Computing multi-touch attribution models...</div>
				{:else if !attrData?.channels || attrData.channels.length === 0}
					<div class="py-12 text-center text-xs text-hint">
						No journeys recorded for goal "{goalEvent}" in this period.
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-left text-xs">
							<thead>
								<tr class="border-b border-themed text-[10px] font-mono uppercase tracking-wider text-label">
									<th class="px-4 py-2 font-medium">Channel / Source</th>
									{#if activeAttributionModel === 'all' || activeAttributionModel === 'first'}
										<th class="px-4 py-2 font-medium text-right">First-Touch</th>
										<th class="px-4 py-2 font-medium text-right">First Share</th>
									{/if}
									{#if activeAttributionModel === 'all' || activeAttributionModel === 'last'}
										<th class="px-4 py-2 font-medium text-right">Last-Touch</th>
										<th class="px-4 py-2 font-medium text-right">Last Share</th>
									{/if}
									{#if activeAttributionModel === 'all' || activeAttributionModel === 'linear'}
										<th class="px-4 py-2 font-medium text-right">Linear Credit</th>
										<th class="px-4 py-2 font-medium text-right">Linear Share</th>
									{/if}
									{#if activeAttributionModel === 'all'}
										<th class="px-4 py-2 font-medium text-right">Model Shift (First vs Last)</th>
									{/if}
								</tr>
							</thead>
							<tbody class="divide-y divide-themed font-mono">
								{#each attrData.channels as ch (ch.channel)}
									{@const shift = ch.last_touch_share - ch.first_touch_share}
									<tr class="hover:bg-card-hover transition-colors">
										<td class="px-4 py-2.5 font-sans font-semibold text-heading flex items-center gap-2">
											<span class="h-2 w-2 rounded-full {ch.channel === 'direct' ? 'bg-zinc-400' : 'bg-indigo-400'}"></span>
											<span>{ch.channel}</span>
										</td>

										{#if activeAttributionModel === 'all' || activeAttributionModel === 'first'}
											<td class="px-4 py-2.5 text-right text-body">{ch.first_touch_count.toLocaleString()}</td>
											<td class="px-4 py-2.5 text-right font-medium text-sky-400">{ch.first_touch_share.toFixed(1)}%</td>
										{/if}

										{#if activeAttributionModel === 'all' || activeAttributionModel === 'last'}
											<td class="px-4 py-2.5 text-right text-body">{ch.last_touch_count.toLocaleString()}</td>
											<td class="px-4 py-2.5 text-right font-medium text-indigo-400">{ch.last_touch_share.toFixed(1)}%</td>
										{/if}

										{#if activeAttributionModel === 'all' || activeAttributionModel === 'linear'}
											<td class="px-4 py-2.5 text-right text-body">{ch.linear_count.toFixed(1)}</td>
											<td class="px-4 py-2.5 text-right font-medium text-emerald-400">{ch.linear_share.toFixed(1)}%</td>
										{/if}

										{#if activeAttributionModel === 'all'}
											<td class="px-4 py-2.5 text-right font-medium">
												{#if Math.abs(shift) < 0.1}
													<span class="text-hint">0.0% (neutral)</span>
												{:else if shift > 0}
													<span class="text-emerald-400 flex items-center justify-end gap-1">
														<TrendingUp size={11} />
														+{shift.toFixed(1)}% (closer)
													</span>
												{:else}
													<span class="text-sky-400 flex items-center justify-end gap-1">
														<TrendingDown size={11} />
														{shift.toFixed(1)}% (opener)
													</span>
												{/if}
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- TAB 2: SEGMENT COMPARISON -->
	{#if activeTab === 'segments'}
		<div class="flex flex-col gap-4">
			<!-- Preset Selector Bar -->
			<div class="card-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div class="flex items-center gap-2 text-xs">
					<span class="font-medium text-heading">Comparison Presets:</span>
					<div class="flex items-center gap-1.5 flex-wrap">
						{#each segmentPresets as p}
							<button
								onclick={() => applyPreset(p.id as any)}
								class="px-2.5 py-1 rounded text-xs transition-colors {selectedPreset === p.id
									? 'bg-indigo-500/15 text-heading font-semibold border border-indigo-500/30'
									: 'btn-ghost text-label'}"
							>
								{p.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex items-center gap-2 text-xs font-mono">
					<span class="text-primary font-semibold">{segmentData?.segment_a?.name || segmentA}</span>
					<span class="text-hint font-bold">vs</span>
					<span class="text-sky-600 dark:text-sky-400 font-semibold">{segmentData?.segment_b?.name || segmentB}</span>
				</div>
			</div>

			{#if isSegmentLoading}
				<div class="py-16 text-center text-xs text-hint">Comparing audience segments...</div>
			{:else if segmentData}
				{@const deltaVisitors = calculateDelta(segmentData.segment_a.visitors, segmentData.segment_b.visitors)}
				{@const deltaPv = calculateDelta(segmentData.segment_a.pageviews, segmentData.segment_b.pageviews)}
				{@const deltaSess = calculateDelta(segmentData.segment_a.sessions, segmentData.segment_b.sessions)}
				<!-- Side-by-Side KPI Cards -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<!-- Visitors -->
					<div class="card-surface p-3.5 flex flex-col gap-2">
						<div class="text-[10px] font-mono uppercase text-label flex items-center justify-between">
							<span>Unique Visitors</span>
							<span class="font-bold text-[10px] px-1.5 py-0.5 rounded border {deltaVisitors.positive ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20'}">
								{deltaVisitors.text}
							</span>
						</div>
						<div class="grid grid-cols-2 gap-2 pt-1 font-mono">
							<div>
								<div class="text-[10px] text-primary font-medium truncate">Segment A</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_a.visitors.toLocaleString()}</div>
							</div>
							<div class="border-l border-themed pl-2">
								<div class="text-[10px] text-sky-600 dark:text-sky-400 font-medium truncate">Segment B</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_b.visitors.toLocaleString()}</div>
							</div>
						</div>
					</div>

					<!-- Pageviews -->
					<div class="card-surface p-3.5 flex flex-col gap-2">
						<div class="text-[10px] font-mono uppercase text-label flex items-center justify-between">
							<span>Pageviews</span>
							<span class="font-bold text-[10px] px-1.5 py-0.5 rounded border {deltaPv.positive ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20'}">
								{deltaPv.text}
							</span>
						</div>
						<div class="grid grid-cols-2 gap-2 pt-1 font-mono">
							<div>
								<div class="text-[10px] text-primary font-medium truncate">Segment A</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_a.pageviews.toLocaleString()}</div>
							</div>
							<div class="border-l border-themed pl-2">
								<div class="text-[10px] text-sky-600 dark:text-sky-400 font-medium truncate">Segment B</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_b.pageviews.toLocaleString()}</div>
							</div>
						</div>
					</div>

					<!-- Sessions -->
					<div class="card-surface p-3.5 flex flex-col gap-2">
						<div class="text-[10px] font-mono uppercase text-label flex items-center justify-between">
							<span>Sessions</span>
							<span class="font-bold text-[10px] px-1.5 py-0.5 rounded border {deltaSess.positive ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20'}">
								{deltaSess.text}
							</span>
						</div>
						<div class="grid grid-cols-2 gap-2 pt-1 font-mono">
							<div>
								<div class="text-[10px] text-primary font-medium truncate">Segment A</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_a.sessions.toLocaleString()}</div>
							</div>
							<div class="border-l border-themed pl-2">
								<div class="text-[10px] text-sky-600 dark:text-sky-400 font-medium truncate">Segment B</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_b.sessions.toLocaleString()}</div>
							</div>
						</div>
					</div>

					<!-- Bounce Rate -->
					<div class="card-surface p-3.5 flex flex-col gap-2">
						<div class="text-[10px] font-mono uppercase text-label flex items-center justify-between">
							<span>Bounce Rate</span>
							<span class="text-[10px] text-hint">Lower is better</span>
						</div>
						<div class="grid grid-cols-2 gap-2 pt-1 font-mono">
							<div>
								<div class="text-[10px] text-primary font-medium truncate">Segment A</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_a.bounce_rate.toFixed(1)}%</div>
							</div>
							<div class="border-l border-themed pl-2">
								<div class="text-[10px] text-sky-600 dark:text-sky-400 font-medium truncate">Segment B</div>
								<div class="text-lg font-bold text-heading">{segmentData.segment_b.bounce_rate.toFixed(1)}%</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Side-by-Side Deep Dive: Top Pages -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Segment A Top Pages -->
					<div class="card-surface overflow-hidden">
						<div class="border-b border-themed px-4 py-2.5 flex items-center justify-between text-xs">
							<span class="font-semibold text-heading flex items-center gap-1.5">
								<span class="h-2 w-2 rounded-full bg-primary"></span>
								Top Pages: {segmentData.segment_a.name}
							</span>
						</div>
						{#if segmentData.segment_a.top_pages.length === 0}
							<div class="py-8 text-center text-xs text-hint">No pageviews recorded</div>
						{:else}
							<div class="divide-y divide-themed font-mono text-xs">
								{#each segmentData.segment_a.top_pages as p}
									<div class="p-2.5 flex items-center justify-between hover:bg-card-hover transition-colors">
										<span class="text-heading truncate max-w-[200px]">{p.value || '/'}</span>
										<div class="flex items-center gap-3 shrink-0">
											<span class="text-body font-semibold">{p.pageviews} views</span>
											<span class="text-hint text-[11px]">{p.unique_visitors} users</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Segment B Top Pages -->
					<div class="card-surface overflow-hidden">
						<div class="border-b border-themed px-4 py-2.5 flex items-center justify-between text-xs">
							<span class="font-semibold text-heading flex items-center gap-1.5">
								<span class="h-2 w-2 rounded-full bg-sky-500"></span>
								Top Pages: {segmentData.segment_b.name}
							</span>
						</div>
						{#if segmentData.segment_b.top_pages.length === 0}
							<div class="py-8 text-center text-xs text-hint">No pageviews recorded</div>
						{:else}
							<div class="divide-y divide-themed font-mono text-xs">
								{#each segmentData.segment_b.top_pages as p}
									<div class="p-2.5 flex items-center justify-between hover:bg-card-hover transition-colors">
										<span class="text-heading truncate max-w-[200px]">{p.value || '/'}</span>
										<div class="flex items-center gap-3 shrink-0">
											<span class="text-body font-semibold">{p.pageviews} views</span>
											<span class="text-hint text-[11px]">{p.unique_visitors} users</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
