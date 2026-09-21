<script lang="ts">
	type Props = {
		label: string;
		value: string | number;
		change?: number; // percentage change
		format?: 'number' | 'percent' | 'duration';
	};

	let { label, value, change, format = 'number' }: Props = $props();

	function formatValue(val: string | number, fmt: string): string {
		if (typeof val === 'string') return val;
		switch (fmt) {
			case 'percent':
				return val.toFixed(1) + '%';
			case 'duration':
				if (val < 60) return val.toFixed(0) + 's';
				return Math.floor(val / 60) + 'm ' + (val % 60).toFixed(0) + 's';
			default:
				return val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val.toLocaleString();
		}
	}

	function trendClass(c: number | undefined): string {
		if (c === undefined || c === 0) return 'trend-neutral';
		return c > 0 ? 'trend-up' : 'trend-down';
	}

	function trendIcon(c: number | undefined): string {
		if (c === undefined || c === 0) return '→';
		return c > 0 ? '↑' : '↓';
	}
</script>

<div class="kpi-card">
	<p class="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
	<p class="mt-2 text-2xl font-bold text-white">{formatValue(value, format)}</p>
	{#if change !== undefined}
		<p class="mt-1 flex items-center gap-1 text-xs font-medium {trendClass(change)}">
			<span>{trendIcon(change)}</span>
			<span>{Math.abs(change).toFixed(1)}%</span>
			<span class="text-muted">vs prev period</span>
		</p>
	{/if}
</div>
