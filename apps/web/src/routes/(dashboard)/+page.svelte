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
		Activity,
		Pin,
		X,
		Plus,
		Sliders,
		Megaphone,
		ArrowUp,
		ArrowDown,
		Check,
		RotateCcw
	} from '@lucide/svelte';
	import {
		fetchOverview,
		fetchTimeSeries,
		fetchBreakdown,
		type BreakdownItem,
		type TimeSeriesPoint,
		type OverviewStats
	} from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import { widgetStore } from '$lib/stores/widgets.svelte';

	let uniqueVisitors = $state(0);
	let totalPageviews = $state(0);
	let bounceRate = $state(0);
	let avgDuration = $state(0);
	let hasData = $state(false);
	let isLoading = $state(true);

	// Period over period comparison
	let compareOverview = $state<OverviewStats | null>(null);
	let compareChartData = $state<TimeSeriesPoint[]>([]);

	let chartData = $state<TimeSeriesPoint[]>([]);
	let annotations = $state<{ id: string; date: string; title: string; description?: string; category: string; color: string }[]>([]);
	let showAnnotationModal = $state(false);
	let showWidgetModal = $state(false);
	let newNoteDate = $state(new Date().toISOString().split('T')[0]);
	let newNoteTitle = $state('');
	let newNoteDesc = $state('');
	let newNoteCategory = $state('release');
	let newNoteColor = $state('indigo');
	let isSavingNote = $state(false);

	let topPages = $state<BreakdownItem[]>([]);
	let topSources = $state<BreakdownItem[]>([]);
	let topLocations = $state<BreakdownItem[]>([]);
	let geoDimension = $state<'country' | 'region' | 'city'>('country');
	let topDevices = $state<BreakdownItem[]>([]);
	let topCampaigns = $state<BreakdownItem[]>([]);

	function calcDelta(current: number, previous?: number): number | undefined {
		if (previous === undefined || previous === 0) return undefined;
		return Math.round(((current - previous) / previous) * 1000) / 10;
	}

	const kpis = $derived([
		{
			label: 'Unique Visitors',
			value: uniqueVisitors,
			icon: Users,
			change: compareOverview ? calcDelta(uniqueVisitors, compareOverview.visitors) : undefined,
			subtitle: dateStore.compareMode !== 'none' ? dateStore.compareLabel : 'Total daily unique'
		},
		{
			label: 'Total Pageviews',
			value: totalPageviews,
			icon: Eye,
			change: compareOverview ? calcDelta(totalPageviews, compareOverview.pageviews) : undefined,
			subtitle: dateStore.compareMode !== 'none' ? dateStore.compareLabel : 'Raw page views'
		},
		{
			label: 'Bounce Rate',
			value: bounceRate,
			format: 'percent' as const,
			icon: Percent,
			change: compareOverview ? Math.round((bounceRate - compareOverview.bounceRate) * 10) / 10 : undefined,
			subtitle: dateStore.compareMode !== 'none' ? dateStore.compareLabel : 'Single page sessions'
		},
		{
			label: 'Avg. Duration',
			value: avgDuration,
			format: 'duration' as const,
			icon: Clock,
			change: compareOverview ? calcDelta(avgDuration, compareOverview.avgDurationSec) : undefined,
			subtitle: dateStore.compareMode !== 'none' ? dateStore.compareLabel : 'Time per session'
		}
	]);

	async function loadRealData() {
		try {
			const currentSite = siteStore.activeSiteId;
			if (!currentSite) return;
			const from = dateStore.from;
			const to = dateStore.to;

			const promises: Promise<any>[] = [
				fetchOverview(currentSite, from, to),
				fetchTimeSeries(currentSite, from, to),
				fetchBreakdown(currentSite, 'url_path', from, to, 10),
				fetchBreakdown(currentSite, 'referrer_domain', from, to, 10),
				fetchBreakdown(currentSite, geoDimension, from, to, 10),
				fetchBreakdown(currentSite, 'device_type', from, to, 10),
				fetchBreakdown(currentSite, 'utm_campaign', from, to, 10)
			];

			// Parallel comparison period query if active
			if (dateStore.compareMode !== 'none' && dateStore.compareFrom && dateStore.compareTo) {
				promises.push(fetchOverview(currentSite, dateStore.compareFrom, dateStore.compareTo));
				promises.push(fetchTimeSeries(currentSite, dateStore.compareFrom, dateStore.compareTo));
			}

			const results = await Promise.all(promises);

			const overview = results[0];
			const ts = results[1];
			topPages = results[2];
			topSources = results[3];
			topLocations = results[4];
			topDevices = results[5];
			topCampaigns = results[6];

			uniqueVisitors = overview.visitors;
			totalPageviews = overview.pageviews;
			bounceRate = overview.bounceRate;
			avgDuration = overview.avgDurationSec;
			chartData = ts;

			if (results.length > 7) {
				compareOverview = results[7];
				compareChartData = results[8] || [];
			} else {
				compareOverview = null;
				compareChartData = [];
			}

			hasData = overview.pageviews > 0;
			await loadAnnotations();
		} catch {
			// Failed to reach query API
		} finally {
			isLoading = false;
		}
	}

	async function loadAnnotations() {
		try {
			const currentSite = siteStore.activeSiteId;
			if (!currentSite) return;
			const res = await fetch(`/api/annotations?siteId=${currentSite}`);
			if (res.ok) {
				annotations = await res.json();
			}
		} catch {
			// ignore
		}
	}

	async function handleCreateAnnotation() {
		const currentSite = siteStore.activeSiteId;
		if (!newNoteTitle.trim() || !newNoteDate || !currentSite) return;
		isSavingNote = true;
		try {
			const res = await fetch('/api/annotations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: currentSite,
					date: newNoteDate,
					title: newNoteTitle.trim(),
					description: newNoteDesc.trim(),
					category: newNoteCategory,
					color: newNoteColor
				})
			});
			if (res.ok) {
				newNoteTitle = '';
				newNoteDesc = '';
				showAnnotationModal = false;
				await loadAnnotations();
			}
		} catch (err) {
			console.error('Failed to create annotation', err);
		} finally {
			isSavingNote = false;
		}
	}

	async function handleDeleteAnnotation(id: string) {
		try {
			const res = await fetch(`/api/annotations?id=${encodeURIComponent(id)}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				await loadAnnotations();
			}
		} catch (err) {
			console.error('Failed to delete annotation', err);
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
			widgetStore.init(current);
			untrack(() => {
				loadRealData();
			});
		}
	});

	onMount(() => {
		widgetStore.init(siteStore.activeSiteId);
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
	<!-- Top Bar Action: Customize Widgets -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-base font-bold tracking-tight text-heading">Analytics Overview</h2>
			{#if dateStore.compareMode !== 'none'}
				<span class="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono text-indigo-400 border border-indigo-500/20">
					<span>Comparing:</span>
					<span class="font-bold">{dateStore.compareLabel}</span>
				</span>
			{/if}
		</div>

		<button
			type="button"
			onclick={() => (showWidgetModal = true)}
			class="btn-ghost flex items-center gap-1.5 rounded-lg border border-themed px-2.5 py-1 text-xs text-label hover:text-heading hover:bg-card-hover transition-colors shadow-sm cursor-pointer"
		>
			<Sliders size={13} class="text-indigo-400" />
			<span>Customize Widgets</span>
		</button>
	</div>

	<!-- Zero-state when user has no websites added -->
	{#if siteStore.sites.length === 0 && !isLoading}
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-xs shadow-sm">
			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
					<Globe size={18} />
				</div>
				<div>
					<h3 class="font-semibold text-heading text-sm">Welcome to Gravlytics!</h3>
					<p class="text-slate-400 text-xs mt-0.5">You haven't added any websites yet. Add your first website to get your tracking code and start collecting metrics.</p>
				</div>
			</div>
			<a
				href="/settings/sites"
				class="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
			>
				<span>Add Website</span>
			</a>
		</div>
	{:else if !hasData && !isLoading}
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

	<!-- Customizable Widgets Rendered in Order -->
	{#each widgetStore.widgets as widget, index}
		{#if widget.enabled}
			{#if widget.id === 'kpi_cards'}
				<!-- KPI Metric Cards -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{#each kpis as kpi}
						<KPICard {...kpi} />
					{/each}
				</div>
			{:else if widget.id === 'traffic_chart'}
				<!-- Time Series Chart -->
				<TimeSeriesChart
					data={chartData}
					compareData={compareChartData}
					annotations={annotations}
					onAddAnnotation={() => (showAnnotationModal = true)}
					onDeleteAnnotation={handleDeleteAnnotation}
				/>
			{:else if widget.id === 'top_pages'}
				<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
					<BreakdownTable title="Top Visited Pages" items={topPages} icon={FileText} metricLabel="Pageviews" />
					<BreakdownTable title="Referral Sources" items={topSources} icon={Compass} metricLabel="Visitors" />
				</div>
			{:else if widget.id === 'geo_distribution'}
				<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
			{:else if widget.id === 'campaign_summary' && topCampaigns.length > 0}
				<div class="grid grid-cols-1 gap-3">
					<BreakdownTable title="Active UTM Campaigns" items={topCampaigns} icon={Megaphone} metricLabel="Visitors" />
				</div>
			{/if}
		{/if}
	{/each}

	<!-- Annotation Creation Modal -->
	{#if showAnnotationModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
			<div class="relative w-full max-w-md rounded-xl border border-themed bg-card p-6 shadow-2xl">
				<div class="flex items-center justify-between pb-4 border-b border-themed">
					<div class="flex items-center gap-2">
						<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
							<Pin size={15} />
						</div>
						<h3 class="font-semibold text-heading text-sm">Add Timeline Annotation</h3>
					</div>
					<button
						type="button"
						onclick={() => (showAnnotationModal = false)}
						class="text-hint hover:text-heading transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				<form onsubmit={(e) => { e.preventDefault(); handleCreateAnnotation(); }} class="mt-4 space-y-4">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="ann-date" class="block text-xs font-medium text-label mb-1">Event Date</label>
							<input
								id="ann-date"
								type="date"
								bind:value={newNoteDate}
								required
								class="w-full rounded-lg border border-themed bg-input px-3 py-2 text-xs text-heading focus:border-indigo-500 focus:outline-none"
							/>
						</div>
						<div>
							<label for="ann-category" class="block text-xs font-medium text-label mb-1">Category</label>
							<select
								id="ann-category"
								bind:value={newNoteCategory}
								class="w-full rounded-lg border border-themed bg-input px-3 py-2 text-xs text-heading focus:border-indigo-500 focus:outline-none"
							>
								<option value="release">Product Release</option>
								<option value="marketing">Marketing Campaign</option>
								<option value="incident">Downtime / Incident</option>
								<option value="maintenance">Maintenance</option>
							</select>
						</div>
					</div>

					<div>
						<label for="ann-title" class="block text-xs font-medium text-label mb-1">Annotation Title</label>
						<input
							id="ann-title"
							type="text"
							placeholder="e.g. v2.4 Launch or HackerNews Post"
							bind:value={newNoteTitle}
							required
							class="w-full rounded-lg border border-themed bg-input px-3 py-2 text-xs text-heading focus:border-indigo-500 focus:outline-none placeholder:text-hint"
						/>
					</div>

					<div>
						<label for="ann-desc" class="block text-xs font-medium text-label mb-1">Description (Optional)</label>
						<textarea
							id="ann-desc"
							rows={3}
							placeholder="Add context about this release or event..."
							bind:value={newNoteDesc}
							class="w-full rounded-lg border border-themed bg-input px-3 py-2 text-xs text-heading focus:border-indigo-500 focus:outline-none placeholder:text-hint resize-none"
						></textarea>
					</div>

					<div>
						<span class="block text-xs font-medium text-label mb-1.5">Color Badge</span>
						<div class="flex items-center gap-2">
							{#each [
								{ id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
								{ id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
								{ id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
								{ id: 'rose', label: 'Rose', bg: 'bg-rose-500' }
							] as c}
								<button
									type="button"
									onclick={() => (newNoteColor = c.id)}
									class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all {newNoteColor === c.id ? 'border-indigo-500 bg-indigo-500/10 text-heading' : 'border-themed text-body hover:border-indigo-500/30'}"
								>
									<span class="h-2 w-2 rounded-full {c.bg}"></span>
									<span>{c.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="flex items-center justify-end gap-2 pt-2 border-t border-themed">
						<button
							type="button"
							onclick={() => (showAnnotationModal = false)}
							class="rounded-lg border border-themed px-3 py-1.5 text-xs text-body hover:bg-card-hover transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSavingNote || !newNoteTitle.trim()}
							class="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
						>
							{isSavingNote ? 'Saving...' : 'Pin Annotation'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Custom Dashboard Widgets Drawer / Modal -->
	{#if showWidgetModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
			<div class="relative w-full max-w-lg rounded-2xl border border-themed bg-card p-6 shadow-2xl">
				<div class="flex items-center justify-between pb-4 border-b border-themed">
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
							<Sliders size={16} />
						</div>
						<div>
							<h3 class="font-semibold text-heading text-sm">Customize Dashboard Layout</h3>
							<p class="text-[11px] text-hint">Toggle visibility and reorder dashboard widgets</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => (showWidgetModal = false)}
						class="text-hint hover:text-heading transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				<div class="mt-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
					{#each widgetStore.widgets as w, idx}
						<div class="flex items-center justify-between rounded-xl border border-themed bg-input/40 p-3 transition-colors hover:border-indigo-500/30">
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									checked={w.enabled}
									onchange={() => widgetStore.toggleWidget(w.id, siteStore.activeSiteId)}
									class="rounded border-themed text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
								/>
								<div>
									<span class="font-semibold text-xs text-heading">{w.title}</span>
									<p class="text-[10px] text-hint">{w.description}</p>
								</div>
							</div>

							<div class="flex items-center gap-1">
								<button
									type="button"
									disabled={idx === 0}
									onclick={() => widgetStore.moveWidget(idx, 'up', siteStore.activeSiteId)}
									class="p-1 text-hint hover:text-heading disabled:opacity-30 rounded hover:bg-card-hover transition-colors"
									title="Move up"
								>
									<ArrowUp size={13} />
								</button>
								<button
									type="button"
									disabled={idx === widgetStore.widgets.length - 1}
									onclick={() => widgetStore.moveWidget(idx, 'down', siteStore.activeSiteId)}
									class="p-1 text-hint hover:text-heading disabled:opacity-30 rounded hover:bg-card-hover transition-colors"
									title="Move down"
								>
									<ArrowDown size={13} />
								</button>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-5 flex items-center justify-between pt-4 border-t border-themed">
					<button
						type="button"
						onclick={() => widgetStore.resetDefaults(siteStore.activeSiteId)}
						class="flex items-center gap-1.5 text-xs text-hint hover:text-heading transition-colors"
					>
						<RotateCcw size={13} />
						<span>Reset to Default</span>
					</button>

					<button
						type="button"
						onclick={() => (showWidgetModal = false)}
						class="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
