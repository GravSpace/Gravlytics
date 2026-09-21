<script lang="ts">
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';

	const countries = [
		{ label: '🇺🇸 United States (US)', value: 16420, percentage: 100 },
		{ label: '🇩🇪 Germany (DE)', value: 6840, percentage: 41.6 },
		{ label: '🇬🇧 United Kingdom (GB)', value: 5210, percentage: 31.7 },
		{ label: '🇯🇵 Japan (JP)', value: 4120, percentage: 25.1 },
		{ label: '🇮🇩 Indonesia (ID)', value: 3890, percentage: 23.7 },
		{ label: '🇫🇷 France (FR)', value: 2940, percentage: 17.9 },
		{ label: '🇨🇦 Canada (CA)', value: 2450, percentage: 14.9 },
		{ label: '🇳🇱 Netherlands (NL)', value: 1890, percentage: 11.5 },
		{ label: '🇸🇬 Singapore (SG)', value: 1620, percentage: 9.9 },
		{ label: '🇦🇺 Australia (AU)', value: 1340, percentage: 8.2 }
	];

	const cities = [
		{ label: 'Jakarta, ID', value: 2840, percentage: 100 },
		{ label: 'Tokyo, JP', value: 2410, percentage: 84.8 },
		{ label: 'San Francisco, US', value: 2150, percentage: 75.7 },
		{ label: 'London, GB', value: 1980, percentage: 69.7 },
		{ label: 'Berlin, DE', value: 1820, percentage: 64.1 },
		{ label: 'New York, US', value: 1640, percentage: 57.7 },
		{ label: 'Amsterdam, NL', value: 1210, percentage: 42.6 },
		{ label: 'Singapore, SG', value: 1090, percentage: 38.4 }
	];
</script>

<svelte:head>
	<title>Geographic Locations — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold tracking-tight text-white">Geographic Distribution</h1>
		<p class="text-sm text-muted-light">Privacy-preserving coarse country and city traffic distribution</p>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<BreakdownTable title="🌍 Top Countries" items={countries} />
		<BreakdownTable title="🏙️ Top Cities" items={cities} />
	</div>
</div>
