<script lang="ts">
	let goals = $state([
		{
			id: 'goal-1',
			name: 'Newsletter Subscription',
			type: 'event',
			trigger: 'signup',
			conversions: 1420,
			conversionRate: 8.6,
			trend: 14.2
		},
		{
			id: 'goal-2',
			name: 'Pricing Page Visit',
			type: 'pageview',
			trigger: '/pricing',
			conversions: 4910,
			conversionRate: 29.8,
			trend: 5.4
		},
		{
			id: 'goal-3',
			name: 'Documentation Reader',
			type: 'pageview',
			trigger: '/docs/*',
			conversions: 7120,
			conversionRate: 43.1,
			trend: -2.1
		},
		{
			id: 'goal-4',
			name: 'SDK Download',
			type: 'event',
			trigger: 'download_sdk',
			conversions: 620,
			conversionRate: 3.8,
			trend: 22.5
		}
	]);

	let showAddModal = $state(false);
	let newGoalName = $state('');
	let newGoalType = $state('event');
	let newGoalTrigger = $state('');

	function handleAddGoal() {
		if (!newGoalName || !newGoalTrigger) return;
		goals.push({
			id: 'goal_' + Math.random().toString(36).substring(2, 8),
			name: newGoalName,
			type: newGoalType,
			trigger: newGoalTrigger,
			conversions: 0,
			conversionRate: 0,
			trend: 0
		});
		newGoalName = '';
		newGoalTrigger = '';
		showAddModal = false;
	}

	function handleDeleteGoal(id: string) {
		goals = goals.filter((g) => g.id !== id);
	}
</script>

<svelte:head>
	<title>Goals & Conversions — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight text-white">Goals & Conversions</h1>
			<p class="text-sm text-muted-light">Define target events or key landing pages to measure conversion rates</p>
		</div>
		<button
			onclick={() => (showAddModal = true)}
			class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98]"
		>
			+ Define New Goal
		</button>
	</div>

	<!-- Goals Overview Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="kpi-card p-4">
			<span class="text-xs text-muted-light">Active Goals</span>
			<span class="text-2xl font-bold text-white mt-1">{goals.length}</span>
			<span class="text-[11px] text-accent mt-0.5">Tracking live</span>
		</div>
		<div class="kpi-card p-4">
			<span class="text-xs text-muted-light">Total Conversions</span>
			<span class="text-2xl font-bold text-white mt-1">14,070</span>
			<span class="text-[11px] text-emerald-400 mt-0.5">↑ 12.3% this month</span>
		</div>
		<div class="kpi-card p-4">
			<span class="text-xs text-muted-light">Avg. Conversion Rate</span>
			<span class="text-2xl font-bold text-white mt-1">21.3%</span>
			<span class="text-[11px] text-emerald-400 mt-0.5">↑ 3.2% vs last period</span>
		</div>
		<div class="kpi-card p-4">
			<span class="text-xs text-muted-light">Top Goal</span>
			<span class="text-2xl font-bold text-white mt-1">Pricing</span>
			<span class="text-[11px] text-muted mt-0.5">4,910 completions</span>
		</div>
	</div>

	<!-- Goals List -->
	<div class="flex flex-col gap-3">
		{#each goals as goal}
			<div class="glass-card flex items-center justify-between p-5">
				<div class="flex items-center gap-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-lg">
						🎯
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-semibold text-white">{goal.name}</h3>
							<span
								class="rounded px-2 py-0.5 text-[10px] font-mono uppercase {goal.type === 'event'
									? 'bg-primary/20 text-primary-light'
									: 'bg-cyan-500/20 text-cyan-400'}"
							>
								{goal.type}
							</span>
						</div>
						<p class="text-xs font-mono text-muted-light mt-0.5">Trigger: {goal.trigger}</p>
					</div>
				</div>

				<div class="flex items-center gap-6">
					<div class="text-right">
						<span class="text-sm font-semibold text-white">{goal.conversions.toLocaleString()}</span>
						<p class="text-[11px] text-muted-light">Conversions</p>
					</div>

					<div class="text-right w-20">
						<span class="text-sm font-bold text-accent">{goal.conversionRate}%</span>
						<p
							class="text-[11px]"
							class:text-emerald-400={goal.trend > 0}
							class:text-red-400={goal.trend < 0}
							class:text-muted={goal.trend === 0}
						>
							{goal.trend > 0 ? '↑' : goal.trend < 0 ? '↓' : ''} {Math.abs(goal.trend)}%
						</p>
					</div>

					<button
						onclick={() => handleDeleteGoal(goal.id)}
						class="rounded-lg p-2 text-muted hover:text-red-400 hover:bg-red-500/10"
						title="Delete Goal"
					>
						🗑️
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Add Goal Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="glass-card w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-semibold text-white">Define Goal</h2>
					<button onclick={() => (showAddModal = false)} class="text-muted hover:text-white">✕</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="goal-name" class="mb-1.5 block text-xs font-medium text-muted-light">Goal Name</label>
						<input
							id="goal-name"
							type="text"
							bind:value={newGoalName}
							placeholder="e.g. Free Trial Signup"
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						/>
					</div>

					<div>
						<label for="goal-type" class="mb-1.5 block text-xs font-medium text-muted-light">Goal Trigger Type</label>
						<select
							id="goal-type"
							bind:value={newGoalType}
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						>
							<option value="event">Custom Event (via gravlytics.track)</option>
							<option value="pageview">Page Visit (URL Path match)</option>
						</select>
					</div>

					<div>
						<label for="goal-trigger" class="mb-1.5 block text-xs font-medium text-muted-light">
							{newGoalType === 'event' ? 'Event Name (e.g. signup)' : 'URL Path (e.g. /thank-you)'}
						</label>
						<input
							id="goal-trigger"
							type="text"
							bind:value={newGoalTrigger}
							placeholder={newGoalType === 'event' ? 'signup' : '/thank-you'}
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						/>
					</div>
				</div>

				<div class="mt-2 flex justify-end gap-2">
					<button
						onclick={() => (showAddModal = false)}
						class="rounded-lg px-4 py-2 text-xs font-medium text-muted-light hover:bg-ink-lighter"
					>
						Cancel
					</button>
					<button
						onclick={handleAddGoal}
						class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90"
					>
						Save Goal
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
