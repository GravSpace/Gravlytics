<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';
	import { Link2, Megaphone, Tag, Share2 } from '@lucide/svelte';
	import { fetchBreakdown, type BreakdownItem } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let referrers = $state<BreakdownItem[]>([]);
	let utmMediums = $state<BreakdownItem[]>([]);
	let utmCampaigns = $state<BreakdownItem[]>([]);
	let utmSources = $state<BreakdownItem[]>([]);
	let isLoading = $state(true);

	async function loadSources() {
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			const from = dateStore.from;
			const to = dateStore.to;

			const [ref, med, camp, src] = await Promise.all([
				fetchBreakdown(current, 'referrer_domain', from, to, 20),
				fetchBreakdown(current, 'utm_medium', from, to, 20),
				fetchBreakdown(current, 'utm_campaign', from, to, 20),
				fetchBreakdown(current, 'utm_source', from, to, 20)
			]);

			referrers = ref;
			utmMediums = med;
			utmCampaigns = camp;
			utmSources = src;
		} catch (err) {
			console.error('Failed to load sources data', err);
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
				loadSources();
			});
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadSources();
		}, 10000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Acquisition Sources — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col">
		<h1 class="text-lg font-bold tracking-tight text-heading">Acquisition & Traffic Sources</h1>
		<p class="text-xs text-label">Discover where your audience originates and measure inbound campaigns</p>
	</div>

	<!-- Breakdown Grid -->
	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<BreakdownTable title="Referring Domains" items={referrers} icon={Link2} metricLabel="Visitors" />
		<BreakdownTable title="UTM Sources" items={utmSources} icon={Share2} metricLabel="Visitors" />
	</div>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<BreakdownTable title="Active Campaigns" items={utmCampaigns} icon={Megaphone} metricLabel="Visitors" />
		<BreakdownTable title="Marketing Mediums" items={utmMediums} icon={Tag} metricLabel="Visitors" />
	</div>
</div>
