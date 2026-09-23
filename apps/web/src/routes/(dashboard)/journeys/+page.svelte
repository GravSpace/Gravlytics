<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Route,
		ArrowRight,
		Filter,
		Calendar,
		Clock,
		ExternalLink,
		Users,
		TrendingDown,
		Sparkles,
		Layers,
		CheckCircle2,
		RefreshCw,
		HelpCircle
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import {
		fetchBreakdown,
		fetchOverview,
		fetchUserFlow,
		type BreakdownItem,
		type UserFlowResult
	} from '$lib/api';

	let isLoading = $state(true);

	interface JourneyNode {
		path: string;
		sessions: number;
		dropOffRate: number;
		continuedSessions: number;
		nextSteps: { targetPath: string; count: number; percentage: number }[];
	}

	let step1Nodes = $state<JourneyNode[]>([]);
	let step2Nodes = $state<JourneyNode[]>([]);
	let step3Nodes = $state<JourneyNode[]>([]);
	let selectedPath = $state<string | null>(null);
	let flowData = $state<UserFlowResult | null>(null);

	async function loadJourneyData() {
		const siteId = siteStore.activeSiteId;
		if (!siteId) return;
		isLoading = true;
		try {
			// Fetch real data from ClickHouse
			const [entryPages, topPages, flowResult, overview] = await Promise.all([
				fetchBreakdown(siteId, 'entry_path', dateStore.from, dateStore.to, 8),
				fetchBreakdown(siteId, 'url_path', dateStore.from, dateStore.to, 12),
				fetchUserFlow(siteId, dateStore.from, dateStore.to),
				fetchOverview(siteId, dateStore.from, dateStore.to)
			]);

			flowData = flowResult;
			const transitions = flowResult.transitions || [];
			const avgBounce = Math.round(overview.bounceRate) || 40;

			// Step 1: Entry pages
			const primaryEntries = entryPages.length > 0 ? entryPages : topPages.slice(0, 4);

			step1Nodes = primaryEntries.slice(0, 4).map((entry) => {
				const path = entry.label;
				const totalViews = entry.value;

				// Find outbound transitions from this path
				const outbounds = transitions.filter((t) => t.from_path === path);
				const continued = outbounds.reduce((acc, t) => acc + t.transitions, 0);
				const dropOff = totalViews > 0 ? Math.max(0, Math.min(100, Math.round(((totalViews - continued) / totalViews) * 100))) : avgBounce;

				const nextSteps = outbounds.slice(0, 4).map((t) => ({
					targetPath: t.to_path,
					count: t.transitions,
					percentage: continued > 0 ? Math.round((t.transitions / continued) * 100) : 0
				}));

				return {
					path,
					sessions: totalViews,
					dropOffRate: dropOff,
					continuedSessions: continued,
					nextSteps
				};
			});

			// Step 2: Intermediate Pages
			const step2Paths = new Set<string>();
			for (const s1 of step1Nodes) {
				for (const ns of s1.nextSteps) {
					step2Paths.add(ns.targetPath);
				}
			}

			step2Nodes = Array.from(step2Paths).slice(0, 4).map((path) => {
				const inboundCount = step1Nodes.reduce((acc, s1) => {
					const found = s1.nextSteps.find((ns) => ns.targetPath === path);
					return acc + (found ? found.count : 0);
				}, 0);

				const outbounds = transitions.filter((t) => t.from_path === path);
				const continued = outbounds.reduce((acc, t) => acc + t.transitions, 0);
				const dropOff = inboundCount > 0 ? Math.max(0, Math.min(100, Math.round(((inboundCount - continued) / inboundCount) * 100))) : 25;

				const nextSteps = outbounds.slice(0, 3).map((t) => ({
					targetPath: t.to_path,
					count: t.transitions,
					percentage: continued > 0 ? Math.round((t.transitions / continued) * 100) : 0
				}));

				return {
					path,
					sessions: inboundCount || 1,
					dropOffRate: dropOff,
					continuedSessions: continued,
					nextSteps
				};
			});

			// Step 3: Terminal / Downstream Pages
			const step3Paths = new Set<string>();
			for (const s2 of step2Nodes) {
				for (const ns of s2.nextSteps) {
					step3Paths.add(ns.targetPath);
				}
			}

			step3Nodes = Array.from(step3Paths).slice(0, 3).map((path) => {
				const inboundCount = step2Nodes.reduce((acc, s2) => {
					const found = s2.nextSteps.find((ns) => ns.targetPath === path);
					return acc + (found ? found.count : 0);
				}, 0);

				return {
					path,
					sessions: inboundCount || 1,
					dropOffRate: 20,
					continuedSessions: Math.round(inboundCount * 0.8),
					nextSteps: []
				};
			});
		} catch (err) {
			console.error('Failed to load user flow data', err);
			step1Nodes = [];
			step2Nodes = [];
			step3Nodes = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const s = siteStore.activeSiteId;
		const v = dateStore.version;
		if (s) {
			untrack(() => {
				loadJourneyData();
			});
		}
	});

	onMount(() => {
		loadJourneyData();
	});
</script>

<svelte:head>
	<title>User Flow & Navigation Journeys — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-7xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					<Route size={18} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">User Flow & Journey Paths</h1>
			</div>
			<p class="text-xs text-label mt-1">
				Real multi-step session navigation pathways reconstructed from ClickHouse session tracking.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={loadJourneyData}
				disabled={isLoading}
				class="btn-ghost flex items-center gap-1.5 rounded-lg border border-themed px-3 py-1.5 text-xs text-body hover:text-heading cursor-pointer shadow-sm"
			>
				<RefreshCw size={13} class={isLoading ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- Journey Flow Canvas Container -->
	<div class="card p-6 flex flex-col gap-6 relative overflow-hidden">
		<div class="flex items-center justify-between border-b border-themed pb-4">
			<div class="flex items-center gap-2 text-xs font-semibold text-heading">
				<Layers size={14} class="text-indigo-400" />
				<span>Session Navigation Flow Sequence</span>
			</div>
			<div class="flex items-center gap-4 text-[11px] font-mono text-hint">
				<span class="flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-full bg-indigo-500"></span>
					<span>Active Sessions</span>
				</span>
				<span class="flex items-center gap-1.5">
					<span class="h-2 w-2 rounded-full bg-rose-500"></span>
					<span>Drop-off / Exit</span>
				</span>
			</div>
		</div>

		{#if isLoading}
			<div class="flex h-64 items-center justify-center text-xs text-hint">
				Reconstructing user session transitions from ClickHouse...
			</div>
		{:else if step1Nodes.length === 0}
			<div class="flex flex-col items-center justify-center h-52 text-center p-6 border border-dashed border-themed rounded-xl">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-input text-hint mb-2">
					<Route size={18} />
				</div>
				<span class="text-sm font-semibold text-heading">No multi-step sessions recorded yet</span>
				<p class="text-xs text-hint mt-1 max-w-sm">
					Navigation pathways will populate automatically as users browse between pages on your tracked website.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
				<!-- Step 1: Initial Entry Points -->
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between pb-2 border-b border-themed">
						<span class="text-xs font-bold uppercase tracking-wider text-label flex items-center gap-1.5">
							<span class="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white font-mono">1</span>
							Entry Pages
						</span>
						<span class="text-[10px] text-hint font-mono">{step1Nodes.length} paths</span>
					</div>

					<div class="flex flex-col gap-3">
						{#each step1Nodes as node}
							{@const isSelected = selectedPath === node.path}
							<div
								class="card-inset p-3.5 rounded-xl border transition-all cursor-pointer {isSelected
									? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-1 ring-indigo-500/30'
									: 'hover:border-themed-strong'}"
								onclick={() => (selectedPath = isSelected ? null : node.path)}
								role="button"
								tabindex="0"
								onkeydown={(e) => e.key === 'Enter' && (selectedPath = isSelected ? null : node.path)}
							>
								<div class="flex items-center justify-between">
									<span class="font-mono text-xs font-bold text-heading truncate">{node.path}</span>
									<span class="font-mono text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
										{node.sessions.toLocaleString()}
									</span>
								</div>

								<!-- Drop-off and continuation metrics -->
								<div class="mt-3 flex items-center justify-between text-[10px] font-mono text-hint border-t border-themed/40 pt-2">
									<span class="flex items-center gap-1 text-emerald-400">
										<span>&rarr; {node.continuedSessions} continued</span>
									</span>
									<span class="text-rose-400 flex items-center gap-0.5">
										<TrendingDown size={11} />
										<span>{node.dropOffRate}% drop</span>
									</span>
								</div>

								<!-- Next branch destinations -->
								{#if node.nextSteps.length > 0}
									<div class="mt-2.5 flex flex-col gap-1 border-t border-themed/30 pt-2">
										{#each node.nextSteps as target}
											<div class="flex items-center justify-between text-[10px] font-mono">
												<span class="text-hint truncate max-w-[120px]">{target.targetPath}</span>
												<span class="text-label">{target.percentage}%</span>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Step 2: Second Hop Navigation -->
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between pb-2 border-b border-themed">
						<span class="text-xs font-bold uppercase tracking-wider text-label flex items-center gap-1.5">
							<span class="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white font-mono">2</span>
							Step 2 (Next Page)
						</span>
						<span class="text-[10px] text-hint font-mono">{step2Nodes.length} paths</span>
					</div>

					<div class="flex flex-col gap-3">
						{#if step2Nodes.length === 0}
							<div class="p-6 text-center text-xs text-hint card-inset rounded-xl">
								No subsequent page navigations in this date range.
							</div>
						{:else}
							{#each step2Nodes as node}
								<div class="card-inset p-3.5 rounded-xl border border-themed hover:border-themed-strong transition-all">
									<div class="flex items-center justify-between">
										<span class="font-mono text-xs font-bold text-heading truncate">{node.path}</span>
										<span class="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
											{node.sessions.toLocaleString()}
										</span>
									</div>

									<div class="mt-3 flex items-center justify-between text-[10px] font-mono text-hint border-t border-themed/40 pt-2">
										<span class="text-emerald-400">&rarr; {node.continuedSessions} continued</span>
										<span class="text-rose-400 flex items-center gap-0.5">
											<TrendingDown size={11} />
											<span>{node.dropOffRate}% drop</span>
										</span>
									</div>

									{#if node.nextSteps.length > 0}
										<div class="mt-2.5 flex flex-col gap-1 border-t border-themed/30 pt-2">
											{#each node.nextSteps as target}
												<div class="flex items-center justify-between text-[10px] font-mono">
													<span class="text-hint truncate max-w-[120px]">{target.targetPath}</span>
													<span class="text-label">{target.percentage}%</span>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					</div>
				</div>

				<!-- Step 3: Terminal / Conversion Paths -->
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between pb-2 border-b border-themed">
						<span class="text-xs font-bold uppercase tracking-wider text-label flex items-center gap-1.5">
							<span class="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white font-mono">3</span>
							Step 3 (Terminal Pages)
						</span>
						<span class="text-[10px] text-hint font-mono">{step3Nodes.length} paths</span>
					</div>

					<div class="flex flex-col gap-3">
						{#if step3Nodes.length === 0}
							<div class="p-6 text-center text-xs text-hint card-inset rounded-xl">
								No 3rd step navigations recorded in this window.
							</div>
						{:else}
							{#each step3Nodes as node}
								<div class="card-inset p-3.5 rounded-xl border border-themed hover:border-themed-strong transition-all">
									<div class="flex items-center justify-between">
										<span class="font-mono text-xs font-bold text-heading truncate">{node.path}</span>
										<span class="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
											{node.sessions.toLocaleString()}
										</span>
									</div>

									<div class="mt-3 flex items-center justify-between text-[10px] font-mono text-hint border-t border-themed/40 pt-2">
										<span class="text-emerald-400">Exit / Final Step</span>
										<span class="text-hint">{node.sessions} sessions</span>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
