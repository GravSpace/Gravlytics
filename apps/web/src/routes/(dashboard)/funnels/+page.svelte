<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Filter, ArrowDown, Users, CheckCircle2, TrendingDown, Plus, Trash2, Edit3, X, RefreshCw, Sparkles } from '@lucide/svelte';
	import { fetchFunnel, fetchBreakdown, type FunnelStep } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';

	interface StepDef {
		name: string;
		path: string;
	}

	let customSteps = $state<StepDef[]>([
		{ name: 'Homepage Visit', path: '/' },
		{ name: 'Article Views', path: '/metropolitan/*' }
	]);

	let funnelSteps = $state<FunnelStep[]>([]);
	let isLoading = $state(true);
	let showCustomizeModal = $state(false);

	// Temp editing steps in modal
	let editSteps = $state<StepDef[]>([]);
	let detectedPaths = $state<string[]>([]);

	const initialVisitors = $derived(funnelSteps.length > 0 ? funnelSteps[0].visitors : 0);
	const overallRate = $derived(
		funnelSteps.length > 0 ? funnelSteps[funnelSteps.length - 1].conversionFromStart : 0
	);

	function loadSavedStepDefs() {
		if (typeof window === 'undefined') return;
		try {
			const saved = localStorage.getItem(`gravlytics_funnel_${siteStore.activeSiteId}`);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length >= 2) {
					customSteps = parsed;
					return;
				}
			}
		} catch {}

		// Default fallback
		customSteps = [
			{ name: 'Homepage Visit', path: '/' },
			{ name: 'News & Articles', path: '/metropolitan/*' }
		];
	}

	function saveStepDefs(steps: StepDef[]) {
		customSteps = steps;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(`gravlytics_funnel_${siteStore.activeSiteId}`, JSON.stringify(steps));
			} catch {}
		}
	}

	async function loadSuggestedPaths() {
		try {
			const paths = await fetchBreakdown(siteStore.activeSiteId, 'url_path', undefined, undefined, 10);
			detectedPaths = paths.map((p) => p.label).filter((p) => p && !p.includes('(unknown)'));

			// If user hasn't saved custom funnel steps, auto-derive from real detected paths
			const saved = typeof window !== 'undefined' ? localStorage.getItem(`gravlytics_funnel_${siteStore.activeSiteId}`) : null;
			if (!saved && detectedPaths.length > 0) {
				const p1 = detectedPaths.includes('/') ? '/' : detectedPaths[0];
				const otherPaths = detectedPaths.filter((p) => p !== p1);
				const p2 = otherPaths.length > 0 ? otherPaths[0] : (p1 === '/' ? '/*' : '/');
				customSteps = [
					{ name: p1 === '/' ? 'Homepage Visit' : `Enter: ${p1}`, path: p1 },
					{ name: `Read / Engage: ${p2}`, path: p2 }
				];
				loadFunnel();
			}
		} catch {}
	}

	async function loadFunnel() {
		try {
			const steps = await fetchFunnel(siteStore.activeSiteId, customSteps);
			if (Array.isArray(steps) && steps.length > 0) {
				funnelSteps = steps;
			}
		} catch (err) {
			console.error('Failed to load funnel data', err);
		} finally {
			isLoading = false;
		}
	}

	function openCustomizeModal() {
		editSteps = JSON.parse(JSON.stringify(customSteps));
		showCustomizeModal = true;
	}

	function addStepToEdit() {
		editSteps.push({
			name: `Stage ${editSteps.length + 1}`,
			path: '/'
		});
	}

	function removeStepFromEdit(index: number) {
		if (editSteps.length <= 2) return; // Keep at least 2 steps for a funnel
		editSteps.splice(index, 1);
	}

	function handleSaveFunnel() {
		if (editSteps.length < 2) return;
		saveStepDefs(editSteps);
		showCustomizeModal = false;
		loadFunnel();
	}

	let lastSiteId = '';
	// Reactively reload only when site changes
	$effect(() => {
		const current = siteStore.activeSiteId;
		if (current && current !== lastSiteId) {
			lastSiteId = current;
			untrack(() => {
				loadSavedStepDefs();
				loadFunnel();
				loadSuggestedPaths();
			});
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadFunnel();
		}, 15000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Funnel Analysis — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Funnel Analysis</h1>
			<p class="text-xs text-label">
				Inspect multi-stage user journeys and drop-offs for
				<span class="font-mono text-indigo-400 font-semibold">{siteStore.activeSiteId}</span>
			</p>
		</div>
		<button
			onclick={openCustomizeModal}
			class="btn-ghost flex items-center gap-1.5 self-start sm:self-auto rounded-md px-3 py-1.5 text-xs font-semibold active:scale-[0.98]"
		>
			<Edit3 size={13} />
			<span>Customize Funnel Stages</span>
		</button>
	</div>

	<!-- Funnel Summary Card -->
	<div class="flex flex-col gap-4 card-inset p-5">
		<div class="flex items-center justify-between border-b border-themed pb-3">
			<div class="flex items-center gap-2.5">
				<div class="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					<Filter size={14} strokeWidth={2} />
				</div>
				<div>
					<h2 class="text-xs font-semibold uppercase tracking-wider text-body">User Conversion Journey</h2>
					<p class="font-mono text-[11px] text-hint">{initialVisitors.toLocaleString()} unique visitors entered funnel</p>
				</div>
			</div>
			<div class="text-right">
				<span class="font-mono text-xl font-bold text-emerald-400">{overallRate}%</span>
				<p class="text-[10px] text-hint">Overall Conversion</p>
			</div>
		</div>

		{#if isLoading}
			<div class="flex items-center justify-center p-8 text-slate-400 text-xs font-mono">
				<RefreshCw size={16} class="animate-spin mr-2 text-indigo-400" />
				<span>Computing funnel conversion telemetry...</span>
			</div>
		{:else}
			<!-- Step Progression -->
			<div class="flex flex-col gap-3">
				{#each funnelSteps as step, i}
					<div class="flex flex-col gap-1">
						<div class="flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<span class="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-mono font-bold text-indigo-300 border border-indigo-500/30">
									{step.step}
								</span>
								<span class="font-semibold text-body">{step.name}</span>
								<span class="font-mono text-[11px] text-hint">({step.path})</span>
							</div>
							<div class="flex items-center gap-3 font-mono text-xs">
								<span class="font-bold text-heading">{step.visitors.toLocaleString()} users</span>
								<span class="font-semibold text-indigo-400">{step.conversionFromStart}%</span>
							</div>
						</div>

						<!-- Visual bar -->
						<div class="relative h-6 w-full rounded-md bg-input overflow-hidden flex items-center px-2.5">
							<div
								class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-75 transition-all duration-300 rounded-md"
								style="width: {Math.max(step.conversionFromStart, 2)}%"
							></div>
							<span class="relative z-10 font-mono text-[10px] font-semibold text-white drop-shadow">
								{step.visitors.toLocaleString()} ({step.conversionFromStart}%)
							</span>
						</div>

						<!-- Dropoff indicator -->
						{#if i < funnelSteps.length - 1}
							<div class="flex items-center justify-end gap-1.5 pr-1 py-0.5 text-[10px] font-mono text-rose-400">
								<TrendingDown size={11} strokeWidth={2} />
								<span>{funnelSteps[i + 1].dropoffRate}% dropped off</span>
								<span class="text-hint">
									({Math.max(step.visitors - funnelSteps[i + 1].visitors, 0).toLocaleString()} visitors lost)
								</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Step Details Table -->
	<div class="card-inset p-4 overflow-x-auto">
		<h3 class="text-xs font-semibold uppercase tracking-wider text-heading mb-3">Conversion Matrix</h3>
		<table class="w-full text-left text-xs border-collapse">
			<thead>
				<tr class="border-b border-themed text-[11px] font-mono text-label">
					<th class="pb-2.5 font-medium">Stage</th>
					<th class="pb-2.5 font-medium">Criteria Pattern</th>
					<th class="pb-2.5 font-medium text-right">Unique Visitors</th>
					<th class="pb-2.5 font-medium text-right">Step Conv.</th>
					<th class="pb-2.5 font-medium text-right">Overall Conv.</th>
					<th class="pb-2.5 font-medium text-right">Drop-off</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-themed">
				{#each funnelSteps as step}
					<tr class="hover:bg-card-hover transition-colors">
						<td class="py-2.5 font-medium text-heading">{step.name}</td>
						<td class="py-2.5 font-mono text-[11px] text-label">{step.path}</td>
						<td class="py-2.5 text-right font-mono font-bold text-heading">{step.visitors.toLocaleString()}</td>
						<td class="py-2.5 text-right font-mono font-semibold text-indigo-400">{step.conversionFromPrev}%</td>
						<td class="py-2.5 text-right font-mono font-bold text-emerald-400">{step.conversionFromStart}%</td>
						<td class="py-2.5 text-right font-mono text-rose-400">{step.dropoffRate > 0 ? `-${step.dropoffRate}%` : '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Customize Funnel Modal -->
	{#if showCustomizeModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-lg card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Filter size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Customize Funnel Steps</h2>
					</div>
					<button onclick={() => (showCustomizeModal = false)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<p class="text-xs text-label">
					Configure sequential conversion stages. Use URL path (e.g. <code class="text-indigo-300">/</code> or <code class="text-indigo-300">/metropolitan/*</code>) or custom events (e.g. <code class="text-cyan-300">event: signup</code>).
				</p>

				<!-- Steps List -->
				<div class="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
					{#each editSteps as step, idx}
						<div class="flex items-center gap-2 rounded-lg border border-themed bg-card-solid p-2.5">
							<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-mono font-bold text-indigo-300">
								{idx + 1}
							</span>
							<input
								type="text"
								bind:value={step.name}
								placeholder="Stage Name"
								class="w-1/3 rounded border border-themed bg-input px-2 py-1 text-xs text-heading focus:border-indigo-500 outline-none"
							/>
							<input
								type="text"
								bind:value={step.path}
								placeholder="Path or event: name"
								class="flex-1 font-mono rounded border border-themed bg-input px-2 py-1 text-xs text-heading focus:border-indigo-500 outline-none"
							/>
							<button
								type="button"
								disabled={editSteps.length <= 2}
								onclick={() => removeStepFromEdit(idx)}
								class="flex h-7 w-7 items-center justify-center text-slate-500 hover:text-rose-400 disabled:opacity-30"
								title="Remove Stage"
							>
								<Trash2 size={13} />
							</button>
						</div>
					{/each}
				</div>

				<div class="flex items-center justify-between pt-1">
					<button
						type="button"
						onclick={addStepToEdit}
						class="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
					>
						<Plus size={13} />
						<span>Add Stage</span>
					</button>
				</div>

				{#if detectedPaths.length > 0}
					<div class="flex flex-col gap-1.5 pt-1 border-t border-themed/50">
						<span class="text-[10px] uppercase font-semibold tracking-wider text-label font-mono">Suggested Real Site Paths:</span>
						<div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
							{#each detectedPaths as dp}
								<button
									type="button"
									onclick={() => editSteps.push({ name: dp === '/' ? 'Homepage' : dp, path: dp })}
									class="px-2 py-0.5 rounded bg-card border border-themed text-[11px] font-mono text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-500/40 transition-colors"
								>
									+ {dp}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div class="mt-2 flex justify-end gap-2 border-t border-themed pt-3">
					<button
						type="button"
						onclick={() => (showCustomizeModal = false)}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-heading"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleSaveFunnel}
						class="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
					>
						Save & Apply Funnel
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
