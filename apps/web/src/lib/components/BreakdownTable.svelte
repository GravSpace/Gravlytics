<script lang="ts">
	type BreakdownItem = {
		label: string;
		value: number;
		percentage: number;
	};

	type Props = {
		title: string;
		items: BreakdownItem[];
	};

	let { title, items }: Props = $props();

	function formatNumber(n: number): string {
		if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
		return n.toLocaleString();
	}
</script>

<div class="glass-card p-5">
	<h3 class="mb-4 text-sm font-semibold text-white">{title}</h3>

	<div class="flex flex-col gap-3">
		{#each items as item, i}
			<div class="group">
				<div class="mb-1 flex items-center justify-between text-sm">
					<span class="text-muted-light group-hover:text-white transition-colors">{item.label}</span>
					<div class="flex items-center gap-3">
						<span class="font-medium text-white">{formatNumber(item.value)}</span>
						<span class="w-10 text-right text-xs text-muted">{item.percentage.toFixed(0)}%</span>
					</div>
				</div>
				<div class="h-1.5 overflow-hidden rounded-full bg-ink-lighter">
					<div
						class="h-full rounded-full transition-all duration-500"
						style="width: {item.percentage}%; background: linear-gradient(90deg, var(--color-primary), var(--color-accent))"
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>
