<script lang="ts">
	type DataPoint = {
		label: string;
		pageviews: number;
		visitors: number;
	};

	type Props = {
		data: DataPoint[];
	};

	let { data }: Props = $props();

	// Calculate chart dimensions
	const maxValue = $derived(Math.max(...data.map((d) => d.pageviews), 1));

	function getHeight(value: number): number {
		return (value / maxValue) * 100;
	}
</script>

<div class="glass-card p-5">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-sm font-semibold text-white">Visitors & Pageviews</h3>
		<div class="flex items-center gap-4 text-xs">
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-primary"></span>
				<span class="text-muted-light">Pageviews</span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="h-2 w-2 rounded-full bg-accent"></span>
				<span class="text-muted-light">Visitors</span>
			</span>
		</div>
	</div>

	<!-- Simple bar chart (will be replaced with LayerChart) -->
	<div class="flex h-48 items-end gap-1">
		{#each data as point, i}
			<div class="group relative flex flex-1 flex-col items-center gap-0.5">
				<!-- Pageviews bar -->
				<div
					class="w-full rounded-t-sm bg-primary/60 transition-all duration-300 group-hover:bg-primary"
					style="height: {getHeight(point.pageviews)}%"
				></div>

				<!-- Tooltip on hover -->
				<div
					class="pointer-events-none absolute -top-16 z-10 hidden rounded-lg bg-ink-lighter px-3 py-2 text-xs shadow-xl group-hover:block"
				>
					<p class="font-medium text-white">{point.label}</p>
					<p class="text-muted-light">PV: {point.pageviews.toLocaleString()}</p>
					<p class="text-muted-light">UV: {point.visitors.toLocaleString()}</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- X-axis labels -->
	<div class="mt-2 flex gap-1">
		{#each data as point, i}
			{#if i % Math.ceil(data.length / 7) === 0}
				<div class="flex-1 text-center text-[10px] text-muted">{point.label}</div>
			{:else}
				<div class="flex-1"></div>
			{/if}
		{/each}
	</div>
</div>
