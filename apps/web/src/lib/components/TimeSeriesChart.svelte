<script lang="ts">
	import { BarChart3, Pin, Plus } from '@lucide/svelte';

	type DataPoint = {
		label: string;
		pageviews: number;
		visitors: number;
	};

	export type AnnotationItem = {
		id: string;
		date: string;
		title: string;
		description?: string;
		category: string;
		color: string;
	};

	type Props = {
		data: DataPoint[];
		annotations?: AnnotationItem[];
		onAddAnnotation?: () => void;
	};

	let { data, annotations = [], onAddAnnotation }: Props = $props();

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
		<div class="flex items-center gap-3 text-[11px] font-mono">
			{#if onAddAnnotation}
				<button
					type="button"
					onclick={onAddAnnotation}
					class="flex items-center gap-1 rounded bg-input border border-themed px-2 py-0.5 text-[11px] font-sans text-label hover:text-heading hover:bg-card-hover transition-colors"
					title="Add event annotation"
				>
					<Pin size={11} class="text-indigo-400" />
					<span>Add Note</span>
				</button>
			{/if}
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

	<!-- Annotation Event Timeline Ribbon -->
	{#if annotations.length > 0}
		<div class="mt-3 flex flex-wrap items-center gap-1.5 border-t border-themed pt-2.5">
			<span class="text-[10px] text-hint flex items-center gap-1"><Pin size={10} /> Events:</span>
			{#each annotations as note}
				<span
					class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono border {note.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : note.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : note.color === 'rose' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}"
					title="{note.date}: {note.title}{note.description ? ' - ' + note.description : ''}"
				>
					<span class="text-hint font-sans">{note.date}</span>
					<span class="font-semibold font-sans text-heading">{note.title}</span>
				</span>
			{/each}
		</div>
	{/if}
</div>
