<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Bug,
		AlertTriangle,
		ShieldCheck,
		FileCode,
		Clock,
		RefreshCw,
		X,
		ExternalLink,
		ChevronRight,
		Terminal,
		CheckCircle2
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import { fetchErrors, type ErrorOverviewResult, type ErrorItem } from '$lib/api';
	import KPICard from '$lib/components/KPICard.svelte';

	let errorData = $state<ErrorOverviewResult | null>(null);
	let isLoading = $state(true);
	let selectedError = $state<ErrorItem | null>(null);

	async function loadErrorStats() {
		const siteId = siteStore.activeSiteId;
		if (!siteId) return;
		isLoading = true;
		try {
			const res = await fetchErrors(siteId, dateStore.from, dateStore.to, 50);
			errorData = res;
		} catch (err) {
			console.error('Failed to load error metrics', err);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const s = siteStore.activeSiteId;
		const v = dateStore.version;
		if (s) {
			untrack(() => {
				loadErrorStats();
			});
		}
	});

	onMount(() => {
		loadErrorStats();
	});
</script>

<svelte:head>
	<title>Error Tracking — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-7xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
					<Bug size={18} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">JavaScript Error Tracking</h1>
			</div>
			<p class="text-xs text-label mt-1">
				Real-time monitoring of client-side runtime script exceptions, unhandled rejections, and impacted sessions.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={loadErrorStats}
				disabled={isLoading}
				class="btn-ghost flex items-center gap-1.5 rounded-lg border border-themed px-3 py-1.5 text-xs text-body hover:text-heading cursor-pointer shadow-sm"
			>
				<RefreshCw size={13} class={isLoading ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<KPICard
			label="Total Exceptions"
			value={errorData?.total_errors || 0}
			icon={AlertTriangle}
			subtitle="Unhandled script errors"
		/>
		<KPICard
			label="Impacted Visitors"
			value={errorData?.impacted_users || 0}
			icon={Bug}
			subtitle="Unique users experiencing errors"
		/>
		<KPICard
			label="Error-Free Sessions"
			value={errorData?.error_free_rate || 100}
			format="percent"
			icon={ShieldCheck}
			subtitle="Sessions without any errors"
		/>
		<div class="card flex flex-col justify-between p-4">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">Top Failing Path</span>
			<div class="mt-2 flex flex-col">
				<span class="text-sm font-mono font-bold text-heading truncate">{errorData?.top_failing_page || 'None'}</span>
				<span class="text-[11px] text-hint mt-0.5">{errorData?.errors.length || 0} distinct error issues</span>
			</div>
		</div>
	</div>

	<!-- Error Occurrence Timeline -->
	{#if errorData && errorData.timeseries.length > 0}
		<div class="card p-5 flex flex-col gap-3">
			<div class="flex items-center justify-between border-b border-themed pb-2.5">
				<div class="flex items-center gap-2">
					<Clock size={15} class="text-indigo-400" />
					<h3 class="font-semibold text-xs text-heading">Error Occurrence Frequency</h3>
				</div>
				<span class="text-[11px] font-mono text-hint">{errorData.timeseries.length} days recorded</span>
			</div>

			<div class="flex items-end gap-1.5 h-28 pt-4">
				{#each errorData.timeseries as pt}
					{@const maxCnt = Math.max(...errorData.timeseries.map(t => t.count), 1)}
					{@const heightPct = Math.max(8, (pt.count / maxCnt) * 100)}
					<div class="group relative flex-1 flex flex-col items-center justify-end h-full">
						<div
							class="w-full max-w-[16px] rounded-t-sm bg-rose-500/60 hover:bg-rose-400 transition-colors"
							style="height: {heightPct}%"
						></div>
						<div class="card-modal pointer-events-none absolute -top-12 z-30 hidden min-w-[90px] flex-col p-1.5 text-[10px] group-hover:flex">
							<span class="font-mono text-heading">{pt.date}</span>
							<span class="font-bold text-rose-400">{pt.count} errors</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Errors Log Table -->
	<div class="card p-5 flex flex-col gap-4">
		<div class="flex items-center justify-between border-b border-themed pb-3">
			<div class="flex items-center gap-2">
				<FileCode size={16} class="text-indigo-400" />
				<h3 class="font-semibold text-sm text-heading">Active Error Exceptions</h3>
			</div>
			<span class="text-[11px] font-mono text-hint">{errorData?.errors.length || 0} unique bugs</span>
		</div>

		{#if isLoading}
			<div class="flex h-36 items-center justify-center text-xs text-hint">
				Loading runtime error telemetry...
			</div>
		{:else if !errorData || errorData.errors.length === 0}
			<div class="flex flex-col items-center justify-center h-48 text-center p-6 border border-dashed border-themed rounded-xl">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
					<CheckCircle2 size={20} />
				</div>
				<span class="text-sm font-semibold text-heading">Zero runtime errors captured!</span>
				<p class="text-xs text-hint mt-1 max-w-sm">
					Your website JavaScript is running cleanly without unhandled runtime exceptions.
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-themed text-[11px] font-semibold text-hint">
							<th class="py-2.5 px-3">Exception Message</th>
							<th class="py-2.5 px-3">Source File & Line</th>
							<th class="py-2.5 px-3 text-right">Events</th>
							<th class="py-2.5 px-3 text-right">Users</th>
							<th class="py-2.5 px-3 text-right">Last Seen</th>
							<th class="py-2.5 px-3 text-right">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-themed/50 font-mono">
						{#each errorData.errors as err}
							<tr class="hover:bg-card-hover transition-colors">
								<td class="py-3 px-3 font-medium text-heading">
									<div class="flex items-center gap-2">
										<span class="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
										<span class="truncate max-w-md font-sans text-xs font-semibold text-rose-300 dark:text-rose-200">
											{err.message}
										</span>
									</div>
								</td>
								<td class="py-3 px-3 text-hint text-[11px] truncate max-w-[200px]">
									{err.filename ? `${err.filename}:${err.lineno || '1'}` : 'Inline Script'}
								</td>
								<td class="py-3 px-3 text-right font-bold text-heading">
									{err.count.toLocaleString()}
								</td>
								<td class="py-3 px-3 text-right text-hint">
									{err.visitors.toLocaleString()}
								</td>
								<td class="py-3 px-3 text-right text-hint text-[11px]">
									{err.last_seen || 'Recently'}
								</td>
								<td class="py-3 px-3 text-right">
									<button
										type="button"
										onclick={() => (selectedError = err)}
										class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-sans text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 transition-colors cursor-pointer"
									>
										<span>Inspect</span>
										<ChevronRight size={12} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Error Stack Trace Modal -->
	{#if selectedError}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
			<div class="relative w-full max-w-2xl rounded-2xl border border-themed bg-card p-6 shadow-2xl">
				<div class="flex items-start justify-between border-b border-themed pb-4">
					<div class="flex items-start gap-3">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
							<Terminal size={16} />
						</div>
						<div>
							<h3 class="font-bold text-sm text-heading">{selectedError.message}</h3>
							<p class="text-[11px] font-mono text-hint mt-0.5">{selectedError.filename || 'Script'}:{selectedError.lineno || '0'}</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => (selectedError = null)}
						class="text-hint hover:text-heading transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				<div class="mt-4 flex flex-col gap-3">
					<div class="grid grid-cols-3 gap-2 text-xs font-mono">
						<div class="card-inset p-2.5 rounded-lg border border-themed">
							<span class="text-[10px] text-hint block font-sans">Occurrence Count</span>
							<span class="text-base font-bold text-heading">{selectedError.count}</span>
						</div>
						<div class="card-inset p-2.5 rounded-lg border border-themed">
							<span class="text-[10px] text-hint block font-sans">Affected Users</span>
							<span class="text-base font-bold text-heading">{selectedError.visitors}</span>
						</div>
						<div class="card-inset p-2.5 rounded-lg border border-themed">
							<span class="text-[10px] text-hint block font-sans">Target Page</span>
							<span class="text-xs font-bold text-heading truncate block mt-1">{selectedError.path || '/'}</span>
						</div>
					</div>

					<div class="flex flex-col gap-1.5 mt-2">
						<span class="text-xs font-semibold text-heading">Stack Trace</span>
						<pre class="p-3.5 rounded-xl border border-themed bg-input/70 font-mono text-[11px] text-rose-300 dark:text-rose-200 overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed">
{selectedError.stack || 'No extended stack trace available for this event.'}
						</pre>
					</div>
				</div>

				<div class="mt-5 flex items-center justify-end border-t border-themed pt-4">
					<button
						type="button"
						onclick={() => (selectedError = null)}
						class="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
					>
						Close Inspector
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
