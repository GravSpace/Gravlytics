<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Target, Plus, Trash2, CheckCircle2, X, Code2, Globe, Sparkles, AlertCircle, RefreshCw } from '@lucide/svelte';
	import { getSavedGoals, saveGoal, deleteGoal, fetchGoals, fetchBreakdown, type GoalItem } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';

	let goals = $state<GoalItem[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);

	let showAddModal = $state(false);
	let newGoalName = $state('');
	let newGoalType = $state<'event' | 'pageview'>('pageview');
	let newGoalTrigger = $state('');

	// Detected real paths and events for suggestions
	let detectedPaths = $state<string[]>([]);
	let detectedEvents = $state<string[]>([]);

	const totalConversions = $derived(goals.reduce((acc, g) => acc + g.conversions, 0));
	const avgConversionRate = $derived(
		goals.length > 0 ? (goals.reduce((acc, g) => acc + g.conversionRate, 0) / goals.length).toFixed(1) : '0.0'
	);
	const topGoal = $derived(
		goals.length > 0 && totalConversions > 0
			? [...goals].sort((a, b) => b.conversions - a.conversions)[0]
			: null
	);

	async function loadSuggestedTriggers() {
		try {
			const paths = await fetchBreakdown(siteStore.activeSiteId, 'url_path', undefined, undefined, 10);
			detectedPaths = paths.map((p) => p.label).filter((p) => p && !p.includes('(unknown)'));
			
			const events = await fetchBreakdown(siteStore.activeSiteId, 'event_name', undefined, undefined, 10);
			detectedEvents = events.map((e) => e.label).filter((e) => e && !e.includes('(unknown)'));
		} catch (err) {
			console.error('Failed to load suggested triggers', err);
		}
	}

	async function loadGoals() {
		try {
			const saved = await getSavedGoals(siteStore.activeSiteId);
			if (saved.length > 0) {
				const metrics = await fetchGoals(siteStore.activeSiteId, saved);
				if (Array.isArray(metrics) && metrics.length > 0) {
					goals = metrics;
				} else {
					goals = saved;
				}
			} else {
				goals = [];
			}
		} catch (err) {
			console.error('Failed to load goals', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleAddGoal() {
		if (!newGoalName || !newGoalTrigger || isSaving) return;
		isSaving = true;
		try {
			const created = await saveGoal(siteStore.activeSiteId, {
				name: newGoalName,
				type: newGoalType,
				trigger: newGoalTrigger
			});
			if (created) {
				newGoalName = '';
				newGoalTrigger = '';
				showAddModal = false;
				await loadGoals();
			}
		} finally {
			isSaving = false;
		}
	}

	async function handleDeleteGoal(id: string) {
		await deleteGoal(id);
		goals = goals.filter((g) => g.id !== id);
		await loadGoals();
	}

	async function addStarterGoal(name: string, type: 'pageview' | 'event', trigger: string) {
		await saveGoal(siteStore.activeSiteId, { name, type, trigger });
		await loadGoals();
	}

	let lastSiteId = '';
	// Reactively re-load when active site changes
	$effect(() => {
		const current = siteStore.activeSiteId;
		if (current && current !== lastSiteId) {
			lastSiteId = current;
			untrack(() => {
				loadGoals();
				loadSuggestedTriggers();
			});
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadGoals();
		}, 15000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Goals & Conversions — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Goals & Conversions</h1>
			<p class="text-xs text-label">
				Define conversion milestones, custom trigger events, and inspect real-time conversions for
				<span class="font-mono text-indigo-400 font-semibold">{siteStore.activeSiteId}</span>
			</p>
		</div>
		<button
			onclick={() => (showAddModal = true)}
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-[0.98]"
		>
			<Plus size={14} strokeWidth={2} />
			<span>Define New Goal</span>
		</button>
	</div>

	<!-- Goals Overview Cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<div class="flex flex-col card-inset p-3.5">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">Active Goals</span>
			<span class="font-mono text-2xl font-bold text-heading mt-1">{goals.length}</span>
			<span class="text-[10px] text-indigo-400 mt-0.5">Configured Goals</span>
		</div>
		<div class="flex flex-col card-inset p-3.5">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">Total Conversions</span>
			<span class="font-mono text-2xl font-bold text-emerald-400 mt-1">{totalConversions.toLocaleString()}</span>
			<span class="text-[10px] text-slate-500 mt-0.5">Tracked event triggers</span>
		</div>
		<div class="flex flex-col card-inset p-3.5">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">Avg. Conversion Rate</span>
			<span class="font-mono text-2xl font-bold text-heading mt-1">{avgConversionRate}%</span>
			<span class="text-[10px] font-mono text-slate-500 mt-0.5">Relative to unique visitors</span>
		</div>
		<div class="flex flex-col card-inset p-3.5">
			<span class="text-[11px] font-semibold uppercase tracking-wider text-label">Top Performing</span>
			<span class="truncate text-base font-bold text-heading mt-1">{topGoal ? topGoal.name : '—'}</span>
			<span class="text-[10px] font-mono text-slate-500 mt-0.5">
				{topGoal ? `${topGoal.conversions.toLocaleString()} conversions (${topGoal.conversionRate}%)` : 'No events yet'}
			</span>
		</div>
	</div>

	<!-- Goals List or Zero State -->
	{#if isLoading}
		<div class="flex items-center justify-center p-12 text-slate-400 text-xs font-mono">
			<RefreshCw size={16} class="animate-spin mr-2 text-indigo-400" />
			<span>Loading goals telemetry...</span>
		</div>
	{:else if goals.length === 0}
		<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-themed-strong bg-input p-8 text-center">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
				<Target size={24} />
			</div>
			<h3 class="text-sm font-semibold text-heading">No Conversion Goals Configured Yet</h3>
			<p class="max-w-md text-xs text-slate-400 mt-1 mb-5">
				Define goals to track when visitors complete critical actions like reading articles, submitting forms, or reaching specific URLs.
			</p>

			<div class="flex flex-wrap items-center justify-center gap-2 mb-4">
				<span class="text-[11px] text-label">Quick Templates:</span>
				<button
					onclick={() => addStarterGoal('Read Articles', 'pageview', '/metropolitan/*')}
					class="rounded border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-mono text-indigo-300 hover:bg-indigo-500/20 transition-colors"
				>
					+ Article Views (/metropolitan/*)
				</button>
				<button
					onclick={() => addStarterGoal('Homepage Visit', 'pageview', '/')}
					class="rounded border border-themed bg-input px-2.5 py-1 text-xs font-mono text-slate-300 hover:bg-card-hover transition-colors"
				>
					+ Homepage Visit (/)
				</button>
				<button
					onclick={() => addStarterGoal('User Signup', 'event', 'signup')}
					class="rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:bg-cyan-500/20 transition-colors"
				>
					+ Event: signup
				</button>
			</div>

			<button
				onclick={() => (showAddModal = true)}
				class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
			>
				<Plus size={14} />
				<span>Define Custom Goal</span>
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each goals as goal}
				<div class="flex items-center justify-between card p-3.5 px-4 transition-colors hover:border-indigo-500/30">
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
							<Target size={16} strokeWidth={2} />
						</div>
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-xs font-semibold text-heading">{goal.name}</h3>
								<span
									class="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase font-semibold {goal.type === 'event'
										? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
										: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'}"
								>
									{goal.type}
								</span>
							</div>
							<p class="font-mono text-[11px] text-slate-400 mt-0.5">
								Trigger: <span class="text-body">{goal.trigger}</span>
							</p>
						</div>
					</div>

					<div class="flex items-center gap-6">
						<div class="text-right">
							<span class="font-mono text-sm font-bold text-heading">{goal.conversions.toLocaleString()}</span>
							<p class="text-[10px] text-hint">Conversions</p>
						</div>

						<div class="text-right w-16">
							<span class="font-mono text-sm font-bold text-emerald-400">{goal.conversionRate}%</span>
							<p class="text-[10px] text-hint">Rate</p>
						</div>

						<button
							onclick={() => handleDeleteGoal(goal.id)}
							class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/10 hover:text-rose-400 transition-colors"
							title="Delete Goal"
							aria-label="Delete Goal"
						>
							<Trash2 size={13} strokeWidth={1.75} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Add Goal Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-md card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Target size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Define Target Milestone</h2>
					</div>
					<button onclick={() => (showAddModal = false)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="goal-name" class="mb-1 block text-[11px] font-medium text-body">Goal Name</label>
						<input
							id="goal-name"
							type="text"
							bind:value={newGoalName}
							placeholder="e.g. Read News Articles"
							class="w-full rounded-md input-field px-3 py-1.5 text-xs"
						/>
					</div>

					<div>
						<label for="goal-type" class="mb-1 block text-[11px] font-medium text-body">Trigger Type</label>
						<select
							id="goal-type"
							bind:value={newGoalType}
							class="w-full rounded-md input-solid px-3 py-1.5 text-xs focus:border-indigo-500"
						>
							<option value="pageview">Page View (URL Path Match)</option>
							<option value="event">Custom Event (via gravlytics.track)</option>
						</select>
					</div>

					<div>
						<label for="goal-trigger" class="mb-1 block text-[11px] font-medium text-body">
							{newGoalType === 'event' ? 'Event Name' : 'URL Path Pattern'}
						</label>
						<input
							id="goal-trigger"
							type="text"
							bind:value={newGoalTrigger}
							placeholder={newGoalType === 'event' ? 'signup' : '/metropolitan/*'}
							class="w-full rounded-md input-field px-3 py-1.5 text-xs"
						/>
					</div>

					<!-- Real trigger suggestions detected from traffic history -->
					{#if newGoalType === 'pageview' && detectedPaths.length > 0}
						<div class="flex flex-col gap-1.5 pt-1">
							<span class="text-[10px] font-mono text-label">Detected Paths in Traffic:</span>
							<div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
								{#each detectedPaths as path}
									<button
										type="button"
										onclick={() => {
											newGoalTrigger = path.length > 25 ? path.split('/')[1] ? `/${path.split('/')[1]}/*` : path : path;
											if (!newGoalName) newGoalName = `View ${newGoalTrigger}`;
										}}
										class="rounded border border-themed bg-input px-2 py-0.5 text-[10px] font-mono text-body hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-heading transition-colors"
									>
										{path.length > 30 ? path.substring(0, 30) + '...' : path}
									</button>
								{/each}
							</div>
						</div>
					{:else if newGoalType === 'event' && detectedEvents.length > 0}
						<div class="flex flex-col gap-1.5 pt-1">
							<span class="text-[10px] font-mono text-label">Detected Events in Traffic:</span>
							<div class="flex flex-wrap gap-1.5">
								{#each detectedEvents as ev}
									<button
										type="button"
										onclick={() => {
											newGoalTrigger = ev;
											if (!newGoalName) newGoalName = `Event: ${ev}`;
										}}
										class="rounded border border-themed bg-input px-2 py-0.5 text-[10px] font-mono text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-colors"
									>
										{ev}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="mt-2 flex justify-end gap-2 border-t border-themed pt-3">
					<button
						type="button"
						onclick={() => (showAddModal = false)}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-heading"
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={!newGoalName || !newGoalTrigger || isSaving}
						onclick={handleAddGoal}
						class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
					>
						{#if isSaving}
							<RefreshCw size={12} class="animate-spin" />
						{/if}
						<span>Save Goal</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
