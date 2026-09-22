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
		Plus
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
	let annotations = $state<{ id: string; date: string; title: string; description?: string; category: string; color: string }[]>([]);
	let showAnnotationModal = $state(false);
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

	<!-- KPI Metric Cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		{#each kpis as kpi}
			<KPICard {...kpi} />
		{/each}
	</div>

	<!-- Time Series Chart -->
	<TimeSeriesChart
		data={chartData}
		annotations={annotations}
		onAddAnnotation={() => (showAnnotationModal = true)}
	/>

	<!-- Annotation Creation Modal -->
	{#if showAnnotationModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
