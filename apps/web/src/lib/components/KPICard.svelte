<script lang="ts">
	import { TrendingUp, TrendingDown, Minus } from '@lucide/svelte';
	import type { Component } from 'svelte';

	type Props = {
		label: string;
		value: string | number;
		change?: number; // percentage change
		format?: 'number' | 'percent' | 'duration';
		icon?: any;
		subtitle?: string;
	};

	let { label, value, change, format = 'number', icon: Icon, subtitle }: Props = $props();

	function formatValue(val: string | number, fmt: string): string {
		if (typeof val === 'string') return val;
		switch (fmt) {
			case 'percent':
				return val.toFixed(1) + '%';
			case 'duration':
				if (val < 60) return val.toFixed(0) + 's';
				return Math.floor(val / 60) + 'm ' + (val % 60).toFixed(0) + 's';
			default:
				return val >= 10000 ? (val / 1000).toFixed(1) + 'k' : val.toLocaleString();
		}
	}
</script>

<div class="card group relative flex flex-col justify-between p-4 transition-all duration-200 hover:border-indigo-500/30">
	<div class="flex items-center justify-between">
		<span class="text-[11px] font-semibold uppercase tracking-wider text-label group-hover:text-body transition-colors">
			{label}
		</span>
		{#if Icon}
			<div class="flex h-7 w-7 items-center justify-center rounded-md bg-input text-indigo-400 border border-themed group-hover:border-indigo-500/20 transition-colors">
				<Icon size={14} strokeWidth={1.75} />
			</div>
		{/if}
	</div>

	<div class="mt-2.5 flex items-baseline justify-between gap-2">
		<span class="font-mono text-2xl font-bold tracking-tight text-heading">
			{formatValue(value, format)}
		</span>

		{#if change !== undefined && change !== 0}
			<div class="flex items-center gap-1 text-[11px] font-semibold font-mono {change > 0 ? 'text-emerald-400' : 'text-rose-400'}">
				{#if change > 0}
					<TrendingUp size={13} strokeWidth={2} />
					<span>+{change.toFixed(1)}%</span>
				{:else}
					<TrendingDown size={13} strokeWidth={2} />
					<span>{change.toFixed(1)}%</span>
				{/if}
			</div>
		{:else if subtitle}
			<span class="text-[11px] text-hint">{subtitle}</span>
		{/if}
	</div>
</div>
