<script lang="ts">
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';

	const deviceTypes = [
		{ label: '🖥️ Desktop', value: 18450, percentage: 100 },
		{ label: '📱 Mobile', value: 11240, percentage: 60.9 },
		{ label: '📟 Tablet', value: 2120, percentage: 11.5 }
	];

	const browsers = [
		{ label: 'Chrome', value: 17200, percentage: 100 },
		{ label: 'Safari', value: 6840, percentage: 39.8 },
		{ label: 'Firefox', value: 3920, percentage: 22.8 },
		{ label: 'Edge', value: 2450, percentage: 14.2 },
		{ label: 'Arc / Chromium', value: 1400, percentage: 8.1 }
	];

	const operatingSystems = [
		{ label: 'macOS', value: 12400, percentage: 100 },
		{ label: 'Windows', value: 9850, percentage: 79.4 },
		{ label: 'iOS', value: 5410, percentage: 43.6 },
		{ label: 'Android', value: 3820, percentage: 30.8 },
		{ label: 'Linux', value: 2140, percentage: 17.3 }
	];

	const screenResolutions = [
		{ label: '1920 × 1080 (FHD)', value: 8920, percentage: 100 },
		{ label: '2560 × 1440 (QHD)', value: 4320, percentage: 48.4 },
		{ label: '1440 × 900', value: 3850, percentage: 43.2 },
		{ label: '390 × 844 (Mobile)', value: 3120, percentage: 35.0 },
		{ label: '3840 × 2160 (4K)', value: 1840, percentage: 20.6 }
	];
</script>

<svelte:head>
	<title>Devices & Platforms — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold tracking-tight text-white">Devices & Platforms</h1>
		<p class="text-sm text-muted-light">Client hardware, browsers, and operating systems distribution</p>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<BreakdownTable title="📱 Device Categories" items={deviceTypes} />
		<BreakdownTable title="🌐 Browsers" items={browsers} />
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<BreakdownTable title="💻 Operating Systems" items={operatingSystems} />
		<BreakdownTable title="🖥️ Common Screen Sizes" items={screenResolutions} />
	</div>
</div>
