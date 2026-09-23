<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Zap,
		Layers,
		Activity,
		Users,
		Clock,
		RefreshCw,
		Search,
		Sparkles,
		Code,
		Copy,
		Check,
		Sliders,
		X,
		Tag,
		ArrowUpRight,
		ExternalLink,
		Bug,
		Download,
		FileText,
		Send,
		FileDown,
		MousePointerClick,
		SlidersHorizontal,
		BarChart3
	} from '@lucide/svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import {
		fetchEvents,
		fetchEventProperties,
		fetchPropertyKeys,
		fetchPropertyValues,
		formatCountryName,
		type EventsResponse,
		type EventListItem,
		type EventPropertyItem,
		type PropertyKeyItem,
		type PropertyValueBreakdown
	} from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let activeMainTab = $state<'all' | 'enhanced' | 'dimensions'>('all');

	let data = $state<EventsResponse | null>(null);
	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let searchQuery = $state('');

	// Property Inspector state
	let inspectingEvent = $state<string | null>(null);
	let inspectingProperties = $state<EventPropertyItem[]>([]);
	let isPropsLoading = $state(false);

	// Custom Dimensions Explorer state
	let propertyKeys = $state<PropertyKeyItem[]>([]);
	let isPropKeysLoading = $state(false);
	let propSearchQuery = $state('');
	let selectedPropKey = $state<string | null>(null);
	let selectedPropBreakdown = $state<PropertyValueBreakdown | null>(null);
	let isPropBreakdownLoading = $state(false);

	// Integration Guide tab state
	let activeGuideTab = $state<'datalayer' | 'gtag' | 'enhanced' | 'html' | 'js'>('enhanced');
	let copiedSnippet = $state(false);

	const guideSnippets = {
		enhanced: `<!-- Enhanced Measurement (Enabled by default, zero configuration!) -->
<!-- Automatically tracks:
  1. Outbound links: clicks leading to external domains (event: 'outbound_click')
  2. File downloads: clicks on .pdf, .zip, .docx, .xlsx, etc. (event: 'file_download')
  3. Site search: queries with ?q=, ?s=, ?search= (event: 'search')
  4. Form submissions: HTML form submit events (event: 'form_submit')
-->
<script
  defer
  data-site-id="YOUR_TRACKING_ID"
  src="http://localhost:8081/gravlytics.min.js"
><` + `/script>`,
		datalayer: `// Google Analytics dataLayer integration
// Gravlytics automatically intercepts window.dataLayer.push
window.dataLayer = window.dataLayer || [];

window.dataLayer.push({
  event: 'purchase',
  transaction_id: 'T_10283',
  value: 99.00,
  currency: 'USD',
  plan: 'enterprise'
});`,
		gtag: `// Google Tag (gtag) integration
// Intercepted automatically with all parameters
gtag('event', 'sign_up', {
  method: 'google',
  plan: 'developer',
  referral: 'spring_promo'
});`,
		html: `<!-- Umami-style HTML Data Attributes -->
<button
  data-gravlytics-event="Purchase Plan"
  data-gravlytics-event-plan="pro"
  data-gravlytics-event-price="49.99"
  data-gravlytics-event-billing="annual"
>
  Upgrade to Pro
</button>

<a href="/docs" data-umami-event="Docs Visit" data-umami-event-topic="api">
  View Documentation
</a>`,
		js: `// Custom JavaScript Event Tracker API
gravlytics.track('checkout_completed', {
  order_id: 'ord_8829',
  amount: 149.00,
  currency: 'USD',
  item_count: 3
});

// Enable DebugView mode in browser:
gravlytics.debug(true);`
	};

	function copySnippet(text: string) {
		navigator.clipboard.writeText(text);
		copiedSnippet = true;
		setTimeout(() => {
			copiedSnippet = false;
		}, 2000);
	}

	async function loadEvents() {
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			const res = await fetchEvents(current, dateStore.from, dateStore.to, 50);
			data = res;
		} catch (err) {
			console.error('Failed to load events', err);
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	async function loadPropertyKeys() {
		const current = siteStore.activeSiteId;
		if (!current) return;
		isPropKeysLoading = true;
		try {
			const keys = await fetchPropertyKeys(current, dateStore.from, dateStore.to);
			propertyKeys = keys || [];
			if (propertyKeys.length > 0 && !selectedPropKey) {
				inspectDimension(propertyKeys[0].key);
			}
		} catch (err) {
			console.error('Failed to load property keys', err);
		} finally {
			isPropKeysLoading = false;
		}
	}

	async function inspectDimension(key: string) {
		selectedPropKey = key;
		isPropBreakdownLoading = true;
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			selectedPropBreakdown = await fetchPropertyValues(current, key, dateStore.from, dateStore.to, 30);
		} catch (err) {
			console.error('Failed to inspect property values', err);
		} finally {
			isPropBreakdownLoading = false;
		}
	}

	async function openPropertyInspector(eventName: string) {
		inspectingEvent = eventName;
		isPropsLoading = true;
		inspectingProperties = [];
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			const props = await fetchEventProperties(current, eventName, dateStore.from, dateStore.to);
			inspectingProperties = props;
		} catch (err) {
			console.error('Failed to load event props', err);
		} finally {
			isPropsLoading = false;
		}
	}

	function closePropertyInspector() {
		inspectingEvent = null;
		inspectingProperties = [];
	}

	let filteredEvents = $derived.by(() => {
		if (!data?.events) return [];
		if (!searchQuery.trim()) return data.events;
		const q = searchQuery.toLowerCase();
		return data.events.filter((e) => e.event_name.toLowerCase().includes(q));
	});

	let filteredPropKeys = $derived.by(() => {
		if (!propSearchQuery.trim()) return propertyKeys;
		const q = propSearchQuery.toLowerCase();
		return propertyKeys.filter((p) => p.key.toLowerCase().includes(q));
	});

	// Enhanced Measurement Specific Slices
	let enhancedStats = $derived.by(() => {
		const evs = data?.events || [];
		const findCount = (name: string) => evs.find((e) => e.event_name === name)?.total_count || 0;
		return {
			outbound: findCount('outbound_click'),
			downloads: findCount('file_download'),
			search: findCount('search'),
			forms: findCount('form_submit'),
			scroll: findCount('$scroll')
		};
	});

	let lastSiteId = '';
	let lastDateVersion = -1;

	$effect(() => {
		const current = siteStore.activeSiteId;
		const ver = dateStore.version;
		if (current && (current !== lastSiteId || ver !== lastDateVersion)) {
			lastSiteId = current;
			lastDateVersion = ver;
			untrack(() => {
				loadEvents();
				if (activeMainTab === 'dimensions') {
					loadPropertyKeys();
				}
			});
		}
	});

	$effect(() => {
		if (activeMainTab === 'dimensions' && propertyKeys.length === 0) {
			loadPropertyKeys();
		}
	});

	onMount(() => {
		const interval = setInterval(() => {
			loadEvents();
		}, 15000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Events & Telemetry — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
		<div>
			<h1 class="text-lg font-bold tracking-tight text-heading flex items-center gap-2">
				<Zap size={18} class="text-amber-400" />
				Events & Telemetry
			</h1>
			<p class="text-xs text-label">
				Comprehensive event tracking with Enhanced Measurement, GA4 dataLayer compatibility, and custom dimensions.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<a
				href="/debugview"
				class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:text-primary-hover border border-primary/20"
				title="Open DebugView Live Inspector"
			>
				<Bug size={13} />
				<span>Live DebugView</span>
			</a>

			<button
				onclick={() => {
					isRefreshing = true;
					loadEvents();
					if (activeMainTab === 'dimensions') loadPropertyKeys();
				}}
				class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
				title="Refresh event data"
			>
				<RefreshCw size={13} class={isRefreshing ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
		<KPICard
			label="Total Events"
			value={data?.overview?.total_events?.toLocaleString() ?? '0'}
			icon={Layers}
			subtitle="All recorded actions"
		/>
		<KPICard
			label="Custom Events"
			value={data?.overview?.custom_events?.toLocaleString() ?? '0'}
			icon={Zap}
			subtitle="Non-pageview triggers"
		/>
		<KPICard
			label="Event Types"
			value={data?.overview?.unique_event_types?.toLocaleString() ?? '0'}
			icon={Tag}
			subtitle="Distinct event names"
		/>
		<KPICard
			label="Unique Users"
			value={data?.overview?.unique_visitors?.toLocaleString() ?? '0'}
			icon={Users}
			subtitle="Triggering visitors"
		/>
		<KPICard
			label="Events / Session"
			value={(data?.overview?.events_per_session ?? 0).toFixed(1)}
			icon={Activity}
			subtitle="Engagement intensity"
		/>
	</div>

	<!-- Main Sub-Navigation Tabs -->
	<div class="flex items-center gap-1 border-b border-themed pb-1 text-xs font-medium">
		<button
			onclick={() => (activeMainTab = 'all')}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors {activeMainTab === 'all'
				? 'bg-indigo-500/15 text-heading font-semibold border border-indigo-500/30'
				: 'text-label hover:text-body hover:bg-card-hover'}"
		>
			<Layers size={14} />
			<span>All Telemetry & Actions</span>
		</button>

		<button
			onclick={() => (activeMainTab = 'enhanced')}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors {activeMainTab === 'enhanced'
				? 'bg-indigo-500/15 text-heading font-semibold border border-indigo-500/30'
				: 'text-label hover:text-body hover:bg-card-hover'}"
		>
			<Sparkles size={14} class="text-amber-400" />
			<span>Enhanced Measurement</span>
			{#if enhancedStats.outbound + enhancedStats.downloads + enhancedStats.search + enhancedStats.forms > 0}
				<span class="rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 text-[10px] font-mono">
					{enhancedStats.outbound + enhancedStats.downloads + enhancedStats.search + enhancedStats.forms}
				</span>
			{/if}
		</button>

		<button
			onclick={() => (activeMainTab = 'dimensions')}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors {activeMainTab === 'dimensions'
				? 'bg-indigo-500/15 text-heading font-semibold border border-indigo-500/30'
				: 'text-label hover:text-body hover:bg-card-hover'}"
		>
			<SlidersHorizontal size={14} />
			<span>Custom Dimensions & Properties</span>
		</button>
	</div>

	<!-- TAB 1: ALL EVENTS -->
	{#if activeMainTab === 'all'}
		<!-- Top Events Breakdown -->
		<div class="card-surface overflow-hidden">
			<div class="border-b border-themed px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div>
					<h2 class="text-xs font-semibold text-heading tracking-wide uppercase">Top Events Breakdown</h2>
					<p class="text-[11px] text-label">All registered event triggers ordered by total occurrences</p>
				</div>

				<div class="relative w-full sm:w-64">
					<Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-hint" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search event name..."
						class="input-field w-full pl-8 pr-2.5 py-1 text-xs"
					/>
				</div>
			</div>

			{#if isLoading}
				<div class="py-12 text-center text-xs text-hint">Loading events telemetry...</div>
			{:else if filteredEvents.length === 0}
				<div class="py-12 text-center text-xs text-hint">
					{#if searchQuery}
						No events found matching "{searchQuery}"
					{:else}
						No events recorded yet. Send your first custom event or push to dataLayer to see metrics here.
					{/if}
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="border-b border-themed text-[10px] font-mono uppercase tracking-wider text-label">
								<th class="px-4 py-2 font-medium">Event Name</th>
								<th class="px-4 py-2 font-medium">Category</th>
								<th class="px-4 py-2 font-medium">Occurrences</th>
								<th class="px-4 py-2 font-medium text-right">Unique Visitors</th>
								<th class="px-4 py-2 font-medium text-right">Sessions</th>
								<th class="px-4 py-2 font-medium text-right">Share</th>
								<th class="px-4 py-2 font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-themed">
							{#each filteredEvents as ev (ev.event_name)}
								<tr class="transition-colors hover:bg-card-hover" style="border-top: 1px solid var(--divider);">
									<td class="px-4 py-2.5">
										<div class="flex items-center gap-2">
											{#if ev.event_name === 'pageview'}
												<span class="flex h-5 w-5 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
													<Activity size={12} />
												</span>
											{:else if ev.event_name.startsWith('outbound') || ev.event_name.startsWith('file_') || ev.event_name === 'search'}
												<span class="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
													<Sparkles size={12} />
												</span>
											{:else}
												<span class="flex h-5 w-5 items-center justify-center rounded bg-orange-500/10 text-orange-600 dark:text-orange-400">
													<Zap size={12} />
												</span>
											{/if}
											<span class="font-mono font-medium text-heading">{ev.event_name}</span>
										</div>
									</td>

									<td class="px-4 py-2.5">
										{#if ev.category === 'system'}
											<span class="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-primary font-medium">
												System
											</span>
										{:else if ev.event_name.startsWith('outbound') || ev.event_name.startsWith('file_') || ev.event_name === 'search' || ev.event_name === 'form_submit'}
											<span class="rounded bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
												Enhanced Auto
											</span>
										{:else}
											<span class="rounded bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 text-[10px] font-mono text-orange-700 dark:text-orange-300 font-semibold">
												Custom / DataLayer
											</span>
										{/if}
									</td>

									<td class="px-4 py-2.5">
										<div class="flex items-center gap-2 min-w-[120px]">
											<div class="h-1.5 flex-1 rounded-full overflow-hidden" style="background: var(--divider-strong);">
												<div
													class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
													style="width: {Math.max(ev.percentage, 2)}%"
												></div>
											</div>
											<span class="font-mono text-body font-semibold">{ev.total_count.toLocaleString()}</span>
										</div>
									</td>

									<td class="px-4 py-2.5 text-right font-mono text-label">
										{ev.unique_visitors.toLocaleString()}
									</td>

									<td class="px-4 py-2.5 text-right font-mono text-label">
										{ev.unique_sessions.toLocaleString()}
									</td>

									<td class="px-4 py-2.5 text-right font-mono text-body font-medium">
										{ev.percentage.toFixed(1)}%
									</td>

									<td class="px-4 py-2.5 text-right">
										<button
											onclick={() => openPropertyInspector(ev.event_name)}
											class="inline-flex items-center gap-1 rounded badge-tag px-2 py-1 text-[11px] font-medium text-body hover:bg-card-hover hover:text-heading transition-colors"
											title="Inspect custom event properties"
										>
											<Sliders size={11} />
											<span>Inspect Props</span>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- Live Event Stream & Integration Guide Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<!-- Live Event Stream -->
			<div class="card-surface overflow-hidden">
				<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
					<div>
						<h2 class="text-xs font-semibold text-heading tracking-wide uppercase">Recent Telemetry Activity</h2>
						<p class="text-[11px] text-label">Chronological stream of incoming telemetry & properties</p>
					</div>
					<a href="/debugview" class="flex items-center gap-1 text-[10px] font-mono text-indigo-400 hover:underline">
						<Bug size={11} />
						Full DebugView →
					</a>
				</div>

				{#if !data?.recent_stream || data.recent_stream.length === 0}
					<div class="py-12 text-center text-xs text-hint">No recent events captured yet</div>
				{:else}
					<div class="flex flex-col max-h-[380px] overflow-y-auto" style="border-color: var(--divider);">
						{#each data.recent_stream as ev, i (ev.event_id)}
							<div class="p-3 hover:bg-card-hover transition-colors flex flex-col gap-1.5" style="border-top: {i > 0 ? '1px solid var(--divider)' : 'none'};">
								<div class="flex items-center justify-between gap-2 text-xs">
									<div class="flex items-center gap-2 min-w-0">
										<span class="font-mono text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded {ev.event_name === 'pageview' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20'}">
											{ev.event_name}
										</span>
										<span class="font-mono text-heading text-xs truncate">{ev.url_path}</span>
									</div>
									<span class="font-mono text-[10px] text-label shrink-0">
										{new Date(ev.timestamp).toLocaleTimeString()}
									</span>
								</div>

								<div class="flex items-center justify-between gap-2 text-[11px] text-label">
									<span>{formatCountryName(ev.country || 'US')} • {ev.browser}</span>
									<span class="font-mono text-[10px] text-hint">Session #{ev.session_id.substring(0, 6)}</span>
								</div>

								{#if ev.props && Object.keys(ev.props).length > 0}
									<div class="flex items-center gap-1 flex-wrap pt-0.5">
										{#each Object.entries(ev.props) as [k, v]}
											<span class="inline-flex items-center gap-1 rounded badge-tag px-1.5 py-0.5 text-[9px] font-mono text-body">
												<span class="text-hint">{k}:</span>
												<span class="text-body font-medium">{v}</span>
											</span>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Integration Guide Card -->
			<div class="card-surface overflow-hidden flex flex-col justify-between">
				<div>
					<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
						<div>
							<h2 class="text-xs font-semibold text-heading tracking-wide uppercase">Tracker Integration Guide</h2>
							<p class="text-[11px] text-label">Auto measurement, DataLayers, HTML attributes, and JS calls</p>
						</div>

						<button
							onclick={() => copySnippet(guideSnippets[activeGuideTab])}
							class="btn-ghost flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium"
						>
							{#if copiedSnippet}
								<Check size={12} class="text-emerald-400" />
								<span class="text-emerald-400">Copied!</span>
							{:else}
								<Copy size={12} />
								<span>Copy Code</span>
							{/if}
						</button>
					</div>

					<!-- Tabs -->
					<div class="flex border-b border-themed px-3 pt-2 gap-1 bg-input overflow-x-auto">
						<button
							onclick={() => (activeGuideTab = 'enhanced')}
							class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap {activeGuideTab === 'enhanced' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
						>
							Enhanced Auto
						</button>
						<button
							onclick={() => (activeGuideTab = 'datalayer')}
							class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap {activeGuideTab === 'datalayer' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
						>
							Google dataLayer
						</button>
						<button
							onclick={() => (activeGuideTab = 'gtag')}
							class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap {activeGuideTab === 'gtag' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
						>
							gtag()
						</button>
						<button
							onclick={() => (activeGuideTab = 'html')}
							class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap {activeGuideTab === 'html' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
						>
							HTML Attributes
						</button>
						<button
							onclick={() => (activeGuideTab = 'js')}
							class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors whitespace-nowrap {activeGuideTab === 'js' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
						>
							JavaScript API
						</button>
					</div>

					<!-- Code Box -->
					<div class="p-4">
						<pre class="code-block p-3 text-xs font-mono overflow-x-auto leading-relaxed"><code>{guideSnippets[activeGuideTab]}</code></pre>
					</div>
				</div>

				<div class="border-t border-themed px-4 py-2.5 bg-input text-[11px] text-label flex items-center justify-between">
					<span>Cookieless, privacy-compliant, zero setup needed.</span>
					<span class="text-indigo-400 font-mono text-[10px]">gravlytics.min.js &lt; 5 KB</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 2: ENHANCED MEASUREMENT -->
	{#if activeMainTab === 'enhanced'}
		<div class="flex flex-col gap-4">
			<!-- Enhanced KPI Highlights -->
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div class="card-surface p-3.5 flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase text-label">Outbound Link Clicks</div>
						<div class="text-xl font-bold font-mono text-heading mt-0.5">
							{enhancedStats.outbound.toLocaleString()}
						</div>
						<div class="text-[10px] text-hint mt-0.5">event: outbound_click</div>
					</div>
					<span class="p-2 rounded-lg bg-sky-500/10 text-sky-400">
						<MousePointerClick size={16} />
					</span>
				</div>

				<div class="card-surface p-3.5 flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase text-label">File Downloads</div>
						<div class="text-xl font-bold font-mono text-heading mt-0.5">
							{enhancedStats.downloads.toLocaleString()}
						</div>
						<div class="text-[10px] text-hint mt-0.5">event: file_download</div>
					</div>
					<span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
						<FileDown size={16} />
					</span>
				</div>

				<div class="card-surface p-3.5 flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase text-label">Site Search Queries</div>
						<div class="text-xl font-bold font-mono text-heading mt-0.5">
							{enhancedStats.search.toLocaleString()}
						</div>
						<div class="text-[10px] text-hint mt-0.5">event: search</div>
					</div>
					<span class="p-2 rounded-lg bg-purple-500/10 text-purple-400">
						<Search size={16} />
					</span>
				</div>

				<div class="card-surface p-3.5 flex items-center justify-between">
					<div>
						<div class="text-[10px] font-mono uppercase text-label">Form Submissions</div>
						<div class="text-xl font-bold font-mono text-heading mt-0.5">
							{enhancedStats.forms.toLocaleString()}
						</div>
						<div class="text-[10px] text-hint mt-0.5">event: form_submit</div>
					</div>
					<span class="p-2 rounded-lg bg-amber-500/10 text-amber-400">
						<Send size={16} />
					</span>
				</div>
			</div>

			<!-- Enhanced Explanation Banner -->
			<div class="card-surface p-4 border-l-4 border-indigo-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<h3 class="text-xs font-semibold text-heading flex items-center gap-1.5">
						<Sparkles size={14} class="text-indigo-400" />
						Google Analytics 4 Enhanced Measurement Parity
					</h3>
					<p class="text-xs text-label mt-0.5">
						Gravlytics automatically intercepts external link departures, downloadable assets (.pdf, .zip, .csv), URL search queries, and form submits with zero tag coding.
					</p>
				</div>
				<button
					onclick={() => openPropertyInspector('outbound_click')}
					class="btn-primary text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 shrink-0"
				>
					<Sliders size={12} />
					<span>Inspect Outbound Props</span>
				</button>
			</div>

			<!-- 4 Quadrants of Enhanced Breakdown -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- 1. Outbound Links -->
				<div class="card-surface p-4 flex flex-col gap-2">
					<div class="flex items-center justify-between border-b border-themed pb-2">
						<div class="flex items-center gap-2">
							<span class="p-1.5 rounded bg-sky-500/10 text-sky-400"><MousePointerClick size={14} /></span>
							<span class="text-xs font-semibold text-heading">Outbound Link Tracking</span>
						</div>
						<button
							onclick={() => openPropertyInspector('outbound_click')}
							class="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-mono"
						>
							View URLs →
						</button>
					</div>
					<p class="text-xs text-label">
						Logs every external navigation out of your domain with target URL, domain name, anchor text, and target frame.
					</p>
					<div class="p-3 rounded bg-input text-xs font-mono text-body flex items-center justify-between">
						<span>Captured: <strong class="text-heading">{enhancedStats.outbound} clicks</strong></span>
						<span class="text-emerald-400 text-[11px]">Active</span>
					</div>
				</div>

				<!-- 2. File Downloads -->
				<div class="card-surface p-4 flex flex-col gap-2">
					<div class="flex items-center justify-between border-b border-themed pb-2">
						<div class="flex items-center gap-2">
							<span class="p-1.5 rounded bg-emerald-500/10 text-emerald-400"><FileDown size={14} /></span>
							<span class="text-xs font-semibold text-heading">Automatic File Downloads</span>
						</div>
						<button
							onclick={() => openPropertyInspector('file_download')}
							class="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-mono"
						>
							View Files →
						</button>
					</div>
					<p class="text-xs text-label">
						Automatically detects downloads for files (.pdf, .xlsx, .docx, .zip, .csv, .mp4, etc.) without manual tag configurations.
					</p>
					<div class="p-3 rounded bg-input text-xs font-mono text-body flex items-center justify-between">
						<span>Captured: <strong class="text-heading">{enhancedStats.downloads} downloads</strong></span>
						<span class="text-emerald-400 text-[11px]">Active</span>
					</div>
				</div>

				<!-- 3. Site Search -->
				<div class="card-surface p-4 flex flex-col gap-2">
					<div class="flex items-center justify-between border-b border-themed pb-2">
						<div class="flex items-center gap-2">
							<span class="p-1.5 rounded bg-purple-500/10 text-purple-400"><Search size={14} /></span>
							<span class="text-xs font-semibold text-heading">Site Search Telemetry</span>
						</div>
						<button
							onclick={() => openPropertyInspector('search')}
							class="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-mono"
						>
							View Terms →
						</button>
					</div>
					<p class="text-xs text-label">
						Extracts search terms automatically from URL query parameters (?q=, ?s=, ?search=, ?query=) upon page loads and SPA navigations.
					</p>
					<div class="p-3 rounded bg-input text-xs font-mono text-body flex items-center justify-between">
						<span>Captured: <strong class="text-heading">{enhancedStats.search} queries</strong></span>
						<span class="text-emerald-400 text-[11px]">Active</span>
					</div>
				</div>

				<!-- 4. Form Submissions -->
				<div class="card-surface p-4 flex flex-col gap-2">
					<div class="flex items-center justify-between border-b border-themed pb-2">
						<div class="flex items-center gap-2">
							<span class="p-1.5 rounded bg-amber-500/10 text-amber-400"><Send size={14} /></span>
							<span class="text-xs font-semibold text-heading">Form Interactions</span>
						</div>
						<button
							onclick={() => openPropertyInspector('form_submit')}
							class="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-mono"
						>
							View Forms →
						</button>
					</div>
					<p class="text-xs text-label">
						Captures form submissions with form IDs, names, and destination paths. Privacy-first: never records sensitive input fields.
					</p>
					<div class="p-3 rounded bg-input text-xs font-mono text-body flex items-center justify-between">
						<span>Captured: <strong class="text-heading">{enhancedStats.forms} submissions</strong></span>
						<span class="text-emerald-400 text-[11px]">Active</span>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 3: CUSTOM DIMENSIONS & PROPERTIES EXPLORER -->
	{#if activeMainTab === 'dimensions'}
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
			<!-- Left: Property Keys List (5 cols) -->
			<div class="lg:col-span-5 flex flex-col gap-3">
				<div class="card-surface overflow-hidden">
					<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
						<div>
							<h3 class="text-xs font-semibold text-heading tracking-wide uppercase">Custom Dimensions</h3>
							<p class="text-[11px] text-label">All parameter keys extracted from telemetry payload</p>
						</div>

						<span class="font-mono text-xs text-indigo-400 font-semibold">
							{propertyKeys.length} keys
						</span>
					</div>

					<div class="p-2.5 border-b border-themed">
						<div class="relative">
							<Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-hint" />
							<input
								type="text"
								bind:value={propSearchQuery}
								placeholder="Search parameter key..."
								class="input-field w-full pl-8 pr-2.5 py-1 text-xs font-mono"
							/>
						</div>
					</div>

					{#if isPropKeysLoading}
						<div class="py-12 text-center text-xs text-hint">Scanning custom properties in ClickHouse...</div>
					{:else if filteredPropKeys.length === 0}
						<div class="py-12 text-center text-xs text-hint">
							{#if propSearchQuery}
								No dimensions matching "{propSearchQuery}"
							{:else}
								No custom event properties recorded yet. Send events with props to explore them here.
							{/if}
						</div>
					{:else}
						<div class="divide-y divide-themed max-h-[500px] overflow-y-auto">
							{#each filteredPropKeys as pk (pk.key)}
								{@const isSelected = selectedPropKey === pk.key}
								<button
									type="button"
									onclick={() => inspectDimension(pk.key)}
									class="w-full text-left p-3 transition-colors flex items-start justify-between gap-2 hover:bg-card-hover {isSelected ? 'bg-indigo-500/10 border-l-2 border-indigo-400' : ''}"
								>
									<div class="flex flex-col gap-1 min-w-0">
										<span class="font-mono text-xs font-semibold text-heading flex items-center gap-1.5 truncate">
											<Tag size={12} class="text-indigo-400 shrink-0" />
											{pk.key}
										</span>
										{#if pk.sample_values && pk.sample_values.length > 0}
											<span class="text-[10px] text-hint truncate font-mono">
												e.g. {pk.sample_values.join(', ')}
											</span>
										{/if}
									</div>

									<div class="text-right shrink-0">
										<div class="font-mono text-xs font-semibold text-body">{pk.total_count.toLocaleString()}</div>
										<div class="text-[10px] text-hint font-mono">{pk.unique_values} unique</div>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Right: Property Value Distribution Breakdown (7 cols) -->
			<div class="lg:col-span-7 flex flex-col gap-3">
				<div class="card-surface overflow-hidden">
					<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
						<div>
							<h3 class="text-xs font-semibold text-heading tracking-wide uppercase flex items-center gap-1.5">
								<BarChart3 size={13} class="text-primary" />
								Values Distribution: <span class="font-mono text-primary font-semibold">{selectedPropKey || 'None'}</span>
							</h3>
							<p class="text-[11px] text-label">Frequency breakdown across visitors and actions</p>
						</div>

						{#if selectedPropBreakdown}
							<span class="text-xs font-mono font-medium text-body">
								Total: <strong class="text-heading">{selectedPropBreakdown.total_count.toLocaleString()}</strong>
							</span>
						{/if}
					</div>

					{#if isPropBreakdownLoading}
						<div class="py-16 text-center text-xs text-hint">Calculating values distribution...</div>
					{:else if !selectedPropBreakdown || selectedPropBreakdown.values.length === 0}
						<div class="py-16 text-center text-xs text-hint">Select a property key on the left to see its values breakdown.</div>
					{:else}
						<div class="p-4 flex flex-col gap-3">
							<table class="w-full text-xs text-left">
								<thead>
									<tr class="border-b border-themed text-[10px] font-mono uppercase text-label">
										<th class="py-2 font-medium">Value</th>
										<th class="py-2 font-medium">Occurrences</th>
										<th class="py-2 font-medium text-right">Unique Visitors</th>
										<th class="py-2 font-medium text-right">Share</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-themed font-mono">
									{#each selectedPropBreakdown.values as pv}
										<tr class="hover:bg-card-hover transition-colors">
											<td class="py-2.5 pr-2 font-medium text-heading">
												<span class="rounded bg-input px-1.5 py-0.5 border border-themed">{pv.value || '(empty)'}</span>
											</td>
											<td class="py-2.5">
												<div class="flex items-center gap-2 min-w-[120px]">
													<div class="h-1.5 flex-1 rounded-full overflow-hidden" style="background: var(--divider-strong);">
														<div
															class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
															style="width: {Math.max(pv.percentage, 2)}%"
														></div>
													</div>
													<span class="text-body font-semibold">{pv.count.toLocaleString()}</span>
												</div>
											</td>
											<td class="py-2.5 text-right text-label">{pv.visitors.toLocaleString()}</td>
											<td class="py-2.5 text-right font-semibold text-indigo-400">{pv.percentage.toFixed(1)}%</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Event Property Inspector Modal -->
{#if inspectingEvent}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
		<div class="card-modal w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
			<div class="flex items-center justify-between border-b border-themed px-4 py-3">
				<div>
					<h3 class="text-sm font-semibold text-heading flex items-center gap-2">
						<Sliders size={14} class="text-amber-400" />
						Property Inspector: <span class="font-mono text-indigo-400">{inspectingEvent}</span>
					</h3>
					<p class="text-[11px] text-label">Custom payload attributes collected from dataLayer and custom trackers</p>
				</div>
				<button
					onclick={closePropertyInspector}
					class="rounded p-1 text-label hover:bg-card-hover hover:text-heading"
					aria-label="Close modal"
				>
					<X size={16} />
				</button>
			</div>

			<div class="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
				{#if isPropsLoading}
					<div class="py-8 text-center text-xs text-hint">Querying event properties...</div>
				{:else if inspectingProperties.length === 0}
					<div class="py-8 text-center text-xs text-hint">
						No custom properties recorded for "{inspectingEvent}" yet.
					</div>
				{:else}
					<div class="flex flex-col gap-3">
						{#each inspectingProperties as prop}
							<div class="rounded-lg border border-themed bg-input p-3 flex flex-col gap-2">
								<div class="flex items-center justify-between">
									<span class="font-mono text-xs font-semibold text-heading flex items-center gap-1.5">
										<Tag size={12} class="text-indigo-400" />
										{prop.key}
									</span>
									<span class="font-mono text-[10px] text-label">{prop.count} occurrences</span>
								</div>

								{#if prop.top_values && prop.top_values.length > 0}
									<div class="flex flex-col gap-1 pt-1 border-t border-themed">
										<span class="text-[10px] font-mono uppercase text-hint">Top Values:</span>
										<div class="flex flex-wrap gap-1.5">
											{#each prop.top_values as v}
												<span class="inline-flex items-center gap-1 rounded badge-tag px-2 py-0.5 text-xs font-mono">
													<span class="text-amber-400 font-medium">{v.value}</span>
													<span class="text-hint text-[10px]">({v.count})</span>
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="border-t border-themed px-4 py-2.5 bg-input flex justify-end">
				<button
					onclick={closePropertyInspector}
					class="btn-ghost rounded-md px-3 py-1.5 text-xs font-medium"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
