<script lang="ts">
	import { BarChart3 } from '@lucide/svelte';

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
	const maxValue = $derived(
		Math.max(...data.map((d) => Math.max(d.pageviews, d.visitors)), 1)
	);

	function getHeight(value: number): number {
		return (value / maxValue) * 100;
	}
</script>

<div class="card-inset flex flex-col p-4 transition-all duration-200">
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div class="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
				<BarChart3 size={13} strokeWidth={2} />
			</div>
			<h3 class="text-xs font-semibold uppercase tracking-wider text-body">Traffic Activity</h3>
		</div>
		<div class="flex items-center gap-4 text-[11px] font-mono">
			<span class="flex items-center gap-1.5 text-body">
				<span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
				<span>Pageviews</span>
			</span>
			<span class="flex items-center gap-1.5 text-body">
				<span class="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
				<span>Visitors</span>
			</span>
		</div>
	</div>

	<!-- Chart area -->
	<div class="relative flex h-44 items-end gap-1 pt-4 px-1 border-b border-divider">
		{#if data.length === 0}
			<div class="flex h-full w-full items-center justify-center text-xs text-hint">
				Waiting for traffic data...
			</div>
		{:else}
			{#each data as point}
				<div class="group relative flex flex-1 flex-col items-center justify-end h-full">
					<div class="flex w-full items-end justify-center gap-0.5 h-full">
						<!-- Pageviews bar -->
						<div
							class="w-full max-w-[14px] rounded-t-sm bg-indigo-500/40 transition-all duration-200 group-hover:bg-indigo-400"
							style="height: {Math.max(getHeight(point.pageviews), 2)}%"
						></div>
						<!-- Visitors bar -->
						<div
							class="w-full max-w-[14px] rounded-t-sm bg-cyan-500/50 transition-all duration-200 group-hover:bg-cyan-400"
							style="height: {Math.max(getHeight(point.visitors), 2)}%"
						></div>
					</div>

					<!-- Hover Tooltip -->
					<div class="card-modal pointer-events-none absolute -top-14 z-30 hidden min-w-[110px] flex-col p-2 text-[10px] group-hover:flex">
						<span class="font-semibold text-heading">{point.label}</span>
						<div class="mt-1 flex items-center justify-between gap-2 font-mono">
							<span class="text-indigo-400">Pageviews</span>
							<span class="font-bold text-heading">{point.pageviews.toLocaleString()}</span>
						</div>
						<div class="flex items-center justify-between gap-2 font-mono">
							<span class="text-cyan-400">Visitors</span>
							<span class="font-bold text-heading">{point.visitors.toLocaleString()}</span>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- X-axis labels -->
	<div class="mt-2 flex gap-1 px-1">
		{#each data as point, i}
			{#if i % Math.max(Math.ceil(data.length / 8), 1) === 0}
				<div class="flex-1 text-center font-mono text-[9px] text-hint">{point.label}</div>
			{:else}
				<div class="flex-1"></div>
			{/if}
		{/each}
	</div>
</div>
