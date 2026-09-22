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
		ExternalLink
	} from '@lucide/svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import {
		fetchEvents,
		fetchEventProperties,
		formatCountryName,
		type EventsResponse,
		type EventListItem,
		type EventPropertyItem
	} from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let data = $state<EventsResponse | null>(null);
	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let searchQuery = $state('');

	// Property Inspector state
	let inspectingEvent = $state<string | null>(null);
	let inspectingProperties = $state<EventPropertyItem[]>([]);
	let isPropsLoading = $state(false);

	// Integration Guide tab state
	let activeGuideTab = $state<'html' | 'js' | 'datalayer' | 'gtag'>('datalayer');
	let copiedSnippet = $state(false);

	const guideSnippets = {
		datalayer: `// 1. Google Analytics dataLayer integration
// Gravlytics automatically intercepts window.dataLayer.push
window.dataLayer = window.dataLayer || [];

window.dataLayer.push({
  event: 'purchase',
  transaction_id: 'T_10283',
  value: 99.00,
  currency: 'USD',
  plan: 'enterprise'
});`,
		gtag: `// 2. Google Tag (gtag) integration
// Intercepted automatically with all parameters
gtag('event', 'sign_up', {
  method: 'google',
  plan: 'developer',
  referral: 'spring_promo'
});`,
		html: `<!-- 3. Umami-style HTML Data Attributes (No JavaScript needed) -->
<button
  data-gravlytics-event="Purchase Plan"
  data-gravlytics-event-plan="pro"
  data-gravlytics-event-price="49.99"
  data-gravlytics-event-billing="annual"
>
  Upgrade to Pro
</button>

<!-- Also drop-in compatible with data-umami-event: -->
<a href="/docs" data-umami-event="Docs Visit" data-umami-event-topic="api">
  View Documentation
</a>`,
		js: `// 4. Custom JavaScript Event Tracker API
gravlytics.track('checkout_completed', {
  order_id: 'ord_8829',
  amount: 149.00,
  currency: 'USD',
  item_count: 3
});

// Function tracking (tracks execution & execution time)
document.getElementById('checkout-btn').addEventListener('click', gravlytics.track(function() {
  processCheckout();
}, 'checkout_btn_clicked', {
  experiment_variant: 'blue_button'
}));

// User identification
gravlytics.identify('user_9921', { tier: 'vip' });`
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
			});
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
	<title>Events & Actions — Gravlytics</title>
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
				Captures custom telemetry, Google Analytics dataLayer events, and Umami-style HTML data attributes.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => {
					isRefreshing = true;
					loadEvents();
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
										{:else}
											<span class="flex h-5 w-5 items-center justify-center rounded bg-amber-500/10 text-amber-400">
												<Zap size={12} />
											</span>
										{/if}
										<span class="font-mono font-medium text-heading">{ev.event_name}</span>
									</div>
								</td>

								<td class="px-4 py-2.5">
									{#if ev.category === 'system'}
										<span class="rounded bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300">
											System
										</span>
									{:else}
										<span class="rounded bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-mono text-amber-500">
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

	<!-- Live Event Stream & Properties Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
		<!-- Live Event Stream -->
		<div class="card-surface overflow-hidden">
			<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
				<div>
					<h2 class="text-xs font-semibold text-heading tracking-wide uppercase">Live Event Activity Stream</h2>
					<p class="text-[11px] text-label">Chronological stream of incoming telemetry & properties</p>
				</div>
				<span class="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					Live
				</span>
			</div>

			{#if !data?.recent_stream || data.recent_stream.length === 0}
				<div class="py-12 text-center text-xs text-hint">No recent events captured yet</div>
			{:else}
				<div class="flex flex-col max-h-[380px] overflow-y-auto" style="border-color: var(--divider);">
					{#each data.recent_stream as ev, i (ev.event_id)}
						<div class="p-3 hover:bg-card-hover transition-colors flex flex-col gap-1.5" style="border-top: {i > 0 ? '1px solid var(--divider)' : 'none'};">
							<div class="flex items-center justify-between gap-2 text-xs">
								<div class="flex items-center gap-2 min-w-0">
									<span class="font-mono text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded {ev.event_name === 'pageview' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'}">
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
											<span class="text-amber-500">{v}</span>
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
						<p class="text-[11px] text-label">Support for DataLayers, HTML attributes, and JS calls</p>
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
				<div class="flex border-b border-themed px-3 pt-2 gap-1 bg-input">
					<button
						onclick={() => (activeGuideTab = 'datalayer')}
						class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors {activeGuideTab === 'datalayer' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
					>
						Google dataLayer
					</button>
					<button
						onclick={() => (activeGuideTab = 'gtag')}
						class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors {activeGuideTab === 'gtag' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
					>
						gtag()
					</button>
					<button
						onclick={() => (activeGuideTab = 'html')}
						class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors {activeGuideTab === 'html' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
					>
						HTML Data Attributes
					</button>
					<button
						onclick={() => (activeGuideTab = 'js')}
						class="px-2.5 py-1.5 text-xs font-medium rounded-t transition-colors {activeGuideTab === 'js' ? 'bg-card-solid text-heading border-t border-x border-themed' : 'text-label hover:text-body'}"
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
				<span class="text-indigo-400 font-mono text-[10px]">gravlytics.min.js &lt; 1.5 KB</span>
			</div>
		</div>
	</div>
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
