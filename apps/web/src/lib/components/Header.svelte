<script lang="ts">
	let { sidebarCollapsed = false }: { sidebarCollapsed: boolean } = $props();

	let dateRange = $state('Last 30 days');
</script>

<header class="flex h-14 items-center justify-between border-b border-ink-border bg-ink-light px-6">
	<div class="flex items-center gap-4">
		<h1 class="text-sm font-semibold text-white">Dashboard</h1>
		<span class="rounded-full bg-positive-muted px-2 py-0.5 text-xs font-medium text-positive">
			Live
		</span>
	</div>

	<div class="flex items-center gap-3">
		<!-- Date range selector -->
		<select
			bind:value={dateRange}
			class="rounded-lg border border-ink-border bg-ink-lighter px-3 py-1.5 text-sm text-muted-light outline-none transition-colors focus:border-primary"
		>
			<option>Today</option>
			<option>Last 7 days</option>
			<option>Last 30 days</option>
			<option>Last 3 months</option>
			<option>Last 12 months</option>
		</select>

		<!-- Site selector -->
		<select
			class="rounded-lg border border-ink-border bg-ink-lighter px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
		>
			<option value="gly_demo_8829">gravlytics.dev</option>
			<option value="gly_demo_9912">docs.gravlytics.dev</option>
		</select>

		<!-- Export Report Button -->
		<button
			onclick={() => {
				const data = [
					['Metric', 'Value'],
					['Unique Visitors', '12847'],
					['Total Pageviews', '43291'],
					['Bounce Rate', '42.3%'],
					['Avg Duration', '185s']
				].map(e => e.join(',')).join('\n');
				const blob = new Blob([data], { type: 'text/csv' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `gravlytics_export_${new Date().toISOString().split('T')[0]}.csv`;
				a.click();
				URL.revokeObjectURL(url);
			}}
			class="flex items-center gap-1.5 rounded-lg border border-ink-border bg-ink-lighter px-3 py-1.5 text-xs font-medium text-muted-light hover:border-primary/50 hover:text-white"
			title="Export report as CSV"
		>
			<span>📥</span>
			<span class="hidden sm:inline">Export</span>
		</button>

		<!-- Logout link -->
		<a
			href="/logout"
			class="rounded-lg p-2 text-xs text-muted hover:text-red-400 hover:bg-red-500/10"
			title="Sign Out"
		>
			🚪
		</a>
	</div>
</header>
