<script lang="ts">
	let funnelSteps = $state([
		{
			step: 1,
			name: 'Homepage Visit',
			path: '/',
			visitors: 24500,
			conversionFromStart: 100,
			conversionFromPrev: 100,
			dropoffRate: 0
		},
		{
			step: 2,
			name: 'Pricing Viewed',
			path: '/pricing',
			visitors: 11200,
			conversionFromStart: 45.7,
			conversionFromPrev: 45.7,
			dropoffRate: 54.3
		},
		{
			step: 3,
			name: 'Sign-up Form',
			path: '/register',
			visitors: 4800,
			conversionFromStart: 19.6,
			conversionFromPrev: 42.9,
			dropoffRate: 57.1
		},
		{
			step: 4,
			name: 'Onboarding Done',
			path: 'event: onboarding_complete',
			visitors: 3120,
			conversionFromStart: 12.7,
			conversionFromPrev: 65.0,
			dropoffRate: 35.0
		}
	]);
</script>

<svelte:head>
	<title>Funnel Analysis — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight text-white">Funnel Analysis</h1>
			<p class="text-sm text-muted-light">Visualize multi-step visitor journeys and pinpoint exact drop-off points</p>
		</div>
		<button
			class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98]"
		>
			+ Create New Funnel
		</button>
	</div>

	<!-- Funnel Summary Card -->
	<div class="glass-card p-6 flex flex-col gap-6">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-base font-semibold text-white">Onboarding Conversion Funnel</h2>
				<p class="text-xs text-muted-light">Last 30 days • 24,500 initial visitors entered funnel</p>
			</div>
			<div class="text-right">
				<span class="text-2xl font-black text-emerald-400">12.7%</span>
				<p class="text-[11px] text-muted-light">Overall Completion Rate</p>
			</div>
		</div>

		<!-- Step-by-Step Funnel Visualization -->
		<div class="flex flex-col gap-3">
			{#each funnelSteps as step, i}
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between text-xs">
						<div class="flex items-center gap-2">
							<span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
								{step.step}
							</span>
							<span class="font-medium text-white">{step.name}</span>
							<span class="font-mono text-[11px] text-muted">{step.path}</span>
						</div>
						<div class="flex items-center gap-4">
							<span class="font-semibold text-white">{step.visitors.toLocaleString()} visitors</span>
							<span class="font-bold text-accent">{step.conversionFromStart}%</span>
						</div>
					</div>

					<!-- Visual bar -->
					<div class="relative h-9 w-full rounded-lg bg-ink-lighter overflow-hidden flex items-center px-3">
						<div
							class="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary to-accent opacity-85 transition-all duration-500 rounded-lg"
							style="width: {step.conversionFromStart}%"
						></div>
						<span class="relative z-10 text-[11px] font-medium text-white drop-shadow">
							{step.visitors.toLocaleString()} users ({step.conversionFromStart}%)
						</span>
					</div>

					<!-- Drop-off indicator (between steps) -->
					{#if i < funnelSteps.length - 1}
						<div class="flex items-center justify-end gap-2 pr-2 py-0.5 text-[11px] text-red-400">
							<span>↓ {funnelSteps[i + 1].dropoffRate}% dropped off</span>
							<span class="text-muted">({(step.visitors - funnelSteps[i + 1].visitors).toLocaleString()} lost)</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Funnel Breakdown Table -->
	<div class="glass-card p-6">
		<h3 class="text-sm font-semibold text-white mb-4">Step-by-Step Conversion Metrics</h3>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-ink-border text-muted">
						<th class="pb-3 font-medium">Step</th>
						<th class="pb-3 font-medium">Event / Target</th>
						<th class="pb-3 font-medium text-right">Visitors</th>
						<th class="pb-3 font-medium text-right">Step Conversion</th>
						<th class="pb-3 font-medium text-right">Total Conversion</th>
						<th class="pb-3 font-medium text-right">Drop-off</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-ink-border">
					{#each funnelSteps as step}
						<tr class="hover:bg-ink-lighter/50">
							<td class="py-3 font-medium text-white">{step.name}</td>
							<td class="py-3 font-mono text-muted-light">{step.path}</td>
							<td class="py-3 text-right font-medium text-white">{step.visitors.toLocaleString()}</td>
							<td class="py-3 text-right font-bold text-accent">{step.conversionFromPrev}%</td>
							<td class="py-3 text-right font-bold text-emerald-400">{step.conversionFromStart}%</td>
							<td class="py-3 text-right text-red-400">{step.dropoffRate > 0 ? `-${step.dropoffRate}%` : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
