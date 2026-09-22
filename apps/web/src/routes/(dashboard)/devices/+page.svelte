<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';
	import { MonitorSmartphone, Globe, Laptop, Maximize2 } from '@lucide/svelte';
	import { fetchBreakdown, type BreakdownItem } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let deviceTypes = $state<BreakdownItem[]>([]);
	let browsers = $state<BreakdownItem[]>([]);
	let operatingSystems = $state<BreakdownItem[]>([]);
	let screenResolutions = $state<BreakdownItem[]>([]);
	let isLoading = $state(true);

	async function loadDevices() {
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			const from = dateStore.from;
			const to = dateStore.to;

			const [dev, brow, os, scr] = await Promise.all([
				fetchBreakdown(current, 'device_type', from, to, 10),
				fetchBreakdown(current, 'browser', from, to, 20),
				fetchBreakdown(current, 'os', from, to, 20),
				fetchBreakdown(current, 'screen_width', from, to, 20)
			]);

			deviceTypes = dev;
			browsers = brow;
			operatingSystems = os;
			screenResolutions = scr;
		} catch (err) {
			console.error('Failed to load device stats', err);
		} finally {
			isLoading = false;
		}
	}

	let lastSiteId = '';
	let lastDateVersion = -1;

	$effect(() => {
		const current = siteStore.activeSiteId;
		const ver = dateStore.version;
		if (current && (current !== lastSiteId || ver !== lastDateVersion)) {
			lastSiteId = current;
			lastDateVersion = ver;
			untrack(() => {
				loadDevices();
			});
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadDevices();
		}, 10000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Devices & Platforms — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col">
		<h1 class="text-lg font-bold tracking-tight text-heading">Devices & Platforms</h1>
		<p class="text-xs text-label">Client hardware categories, browsers, operating systems, and viewport widths</p>
	</div>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<BreakdownTable title="Device Form Factors" items={deviceTypes} icon={MonitorSmartphone} metricLabel="Visitors" />
		<BreakdownTable title="Web Browsers" items={browsers} icon={Globe} metricLabel="Visitors" />
	</div>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<BreakdownTable title="Operating Systems" items={operatingSystems} icon={Laptop} metricLabel="Visitors" />
		<BreakdownTable title="Screen Viewports" items={screenResolutions} icon={Maximize2} metricLabel="Visitors" />
	</div>
</div>
