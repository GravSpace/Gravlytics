<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';
	import { FileText, LogIn, LogOut, Search } from '@lucide/svelte';
	import { fetchBreakdown, type BreakdownItem } from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let topPages = $state<BreakdownItem[]>([]);
	let entryPages = $state<BreakdownItem[]>([]);
	let exitPages = $state<BreakdownItem[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');

	const filteredPages = $derived(
		topPages.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	async function loadData() {
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			const from = dateStore.from;
			const to = dateStore.to;

			const [pages, entries, exits] = await Promise.all([
				fetchBreakdown(current, 'url_path', from, to, 50),
				fetchBreakdown(current, 'entry_path', from, to, 20),
				fetchBreakdown(current, 'exit_path', from, to, 20)
			]);
			topPages = pages;
			entryPages = entries.length > 0 ? entries : pages.slice(0, 5);
			exitPages = exits.length > 0 ? exits : pages.slice(0, 5);
		} catch (err) {
			console.error('Failed to load pages data', err);
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
				loadData();
			});
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadData();
		}, 10000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Pages & Paths — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Pages & Paths</h1>
			<p class="text-xs text-label">Detailed breakdown of content engagement and landing drop-offs</p>
		</div>

		<!-- Search & Filter bar -->
		<div class="relative flex items-center max-w-xs w-full">
			<Search size={13} class="pointer-events-none absolute left-2.5 text-hint" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Filter paths..."
				class="w-full rounded-md border border-themed bg-input pl-7 pr-3 py-1.5 text-xs text-heading placeholder-hint outline-none transition-colors hover:border-themed-strong focus:border-indigo-500"
			/>
		</div>
	</div>

	<!-- Top Pages Table -->
	<div class="grid grid-cols-1 gap-3">
		<BreakdownTable title="All Visited Pages" items={filteredPages} icon={FileText} metricLabel="Pageviews" />
	</div>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<BreakdownTable title="Top Landing (Entry) Pages" items={entryPages} icon={LogIn} metricLabel="Sessions" />
		<BreakdownTable title="Top Exit Pages" items={exitPages} icon={LogOut} metricLabel="Sessions" />
	</div>
</div>
