<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Bug,
		Activity,
		Play,
		Pause,
		RotateCcw,
		Search,
		Filter,
		Send,
		Copy,
		Check,
		ExternalLink,
		Sliders,
		Monitor,
		Smartphone,
		Tablet,
		Globe,
		Clock,
		Layers,
		Zap,
		ShieldCheck,
		Code2,
		X
	} from '@lucide/svelte';
	import {
		fetchDebugStream,
		sendTestEvent,
		formatCountryName,
		type DebugEventItem,
		type DebugStreamResponse
	} from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';

	let streamData = $state<DebugStreamResponse | null>(null);
	let events = $state<DebugEventItem[]>([]);
	let selectedEvent = $state<DebugEventItem | null>(null);
	let isLive = $state(true);
	let onlyDebug = $state(false);
	let searchQuery = $state('');
	let inspectorTab = $state<'params' | 'user' | 'raw'>('params');
	let copiedId = $state(false);
	let copiedJson = $state(false);

	// Test Event Simulator Modal
	let showSimulator = $state(false);
	let simEventName = $state('outbound_click');
	let simCustomPropKey = $state('destination');
	let simCustomPropVal = $state('https://github.com/Gravlytics');
	let isSimulating = $state(false);
	let simSuccess = $state(false);

	let pollTimer: any = null;

	async function loadStream() {
		const current = siteStore.activeSiteId;
		if (!current) return;

		try {
			const res = await fetchDebugStream(current, 50, onlyDebug);
			streamData = res;
			if (res.events && res.events.length > 0) {
				events = res.events;
				if (!selectedEvent && events.length > 0) {
					selectedEvent = events[0];
				}
			}
		} catch (err) {
			console.error('Failed to load debug stream', err);
		}
	}

	function toggleLive() {
		isLive = !isLive;
		if (isLive) {
			loadStream();
		}
	}

	function clearStream() {
		events = [];
		selectedEvent = null;
	}

	function copyEventId(id: string) {
		navigator.clipboard.writeText(id);
		copiedId = true;
		setTimeout(() => (copiedId = false), 2000);
	}

	function copyRawJson(obj: any) {
		navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
		copiedJson = true;
		setTimeout(() => (copiedJson = false), 2000);
	}

	async function triggerTestEvent() {
		const current = siteStore.activeSiteId;
		if (!current) return;

		isSimulating = true;
		simSuccess = false;

		const extraProps: Record<string, string> = {};
		if (simCustomPropKey.trim() && simCustomPropVal.trim()) {
			extraProps[simCustomPropKey.trim()] = simCustomPropVal.trim();
		}

		if (simEventName === 'outbound_click') {
			extraProps.url = 'https://partner.example.com/special-deal';
			extraProps.domain = 'partner.example.com';
			extraProps.text = 'Explore Partner Deal';
		} else if (simEventName === 'file_download') {
			extraProps.file_name = 'Gravlytics-Q3-Report.pdf';
			extraProps.file_extension = 'pdf';
			extraProps.url = 'https://example.com/assets/Gravlytics-Q3-Report.pdf';
		} else if (simEventName === 'search') {
			extraProps.search_term = 'conversion rate optimization';
			extraProps.search_param = 'q';
		} else if (simEventName === 'form_submit') {
			extraProps.form_id = 'newsletter-signup-form';
			extraProps.form_destination = '/subscribe-thank-you';
		} else if (simEventName === 'purchase') {
			extraProps.order_id = 'ord_sim_' + Math.random().toString(36).substring(2, 7);
			extraProps.revenue = '149.00';
			extraProps.currency = 'USD';
		}

		const ok = await sendTestEvent(current, simEventName, extraProps);
		isSimulating = false;
		if (ok) {
			simSuccess = true;
			setTimeout(() => {
				simSuccess = false;
				showSimulator = false;
			}, 1200);
			// Refresh stream immediately
			setTimeout(loadStream, 400);
		}
	}

	let filteredEvents = $derived.by(() => {
		if (!searchQuery.trim()) return events;
		const q = searchQuery.toLowerCase();
		return events.filter(
			(e) =>
				e.event_name.toLowerCase().includes(q) ||
				e.url_path.toLowerCase().includes(q) ||
				(e.props && Object.values(e.props).some((v) => v.toLowerCase().includes(q)))
		);
	});

	$effect(() => {
		const s = siteStore.activeSiteId;
		const d = onlyDebug;
		if (s) {
			loadStream();
		}
	});

	onMount(() => {
		loadStream();
		pollTimer = setInterval(() => {
			if (isLive) {
				loadStream();
			}
		}, 2500);

		return () => {
			if (pollTimer) clearInterval(pollTimer);
		};
	});

	function getEventColor(name: string) {
		if (name === 'pageview') return 'bg-primary/10 text-primary border border-primary/20';
		if (name === 'outbound_click') return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20';
		if (name === 'file_download') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20';
		if (name === 'search') return 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20';
		if (name === 'form_submit') return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20';
		if (name === 'purchase') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20';
		return 'bg-card border border-themed text-body';
	}
</script>

<svelte:head>
	<title>DebugView (Live Inspector) — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<!-- Header Bar -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-lg font-bold tracking-tight text-heading flex items-center gap-2">
					<span class="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
						<Bug size={14} />
					</span>
					DebugView
				</h1>
				<span class="relative flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/25">
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 {isLive ? 'animate-pulse' : 'opacity-40'}"></span>
					{isLive ? 'Live Ingestion' : 'Paused'}
				</span>
			</div>
			<p class="text-xs text-label mt-0.5">
				Google Analytics 4-style live telemetry inspector. Test events, inspect parameters, and validate integrations in real-time.
			</p>
		</div>

		<!-- Control Actions -->
		<div class="flex items-center gap-2 flex-wrap">
			<button
				onclick={toggleLive}
				class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium"
				title={isLive ? 'Pause live stream updates' : 'Resume live stream'}
			>
				{#if isLive}
					<Pause size={13} class="text-amber-400" />
					<span>Pause Stream</span>
				{:else}
					<Play size={13} class="text-emerald-400" />
					<span>Resume</span>
				{/if}
			</button>

			<label class="flex items-center gap-1.5 cursor-pointer rounded-md badge-tag px-2.5 py-1.5 text-xs select-none hover:bg-card-hover transition-colors">
				<input type="checkbox" bind:checked={onlyDebug} class="rounded text-indigo-500 focus:ring-0 h-3.5 w-3.5" />
				<span class="font-medium text-body">Debug Only</span>
			</label>

			<button
				onclick={clearStream}
				class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium"
				title="Clear current stream buffer"
			>
				<RotateCcw size={13} />
				<span>Clear</span>
			</button>

			<button
				onclick={() => (showSimulator = true)}
				class="btn-primary flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm shadow-indigo-500/20"
			>
				<Send size={13} />
				<span>Send Test Event</span>
			</button>
		</div>
	</div>

	<!-- Top Live Stats Bar -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<div class="card-surface p-3 flex items-center justify-between">
			<div>
				<div class="text-[10px] font-mono uppercase text-label">Active Users (30m)</div>
				<div class="text-xl font-bold font-mono text-heading mt-0.5">
					{streamData?.active_visitors ?? 0}
				</div>
			</div>
			<span class="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
				<Activity size={16} />
			</span>
		</div>

		<div class="card-surface p-3 flex items-center justify-between">
			<div>
				<div class="text-[10px] font-mono uppercase text-label">Active Sessions (30m)</div>
				<div class="text-xl font-bold font-mono text-heading mt-0.5">
					{streamData?.active_sessions ?? 0}
				</div>
			</div>
			<span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
				<Clock size={16} />
			</span>
		</div>

		<div class="card-surface p-3 flex items-center justify-between">
			<div>
				<div class="text-[10px] font-mono uppercase text-label">Total Events (30m)</div>
				<div class="text-xl font-bold font-mono text-heading mt-0.5">
					{streamData?.total_past_30m ?? 0}
				</div>
			</div>
			<span class="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
				<Layers size={16} />
			</span>
		</div>

		<div class="card-surface p-3 flex items-center justify-between">
			<div>
				<div class="text-[10px] font-mono uppercase text-label">Stream Buffer</div>
				<div class="text-xl font-bold font-mono text-heading mt-0.5">
					{events.length} <span class="text-xs text-hint font-normal">events</span>
				</div>
			</div>
			<span class="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
				<Zap size={16} />
			</span>
		</div>
	</div>

	<!-- Main Two-Column Layout: Stream & Inspector -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
		<!-- Left: 30-Minute Timeline & Event Stream List (7 cols) -->
		<div class="lg:col-span-7 flex flex-col gap-3">
			<!-- Search & Filter Bar -->
			<div class="card-surface p-2.5 flex items-center gap-2">
				<div class="relative flex-1">
					<Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-hint" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Filter by event name, path, property..."
						class="input-field w-full pl-8 pr-2.5 py-1 text-xs"
					/>
				</div>
				{#if searchQuery}
					<button
						onclick={() => (searchQuery = '')}
						class="text-hint hover:text-body text-xs px-1"
					>
						Clear
					</button>
				{/if}
			</div>

			<!-- Stream Card -->
			<div class="card-surface overflow-hidden">
				<div class="border-b border-themed px-4 py-2.5 flex items-center justify-between text-xs">
					<div class="flex items-center gap-2">
						<span class="font-semibold text-heading tracking-wide uppercase text-[11px]">Live Incoming Stream</span>
						<span class="font-mono text-[10px] text-hint">({filteredEvents.length} items)</span>
					</div>
					<span class="text-[10px] text-hint font-mono">Latest on top</span>
				</div>

				{#if filteredEvents.length === 0}
					<div class="py-16 text-center text-xs text-hint flex flex-col items-center gap-2">
						<Bug size={24} class="opacity-30" />
						<div>
							{#if searchQuery}
								No events matching filter "{searchQuery}"
							{:else}
								Waiting for incoming events. Browse your site or click "Send Test Event" above.
							{/if}
						</div>
					</div>
				{:else}
					<div class="divide-y divide-themed max-h-[580px] overflow-y-auto">
						{#each filteredEvents as ev (ev.event_id)}
							{@const isSelected = selectedEvent?.event_id === ev.event_id}
							<button
								type="button"
								onclick={() => (selectedEvent = ev)}
								class="w-full text-left p-3 transition-colors flex items-start gap-3 hover:bg-card-hover {isSelected ? 'bg-indigo-500/10 border-l-2 border-indigo-400' : ''}"
							>
								<!-- Time Pill -->
								<div class="flex flex-col items-center shrink-0 w-14 pt-0.5">
									<span class="font-mono text-[11px] font-semibold text-body">
										{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
									</span>
									<span class="text-[9px] text-hint font-mono">
										{new Date(ev.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
									</span>
								</div>

								<!-- Event Info -->
								<div class="flex-1 min-w-0 flex flex-col gap-1">
									<div class="flex items-center gap-1.5 flex-wrap">
										<span class="rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold border {getEventColor(ev.event_name)}">
											{ev.event_name}
										</span>

										{#if ev.is_debug}
											<span class="rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 text-[9px] font-mono font-semibold">
												DEBUG
											</span>
										{/if}

										<span class="font-mono text-xs text-heading truncate font-medium">
											{ev.url_path || '/'}
										</span>
									</div>

									<div class="flex items-center gap-2 text-[11px] text-label">
										<span>{formatCountryName(ev.country || 'US')}</span>
										<span>•</span>
										<span>{ev.browser || 'Browser'} on {ev.os || 'OS'}</span>
										<span>•</span>
										<span class="font-mono text-[10px] text-hint">Session #{ev.session_id.substring(0, 6)}</span>
									</div>

									<!-- Top Parameters Pills Preview -->
									{#if ev.props && Object.keys(ev.props).length > 0}
										<div class="flex items-center gap-1 flex-wrap pt-0.5">
											{#each Object.entries(ev.props).slice(0, 3) as [k, v]}
												<span class="inline-flex items-center gap-1 rounded badge-tag px-1.5 py-0.5 text-[9px] font-mono text-body">
													<span class="text-hint">{k}:</span>
													<span class="text-indigo-400 truncate max-w-[120px]">{v}</span>
												</span>
											{/each}
											{#if Object.keys(ev.props).length > 3}
												<span class="text-[9px] text-hint font-mono">+{Object.keys(ev.props).length - 3} more</span>
											{/if}
										</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Event Parameters & Telemetry Inspector (5 cols) -->
		<div class="lg:col-span-5 sticky top-4 flex flex-col gap-3">
			<div class="card-surface overflow-hidden">
				<!-- Inspector Header -->
				<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
					<div>
						<h2 class="text-xs font-semibold text-heading tracking-wide uppercase flex items-center gap-1.5">
							<Sliders size={13} class="text-indigo-400" />
							Event Inspector
						</h2>
						<p class="text-[11px] text-label">Inspect all parameters & context</p>
					</div>

					{#if selectedEvent}
						<button
							onclick={() => copyEventId(selectedEvent!.event_id)}
							class="btn-ghost flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono"
							title="Copy Event UUID"
						>
							{#if copiedId}
								<Check size={11} class="text-emerald-400" />
								<span class="text-emerald-400">Copied</span>
							{:else}
								<Copy size={11} />
								<span>ID</span>
							{/if}
						</button>
					{/if}
				</div>

				{#if !selectedEvent}
					<div class="py-24 text-center text-xs text-hint flex flex-col items-center gap-2 p-6">
						<Sliders size={28} class="opacity-20" />
						<div>Select any event from the stream to inspect its parameters, geo context, device details, and raw payload.</div>
					</div>
				{:else}
					<!-- Selected Event Quick Banner -->
					<div class="p-3 bg-indigo-500/5 border-b border-themed flex flex-col gap-1">
						<div class="flex items-center justify-between">
							<span class="rounded px-2 py-0.5 text-xs font-mono font-bold border {getEventColor(selectedEvent.event_name)}">
								{selectedEvent.event_name}
							</span>
							<span class="text-[11px] font-mono text-label">
								{new Date(selectedEvent.timestamp).toLocaleTimeString()}
							</span>
						</div>
						<div class="font-mono text-xs text-heading break-all pt-1">
							{selectedEvent.url_path}
						</div>
					</div>

					<!-- Inspector Tabs -->
					<div class="flex border-b border-themed bg-card-surface text-xs font-medium">
						<button
							onclick={() => (inspectorTab = 'params')}
							class="flex-1 py-2 text-center border-b-2 transition-colors {inspectorTab === 'params' ? 'border-indigo-400 text-heading font-semibold bg-indigo-500/10' : 'border-transparent text-label hover:text-body'}"
						>
							Parameters ({Object.keys(selectedEvent.props || {}).length})
						</button>
						<button
							onclick={() => (inspectorTab = 'user')}
							class="flex-1 py-2 text-center border-b-2 transition-colors {inspectorTab === 'user' ? 'border-indigo-400 text-heading font-semibold bg-indigo-500/10' : 'border-transparent text-label hover:text-body'}"
						>
							Device & User
						</button>
						<button
							onclick={() => (inspectorTab = 'raw')}
							class="flex-1 py-2 text-center border-b-2 transition-colors {inspectorTab === 'raw' ? 'border-indigo-400 text-heading font-semibold bg-indigo-500/10' : 'border-transparent text-label hover:text-body'}"
						>
							Raw JSON
						</button>
					</div>

					<!-- Tab Content -->
					<div class="p-4 max-h-[460px] overflow-y-auto">
						{#if inspectorTab === 'params'}
							{#if !selectedEvent.props || Object.keys(selectedEvent.props).length === 0}
								<div class="py-8 text-center text-xs text-hint">No custom properties recorded for this event.</div>
							{:else}
								<table class="w-full text-xs text-left">
									<thead>
										<tr class="border-b border-themed text-[10px] font-mono uppercase text-label">
											<th class="py-1.5 font-medium">Key</th>
											<th class="py-1.5 font-medium">Value</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-themed font-mono">
										{#each Object.entries(selectedEvent.props) as [k, v]}
											<tr class="hover:bg-card-hover transition-colors">
												<td class="py-2 pr-2 text-primary font-semibold align-top">{k}</td>
												<td class="py-2 text-body break-all">{v}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							{/if}

							<!-- Standard UTM parameters if present -->
							{#if selectedEvent.utm_source || selectedEvent.utm_medium || selectedEvent.utm_campaign}
								<div class="mt-4 pt-3 border-t border-themed">
									<h4 class="text-[10px] font-mono uppercase text-label mb-2">Campaign Tracking (UTM)</h4>
									<div class="grid grid-cols-2 gap-2 text-xs font-mono">
										{#if selectedEvent.utm_source}
											<div class="p-2 rounded bg-card-surface border border-themed">
												<div class="text-[9px] text-hint">utm_source</div>
												<div class="text-heading font-medium truncate">{selectedEvent.utm_source}</div>
											</div>
										{/if}
										{#if selectedEvent.utm_medium}
											<div class="p-2 rounded bg-card-surface border border-themed">
												<div class="text-[9px] text-hint">utm_medium</div>
												<div class="text-heading font-medium truncate">{selectedEvent.utm_medium}</div>
											</div>
										{/if}
										{#if selectedEvent.utm_campaign}
											<div class="p-2 rounded bg-card-surface border border-themed col-span-2">
												<div class="text-[9px] text-hint">utm_campaign</div>
												<div class="text-heading font-medium truncate">{selectedEvent.utm_campaign}</div>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{:else if inspectorTab === 'user'}
							<div class="flex flex-col gap-3 text-xs">
								<div class="grid grid-cols-2 gap-2.5">
									<div class="p-2.5 rounded bg-card-surface border border-themed">
										<div class="text-[10px] text-hint uppercase font-mono">Browser</div>
										<div class="text-body font-semibold mt-0.5">{selectedEvent.browser} {selectedEvent.browser_version}</div>
									</div>
									<div class="p-2.5 rounded bg-card-surface border border-themed">
										<div class="text-[10px] text-hint uppercase font-mono">OS</div>
										<div class="text-body font-semibold mt-0.5">{selectedEvent.os} {selectedEvent.os_version}</div>
									</div>
									<div class="p-2.5 rounded bg-card-surface border border-themed">
										<div class="text-[10px] text-hint uppercase font-mono">Device Type</div>
										<div class="text-body font-semibold mt-0.5 capitalize">{selectedEvent.device_type || 'Desktop'}</div>
									</div>
									<div class="p-2.5 rounded bg-card-surface border border-themed">
										<div class="text-[10px] text-hint uppercase font-mono">Screen Width</div>
										<div class="text-body font-semibold mt-0.5 font-mono">{selectedEvent.screen_width}px</div>
									</div>
									<div class="p-2.5 rounded bg-card-surface border border-themed col-span-2">
										<div class="text-[10px] text-hint uppercase font-mono">Location</div>
										<div class="text-body font-semibold mt-0.5">
											{formatCountryName(selectedEvent.country || 'US')}
											{#if selectedEvent.city} • {selectedEvent.city}{/if}
											{#if selectedEvent.region} ({selectedEvent.region}){/if}
										</div>
									</div>
									<div class="p-2.5 rounded bg-card-surface border border-themed col-span-2 font-mono">
										<div class="text-[10px] text-hint uppercase">Session Identifier</div>
										<div class="text-body mt-0.5 text-[11px] truncate">#{selectedEvent.session_id}</div>
									</div>
									<div class="p-2.5 rounded bg-card-surface border border-themed col-span-2 font-mono">
										<div class="text-[10px] text-hint uppercase">Cookieless Visitor Hash</div>
										<div class="text-body mt-0.5 text-[11px] truncate">#{selectedEvent.visitor_id}</div>
									</div>
								</div>
							</div>
						{:else if inspectorTab === 'raw'}
							<div class="relative">
								<button
									onclick={() => copyRawJson(selectedEvent)}
									class="absolute right-2 top-2 btn-ghost flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono z-10 bg-sidebar/80"
								>
									{#if copiedJson}
										<Check size={11} class="text-emerald-400" />
										<span class="text-emerald-400">Copied</span>
									{:else}
										<Copy size={11} />
										<span>Copy JSON</span>
									{/if}
								</button>
								<pre class="p-3 rounded bg-sidebar border border-themed text-[10px] font-mono text-body overflow-x-auto whitespace-pre leading-relaxed">{JSON.stringify(selectedEvent, null, 2)}</pre>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Send Test Event Simulator Modal -->
{#if showSimulator}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
		<div class="card-surface w-full max-w-md overflow-hidden shadow-2xl border border-indigo-500/30">
			<div class="border-b border-themed px-5 py-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
						<Send size={13} />
					</span>
					<div>
						<h3 class="text-sm font-semibold text-heading">Event Dispatch Simulator</h3>
						<p class="text-[11px] text-label">Test your ingestion pipeline in real-time</p>
					</div>
				</div>
				<button
					onclick={() => (showSimulator = false)}
					class="text-label hover:text-heading transition-colors"
				>
					<X size={16} />
				</button>
			</div>

			<div class="p-5 flex flex-col gap-4 text-xs">
				<div>
					<label for="sim-event-type" class="block text-[11px] font-medium text-heading mb-1">Preset Event Type</label>
					<select id="sim-event-type" bind:value={simEventName} class="input-field w-full py-1.5 text-xs font-mono">
						<option value="outbound_click">outbound_click (Enhanced Measurement)</option>
						<option value="file_download">file_download (Enhanced Measurement)</option>
						<option value="search">search (Site Search)</option>
						<option value="form_submit">form_submit (Form Submission)</option>
						<option value="purchase">purchase (E-commerce Order)</option>
						<option value="signup_complete">signup_complete (Custom Conversion)</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="sim-prop-key" class="block text-[11px] font-medium text-heading mb-1">Custom Prop Key</label>
						<input
							id="sim-prop-key"
							type="text"
							bind:value={simCustomPropKey}
							placeholder="e.g. plan_type"
							class="input-field w-full py-1 text-xs font-mono"
						/>
					</div>
					<div>
						<label for="sim-prop-val" class="block text-[11px] font-medium text-heading mb-1">Custom Prop Value</label>
						<input
							id="sim-prop-val"
							type="text"
							bind:value={simCustomPropVal}
							placeholder="e.g. enterprise"
							class="input-field w-full py-1 text-xs font-mono"
						/>
					</div>
				</div>

				<div class="p-3 rounded bg-card-surface border border-themed text-[11px] text-label">
					This will dispatch a simulated telemetry payload with <code class="font-mono text-heading font-semibold">debug: "1"</code> directly to your collector endpoint.
				</div>

				{#if simSuccess}
					<div class="p-2.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
						<Check size={14} />
						<span>Event sent successfully! Updating stream...</span>
					</div>
				{/if}
			</div>

			<div class="border-t border-themed px-5 py-3 flex justify-end gap-2 bg-sidebar">
				<button
					onclick={() => (showSimulator = false)}
					class="btn-ghost px-3 py-1.5 text-xs rounded-md"
				>
					Cancel
				</button>
				<button
					onclick={triggerTestEvent}
					disabled={isSimulating}
					class="btn-primary px-3 py-1.5 text-xs rounded-md flex items-center gap-1.5"
				>
					<Send size={12} />
					<span>{isSimulating ? 'Sending...' : 'Dispatch Event'}</span>
				</button>
			</div>
		</div>
	</div>
{/if}
