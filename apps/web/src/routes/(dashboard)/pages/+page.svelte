<script lang="ts">
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';

	const topPages = [
		{ label: '/', value: 14280, percentage: 100 },
		{ label: '/docs/getting-started', value: 5820, percentage: 40.7 },
		{ label: '/pricing', value: 4910, percentage: 34.3 },
		{ label: '/blog/privacy-first-analytics', value: 3420, percentage: 23.9 },
		{ label: '/features/realtime', value: 2840, percentage: 19.8 },
		{ label: '/changelog', value: 1950, percentage: 13.6 },
		{ label: '/about', value: 1420, percentage: 9.9 },
		{ label: '/docs/api-reference', value: 1180, percentage: 8.2 }
	];

	const entryPages = [
		{ label: '/', value: 9240, percentage: 100 },
		{ label: '/blog/privacy-first-analytics', value: 2950, percentage: 31.9 },
		{ label: '/docs/getting-started', value: 1820, percentage: 19.7 },
		{ label: '/pricing', value: 1450, percentage: 15.6 },
		{ label: '/changelog', value: 890, percentage: 9.6 }
	];

	const exitPages = [
		{ label: '/pricing', value: 4120, percentage: 100 },
		{ label: '/', value: 3890, percentage: 94.4 },
		{ label: '/docs/getting-started', value: 1640, percentage: 39.8 },
		{ label: '/blog/privacy-first-analytics', value: 1210, percentage: 29.3 }
	];

	let searchQuery = $state('');
	const filteredPages = $derived(
		topPages.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
	);
</script>

<svelte:head>
	<title>Pages — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold tracking-tight text-white">Pages & Paths</h1>
		<p class="text-sm text-muted-light">Detailed breakdown of content engagement across your site</p>
	</div>

	<!-- Search & Filter bar -->
	<div class="flex items-center gap-3">
		<div class="glass-card relative flex-1 max-w-md">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Filter pages by path..."
				class="w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder-muted focus:outline-none"
			/>
		</div>
	</div>

	<!-- Top Pages Table -->
	<div class="grid grid-cols-1 gap-6">
		<BreakdownTable title="📄 All Visited Pages" items={filteredPages} />
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<BreakdownTable title="🚪 Top Entry Pages (Landing)" items={entryPages} />
		<BreakdownTable title="🚶 Top Exit Pages" items={exitPages} />
	</div>
</div>
