<script lang="ts">
	import { Inbox } from '@lucide/svelte';
	import type { Component } from 'svelte';

	type BreakdownItem = {
		label: string;
		value: number;
		percentage: number;
	};

	type Props = {
		title: string;
		items: BreakdownItem[];
		icon?: any;
		metricLabel?: string;
	};

	let { title, items, icon: Icon, metricLabel = 'Visitors' }: Props = $props();

	function formatNumber(n: number): string {
		if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
		return n.toLocaleString();
	}
</script>

<div class="card-inset flex flex-col p-4 transition-all duration-200">
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if Icon}
				<div class="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
					<Icon size={13} strokeWidth={2} />
				</div>
			{/if}
			<h3 class="text-xs font-semibold uppercase tracking-wider text-body">{title}</h3>
		</div>
		<span class="text-[10px] font-mono text-hint">{metricLabel}</span>
	</div>

	{#if items.length === 0}
		<div class="flex h-32 flex-col items-center justify-center gap-1.5 rounded border border-dashed border-themed bg-input text-center">
			<Inbox size={18} class="text-hint" />
			<span class="text-xs text-hint">No events recorded in this period</span>
		</div>
	{:else}
		<div class="flex flex-col" style="border-color: var(--divider);">
			{#each items as item, i}
				<div class="group relative flex flex-col py-2 px-1 transition-colors rounded" style="border-top: {i > 0 ? '1px solid var(--divider)' : 'none'};">
					<div class="mb-1.5 flex items-center justify-between text-xs">
						<span class="truncate font-medium text-body group-hover:text-heading transition-colors max-w-[70%]" title={item.label}>
							{item.label}
						</span>
						<div class="flex items-center gap-2 font-mono">
							<span class="font-semibold text-heading">{formatNumber(item.value)}</span>
							<span class="w-8 text-right text-[11px] text-label">{item.percentage.toFixed(0)}%</span>
						</div>
					</div>
					<!-- Progress bar -->
					<div class="h-1 w-full overflow-hidden rounded-full" style="background: var(--divider-strong);">
						<div
							class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-80 group-hover:opacity-100"
							style="width: {Math.max(item.percentage, 2)}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
