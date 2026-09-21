<script lang="ts">
	import KPICard from '$lib/components/KPICard.svelte';
	import TimeSeriesChart from '$lib/components/TimeSeriesChart.svelte';
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';

	// Demo data — will be replaced with API calls
	const kpis = [
		{ label: 'Unique Visitors', value: 12847, change: 12.5 },
		{ label: 'Total Pageviews', value: 43291, change: 8.3 },
		{ label: 'Bounce Rate', value: 42.3, change: -3.1, format: 'percent' as const },
		{ label: 'Avg. Duration', value: 185, change: 5.7, format: 'duration' as const }
	];

	// Generate 30 days of demo data
	const chartData = Array.from({ length: 30 }, (_, i) => {
		const date = new Date();
		date.setDate(date.getDate() - 29 + i);
		const base = 800 + Math.random() * 600;
		return {
			label: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
			pageviews: Math.round(base + Math.sin(i * 0.5) * 200),
			visitors: Math.round((base + Math.sin(i * 0.5) * 200) * 0.6)
		};
	});

	const topPages = [
		{ label: '/', value: 8432, percentage: 100 },
		{ label: '/docs/getting-started', value: 3291, percentage: 39 },
		{ label: '/pricing', value: 2847, percentage: 33.8 },
		{ label: '/blog/privacy-first', value: 1923, percentage: 22.8 },
		{ label: '/features', value: 1547, percentage: 18.4 },
		{ label: '/about', value: 892, percentage: 10.6 }
	];

	const topSources = [
		{ label: 'google.com', value: 5423, percentage: 100 },
		{ label: 'twitter.com', value: 2341, percentage: 43.2 },
		{ label: 'github.com', value: 1892, percentage: 34.9 },
		{ label: 'reddit.com', value: 1234, percentage: 22.8 },
		{ label: 'hackernews', value: 987, percentage: 18.2 },
		{ label: '(direct)', value: 743, percentage: 13.7 }
	];

	const topCountries = [
		{ label: '🇺🇸 United States', value: 4321, percentage: 100 },
		{ label: '🇩🇪 Germany', value: 2145, percentage: 49.6 },
		{ label: '🇬🇧 United Kingdom', value: 1876, percentage: 43.4 },
		{ label: '🇯🇵 Japan', value: 1234, percentage: 28.6 },
		{ label: '🇮🇩 Indonesia', value: 987, percentage: 22.8 },
		{ label: '🇫🇷 France', value: 654, percentage: 15.1 }
	];

	const topDevices = [
		{ label: '🖥️ Desktop', value: 7234, percentage: 100 },
		{ label: '📱 Mobile', value: 4521, percentage: 62.5 },
		{ label: '📟 Tablet', value: 1092, percentage: 15.1 }
	];
</script>

<svelte:head>
	<title>Overview — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<!-- KPI Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each kpis as kpi}
			<KPICard {...kpi} />
		{/each}
	</div>

	<!-- Time Series Chart -->
	<TimeSeriesChart data={chartData} />

	<!-- Breakdown Grid -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<BreakdownTable title="📄 Top Pages" items={topPages} />
		<BreakdownTable title="🔗 Top Sources" items={topSources} />
		<BreakdownTable title="🌍 Countries" items={topCountries} />
		<BreakdownTable title="💻 Devices" items={topDevices} />
	</div>
</div>
