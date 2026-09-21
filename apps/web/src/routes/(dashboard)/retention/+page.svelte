<script lang="ts">
	const cohorts = [
		{
			period: 'Mar 1 – Mar 7',
			size: 4210,
			intervals: [100, 38.4, 29.1, 24.5, 21.0, 18.2, 16.5]
		},
		{
			period: 'Feb 22 – Feb 28',
			size: 3890,
			intervals: [100, 41.2, 31.0, 26.2, 22.8, 19.4, 17.1]
		},
		{
			period: 'Feb 15 – Feb 21',
			size: 4150,
			intervals: [100, 39.8, 28.9, 25.1, 21.9, 18.8, null]
		},
		{
			period: 'Feb 08 – Feb 14',
			size: 3620,
			intervals: [100, 36.5, 27.2, 23.8, 20.1, null, null]
		},
		{
			period: 'Feb 01 – Feb 07',
			size: 3410,
			intervals: [100, 42.1, 32.5, 27.9, null, null, null]
		},
		{
			period: 'Jan 25 – Jan 31',
			size: 2980,
			intervals: [100, 37.8, 28.1, null, null, null, null]
		}
	];

	function getBgColor(value: number | null): string {
		if (value === null) return 'bg-ink-lighter/20 text-transparent';
		if (value >= 80) return 'bg-primary/90 text-white font-bold';
		if (value >= 35) return 'bg-primary/60 text-white font-semibold';
		if (value >= 25) return 'bg-primary/40 text-accent font-medium';
		if (value >= 15) return 'bg-primary/20 text-muted-light';
		return 'bg-primary/10 text-muted';
	}
</script>

<svelte:head>
	<title>Cohort Retention — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight text-white">Cohort Retention</h1>
			<p class="text-sm text-muted-light">Analyze visitor stickiness and repeat engagement over weekly cohorts</p>
		</div>
		<div class="flex items-center rounded-lg border border-ink-border bg-ink-lighter p-1 text-xs">
			<button class="rounded-md bg-ink px-3 py-1 font-semibold text-white">Weekly</button>
			<button class="rounded-md px-3 py-1 text-muted-light hover:text-white">Monthly</button>
		</div>
	</div>

	<!-- Retention KPI Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="kpi-card p-4">
			<span class="text-xs text-muted-light">Day 1 Retention</span>
			<span class="text-2xl font-bold text-emerald-400 mt-1">39.3%</span>
			<span class="text-[11px] text-muted-light mt-0.5">Industry avg: 28%</span>
		</div>
		<div class="kpi-card p-4">
			<span class="text-xs text-muted-light">Day 7 Retention</span>
			<span class="text-2xl font-bold text-accent mt-1">21.4%</span>
			<span class="text-[11px] text-muted-light mt-0.5">Consistent retention curve</span>
		</div>
		<div class="kpi-card p-4">
			<span class="text-xs text-muted-light">Day 30 Retention</span>
			<span class="text-2xl font-bold text-primary-light mt-1">16.8%</span>
			<span class="text-[11px] text-emerald-400 mt-0.5">↑ 2.4% vs previous cohort</span>
		</div>
	</div>

	<!-- Cohort Heatmap Table -->
	<div class="glass-card p-6 overflow-x-auto">
		<h3 class="text-sm font-semibold text-white mb-4">Retention Heatmap (%)</h3>
		<table class="w-full text-xs">
			<thead>
				<tr class="border-b border-ink-border text-muted">
					<th class="pb-3 text-left font-medium">Cohort Week</th>
					<th class="pb-3 text-right font-medium pr-4">Visitors</th>
					<th class="pb-3 text-center font-medium">W0</th>
					<th class="pb-3 text-center font-medium">W1</th>
					<th class="pb-3 text-center font-medium">W2</th>
					<th class="pb-3 text-center font-medium">W3</th>
					<th class="pb-3 text-center font-medium">W4</th>
					<th class="pb-3 text-center font-medium">W5</th>
					<th class="pb-3 text-center font-medium">W6</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-ink-border">
				{#each cohorts as cohort}
					<tr class="hover:bg-ink-lighter/30">
						<td class="py-3 font-medium text-white">{cohort.period}</td>
						<td class="py-3 text-right font-mono text-muted-light pr-4">{cohort.size.toLocaleString()}</td>
						{#each cohort.intervals as rate}
							<td class="py-2 px-1 text-center">
								<div class="rounded py-1.5 px-2 {getBgColor(rate)} text-xs transition-colors">
									{rate !== null ? `${rate}%` : '—'}
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
