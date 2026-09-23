<script lang="ts">
	import { onMount } from 'svelte';
	import {
		FileBarChart,
		Plus,
		Trash2,
		X,
		Calendar,
		Filter,
		Activity,
		Eye,
		ExternalLink,
		Sparkles,
		Clock,
		Check,
		Layers
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { fetchOverview, fetchBreakdown } from '$lib/api';

	interface SavedReportItem {
		id: string;
		siteId: string;
		name: string;
		filters: {
			range?: string;
			metrics?: string[];
			path?: string;
			country?: string;
			device?: string;
			referrer?: string;
		};
		createdAt: string;
		updatedAt: string;
	}

	interface ReportStatSummary {
		visitors: number;
		pageviews: number;
		bounceRate: number;
		loading?: boolean;
	}

	let reports = $state<SavedReportItem[]>([]);
	let reportStatsMap = $state<Record<string, ReportStatSummary>>({});
	let isLoading = $state(true);
	let isSaving = $state(false);

	// Modal State
	let showAddModal = $state(false);
	let newReportName = $state('');
	let newRange = $state('7d');
	let selectedMetrics = $state<string[]>(['visitors', 'pageviews', 'bounce_rate']);
	let filterPath = $state('');
	let filterCountry = $state('');
	let filterDevice = $state('');

	// Active Preview State
	let viewingReport = $state<SavedReportItem | null>(null);
	let previewLoading = $state(false);
	let previewStats = $state<{ visitors: number; pageviews: number; bounceRate: number } | null>(null);
	let previewBreakdown = $state<any[]>([]);

	const metricOptions = [
		{ id: 'visitors', label: 'Unique Visitors' },
		{ id: 'pageviews', label: 'Total Pageviews' },
		{ id: 'bounce_rate', label: 'Bounce Rate' },
		{ id: 'duration', label: 'Avg Duration' }
	];

	const rangeOptions = [
		{ id: 'today', label: 'Today' },
		{ id: '7d', label: 'Last 7 Days' },
		{ id: '30d', label: 'Last 30 Days' },
		{ id: '90d', label: 'Last 90 Days' }
	];

	function toggleMetric(id: string) {
		if (selectedMetrics.includes(id)) {
			selectedMetrics = selectedMetrics.filter((m) => m !== id);
		} else {
			selectedMetrics = [...selectedMetrics, id];
		}
	}

	async function loadAllReportStats(items: SavedReportItem[]) {
		for (const r of items) {
			const site = siteStore.sites.find((s) => s.id === r.siteId || s.trackingId === r.siteId);
			const trackingId = site?.trackingId || siteStore.currentSite?.trackingId || siteStore.activeSiteId;
			if (!trackingId) continue;

			reportStatsMap[r.id] = { visitors: 0, pageviews: 0, bounceRate: 0, loading: true };
			fetchOverview(
				trackingId,
				r.filters.range || '7d',
				undefined,
				r.filters.path,
				r.filters.country,
				r.filters.device
			)
				.then((stats) => {
					reportStatsMap[r.id] = {
						visitors: stats.visitors,
						pageviews: stats.pageviews,
						bounceRate: stats.bounceRate,
						loading: false
					};
				})
				.catch(() => {
					reportStatsMap[r.id] = { visitors: 0, pageviews: 0, bounceRate: 0, loading: false };
				});
		}
	}

	async function loadReports() {
		const targetSiteId = siteStore.currentSite?.id || siteStore.activeSiteId;
		isLoading = true;
		try {
			const queryUrl = targetSiteId ? `/api/reports?siteId=${targetSiteId}` : '/api/reports';
			const res = await fetch(queryUrl);
			if (res.ok) {
				const list: SavedReportItem[] = await res.json();
				reports = list;
				await loadAllReportStats(list);
			}
		} catch (err) {
			console.error('Failed to load reports', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleCreateReport() {
		const targetSiteId = siteStore.currentSite?.id || siteStore.activeSiteId;
		if (!newReportName.trim() || !targetSiteId) return;
		isSaving = true;
		try {
			const res = await fetch('/api/reports', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: targetSiteId,
					name: newReportName.trim(),
					filters: {
						range: newRange,
						metrics: selectedMetrics,
						path: filterPath.trim() || undefined,
						country: filterCountry.trim().toUpperCase() || undefined,
						device: filterDevice || undefined
					}
				})
			});

			if (res.ok) {
				newReportName = '';
				filterPath = '';
				filterCountry = '';
				filterDevice = '';
				showAddModal = false;
				await loadReports();
			}
		} catch (err) {
			console.error('Failed to create report', err);
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(reportId: string) {
		try {
			const res = await fetch(`/api/reports?id=${reportId}`, { method: 'DELETE' });
			if (res.ok) {
				reports = reports.filter((r) => r.id !== reportId);
				delete reportStatsMap[reportId];
				if (viewingReport?.id === reportId) {
					viewingReport = null;
				}
			}
		} catch (err) {
			console.error('Failed to delete report', err);
		}
	}

	async function openReportPreview(report: SavedReportItem) {
		viewingReport = report;
		previewLoading = true;
		previewStats = null;
		previewBreakdown = [];
		try {
			const site = siteStore.sites.find((s) => s.id === report.siteId || s.trackingId === report.siteId);
			const targetSite = site?.trackingId || siteStore.currentSite?.trackingId || siteStore.activeSiteId;
			const stats = await fetchOverview(
				targetSite,
				report.filters.range || '7d',
				undefined,
				report.filters.path,
				report.filters.country,
				report.filters.device
			);
			previewStats = {
				visitors: stats.visitors,
				pageviews: stats.pageviews,
				bounceRate: stats.bounceRate
			};
			const breakdown = await fetchBreakdown(targetSite, 'url_path', report.filters.range || '7d', undefined, 10);
			if (report.filters.path) {
				const filtered = breakdown.filter((b) => b.label && b.label.startsWith(report.filters.path!));
				previewBreakdown = filtered.length > 0 ? filtered : breakdown;
			} else {
				previewBreakdown = breakdown;
			}
		} catch (err) {
			console.error('Failed to load preview stats', err);
		} finally {
			previewLoading = false;
		}
	}

	$effect(() => {
		if (siteStore.activeSiteId) {
			loadReports();
		}
	});

	onMount(() => {
		loadReports();
	});
</script>

<svelte:head>
	<title>Custom Reports — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-5xl">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold tracking-tight text-heading">Custom Reports</h1>
				<span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
					{reports.length} Saved
				</span>
			</div>
			<p class="text-xs text-label mt-1">
				Save custom query presets, KPI combinations, and filtered snapshots for quick recurring analysis.
			</p>
		</div>

		<button
			onclick={() => (showAddModal = true)}
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors active:scale-[0.98]"
		>
			<Plus size={14} strokeWidth={2} />
			<span>New Report</span>
		</button>
	</div>

	<!-- Reports Grid -->
	{#if isLoading}
		<div class="flex h-48 items-center justify-center card">
			<div class="flex items-center gap-2 text-xs text-label">
				<Clock size={16} class="animate-spin text-primary" />
				<span>Loading saved reports...</span>
			</div>
		</div>
	{:else if reports.length === 0}
		<div class="flex flex-col items-center justify-center p-12 text-center card border-dashed">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3 border border-primary/20">
				<FileBarChart size={24} />
			</div>
			<h3 class="text-sm font-semibold text-heading">No saved reports yet</h3>
			<p class="text-xs text-label max-w-sm mt-1 mb-4">
				Create recurring snapshot presets for campaigns, blog traffic, conversion funnels, or specific geographical segments.
			</p>
			<button
				onclick={() => (showAddModal = true)}
				class="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
			>
				<Plus size={14} />
				<span>Create Your First Report</span>
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each reports as report}
				<div class="card p-4 flex flex-col justify-between transition-all hover:border-primary/40 hover:shadow-sm">
					<div>
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
									<Layers size={16} />
								</div>
								<div>
									<h3 class="text-sm font-semibold text-heading line-clamp-1">{report.name}</h3>
									<span class="text-[11px] text-hint">Created {new Date(report.createdAt).toLocaleDateString()}</span>
								</div>
							</div>

							<button
								onclick={() => handleDelete(report.id)}
								class="text-slate-500 hover:text-rose-400 p-1 transition-colors"
								title="Delete report"
							>
								<Trash2 size={13} />
							</button>
						</div>

						<!-- Filter Badges & Details -->
						<div class="mt-3.5 flex flex-wrap gap-1.5">
							<span class="inline-flex items-center gap-1 rounded-md bg-card border border-themed px-2 py-0.5 text-[10px] font-medium text-body">
								<Calendar size={10} />
								{report.filters.range?.toUpperCase() || '7D'}
							</span>

							{#if report.filters.path}
								<span class="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300 border border-sky-500/20">
									<Filter size={10} />
									Path: {report.filters.path}
								</span>
							{/if}

							{#if report.filters.country}
								<span class="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300 border border-orange-500/20">
									Country: {report.filters.country}
								</span>
							{/if}

							{#if report.filters.device}
								<span class="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 border border-violet-500/20">
									{report.filters.device}
								</span>
							{/if}
						</div>

						<!-- Real-Time Metric Display on Card -->
						{#if reportStatsMap[report.id]?.loading}
							<div class="mt-3.5 grid grid-cols-3 gap-2 rounded-lg border border-themed bg-card p-2.5 animate-pulse">
								<div class="h-8 bg-slate-700/20 rounded"></div>
								<div class="h-8 bg-slate-700/20 rounded"></div>
								<div class="h-8 bg-slate-700/20 rounded"></div>
							</div>
						{:else if reportStatsMap[report.id]}
							<div class="mt-3.5 grid grid-cols-3 gap-2 rounded-lg border border-themed bg-card p-2.5">
								<div class="flex flex-col">
									<span class="text-[10px] text-label">Visitors</span>
									<span class="text-sm font-bold text-heading">
										{reportStatsMap[report.id].visitors.toLocaleString()}
									</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[10px] text-label">Pageviews</span>
									<span class="text-sm font-bold text-heading">
										{reportStatsMap[report.id].pageviews.toLocaleString()}
									</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[10px] text-label">Bounce</span>
									<span class="text-sm font-bold text-heading">
										{reportStatsMap[report.id].bounceRate}%
									</span>
								</div>
							</div>
						{/if}

						<!-- Tracked Metrics Count -->
						{#if report.filters.metrics && report.filters.metrics.length > 0}
							<div class="mt-2.5 flex items-center gap-1 text-[11px] text-label">
								<Activity size={12} class="text-primary" />
								<span>{report.filters.metrics.length} metrics configured</span>
							</div>
						{/if}
					</div>

					<div class="mt-4 border-t border-themed pt-3 flex items-center justify-between">
						<span class="text-[10px] text-hint">Scheduled snapshot</span>
						<button
							onclick={() => openReportPreview(report)}
							class="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
						>
							<Eye size={12} />
							<span>Run Detailed Report</span>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create Report Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-lg card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<FileBarChart size={16} class="text-primary" />
						<h2 class="text-sm font-bold text-heading">Configure Custom Report</h2>
					</div>
					<button onclick={() => (showAddModal = false)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<div class="flex flex-col gap-3.5">
					<div>
						<label for="report-name" class="mb-1 block text-[11px] font-medium text-body">Report Name</label>
						<input
							id="report-name"
							type="text"
							bind:value={newReportName}
							placeholder="e.g. Monthly Top Blog Performance"
							class="w-full rounded-md input-field px-3 py-1.5 text-xs"
						/>
					</div>

					<!-- Time Range Preset -->
					<div>
						<span class="mb-1.5 block text-[11px] font-medium text-body">Default Time Range</span>
						<div class="grid grid-cols-4 gap-2">
							{#each rangeOptions as opt}
								<button
									type="button"
									onclick={() => (newRange = opt.id)}
									class="rounded-md border py-1.5 text-xs font-medium transition-colors {newRange === opt.id ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-themed bg-input text-label hover:text-heading'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Metrics to Include -->
					<div>
						<span class="mb-1.5 block text-[11px] font-medium text-body">Included Metrics</span>
						<div class="grid grid-cols-2 gap-2">
							{#each metricOptions as m}
								<button
									type="button"
									onclick={() => toggleMetric(m.id)}
									class="flex items-center justify-between rounded-md border p-2 text-xs transition-colors {selectedMetrics.includes(m.id) ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-themed bg-input text-label hover:text-heading'}"
								>
									<span>{m.label}</span>
									{#if selectedMetrics.includes(m.id)}
										<Check size={13} class="text-primary" />
									{/if}
								</button>
							{/each}
						</div>
					</div>

					<!-- Filter Criteria -->
					<div class="flex flex-col gap-2.5 rounded-lg border border-themed p-3 bg-card">
						<span class="text-[11px] font-semibold text-heading">Filter Segment (Optional)</span>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<div>
								<label for="filter-path" class="mb-1 block text-[10px] text-label">Path Prefix</label>
								<input
									id="filter-path"
									type="text"
									bind:value={filterPath}
									placeholder="/blog or /pricing"
									class="w-full rounded-md input-field px-2.5 py-1 text-xs"
								/>
							</div>
							<div>
								<label for="filter-country" class="mb-1 block text-[10px] text-label">Country Code</label>
								<input
									id="filter-country"
									type="text"
									bind:value={filterCountry}
									placeholder="US, ID, DE"
									class="w-full rounded-md input-field px-2.5 py-1 text-xs uppercase"
								/>
							</div>
						</div>

						<div>
							<label for="filter-device" class="mb-1 block text-[10px] text-label">Device Type</label>
							<select id="filter-device" bind:value={filterDevice} class="w-full rounded-md input-field px-2.5 py-1 text-xs">
								<option value="">All Devices</option>
								<option value="Desktop">Desktop</option>
								<option value="Mobile">Mobile</option>
								<option value="Tablet">Tablet</option>
							</select>
						</div>
					</div>
				</div>

				<div class="mt-2 flex items-center justify-end gap-2 border-t border-themed pt-3">
					<button
						onclick={() => (showAddModal = false)}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-heading"
					>
						Cancel
					</button>
					<button
						onclick={handleCreateReport}
						disabled={isSaving || !newReportName.trim()}
						class="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
					>
						{isSaving ? 'Saving...' : 'Save Report'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Report Preview Modal -->
	{#if viewingReport}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-xl card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div>
						<h2 class="text-sm font-bold text-heading">{viewingReport.name}</h2>
						<span class="text-[10px] text-hint">Range: {viewingReport.filters.range?.toUpperCase() || '7D'}</span>
					</div>
					<button onclick={() => (viewingReport = null)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				{#if previewLoading}
					<div class="flex h-40 items-center justify-center">
						<Clock size={20} class="animate-spin text-primary" />
					</div>
				{:else if previewStats}
					<div class="grid grid-cols-3 gap-3">
						<div class="rounded-lg border border-themed bg-card p-3">
							<span class="text-[10px] text-label">Visitors</span>
							<p class="text-lg font-bold text-heading">{previewStats.visitors.toLocaleString()}</p>
						</div>
						<div class="rounded-lg border border-themed bg-card p-3">
							<span class="text-[10px] text-label">Pageviews</span>
							<p class="text-lg font-bold text-heading">{previewStats.pageviews.toLocaleString()}</p>
						</div>
						<div class="rounded-lg border border-themed bg-card p-3">
							<span class="text-[10px] text-label">Bounce Rate</span>
							<p class="text-lg font-bold text-heading">{previewStats.bounceRate}%</p>
						</div>
					</div>

					{#if previewBreakdown.length > 0}
						<div class="flex flex-col gap-2 mt-2">
							<span class="text-xs font-semibold text-heading">Top Matched Pages</span>
							<div class="rounded-lg border border-themed divide-y divide-themed bg-card overflow-hidden">
								{#each previewBreakdown as item}
									<div class="flex items-center justify-between p-2.5 text-xs">
										<span class="font-mono text-[11px] text-heading">{item.label}</span>
										<span class="font-semibold text-primary">{item.count.toLocaleString()} views</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/if}

				<div class="mt-2 flex items-center justify-between border-t border-themed pt-3">
					<a
						href="/"
						class="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover hover:underline"
					>
						<span>Explore in Analytics</span>
						<ExternalLink size={12} />
					</a>
					<button
						onclick={() => (viewingReport = null)}
						class="btn-primary px-3.5 py-1.5 text-xs font-semibold"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
