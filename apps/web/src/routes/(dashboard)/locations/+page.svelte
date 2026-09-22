<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';
	import { Globe, Building2, MapPin, Compass } from '@lucide/svelte';
	import { fetchBreakdown, type BreakdownItem } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let countries = $state<BreakdownItem[]>([]);
	let regions = $state<BreakdownItem[]>([]);
	let cities = $state<BreakdownItem[]>([]);
	let isLoading = $state(true);

	async function loadLocations() {
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			const from = dateStore.from;
			const to = dateStore.to;

			const [cnt, reg, ct] = await Promise.all([
				fetchBreakdown(current, 'country', from, to, 30),
				fetchBreakdown(current, 'region', from, to, 30),
				fetchBreakdown(current, 'city', from, to, 30)
			]);

			countries = cnt;
			regions = reg;
			cities = ct;
		} catch (err) {
			console.error('Failed to load locations', err);
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
				loadLocations();
			});
		}
	});

	onMount(() => {
		loadLocations();
		const interval = setInterval(() => {
			loadLocations();
		}, 15000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Geographic Distribution — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Geographic Distribution</h1>
			<p class="text-xs text-label">
				Accurate visitor telemetry across countries, provinces/states, and metropolitan areas ({dateStore.label})
			</p>
		</div>
	</div>

	<!-- 3 Breakdown Columns / Grid -->
	<div class="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
		<BreakdownTable title="Top Countries" items={countries} icon={Globe} metricLabel="Visitors" />
		<BreakdownTable title="Top Regions & Provinces" items={regions} icon={MapPin} metricLabel="Visitors" />
		<BreakdownTable title="Top Metros & Cities" items={cities} icon={Building2} metricLabel="Visitors" />
	</div>
</div>
