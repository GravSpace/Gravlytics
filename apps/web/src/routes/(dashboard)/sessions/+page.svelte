<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Timer,
		Users,
		Clock,
		ArrowRight,
		Globe,
		Laptop,
		Smartphone,
		RefreshCw,
		ChevronDown,
		ChevronUp,
		FileText,
		Zap,
		ExternalLink
	} from '@lucide/svelte';
	import KPICard from '$lib/components/KPICard.svelte';
	import {
		fetchSessions,
		formatCountryName,
		type SessionsResponse,
		type SessionItem
	} from '$lib/api';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let data = $state<SessionsResponse | null>(null);
	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let expandedSessionId = $state<string | null>(null);

	function formatDuration(sec: number): string {
		if (sec < 60) return `${Math.round(sec)}s`;
		const m = Math.floor(sec / 60);
		const s = Math.round(sec % 60);
		return s > 0 ? `${m}m ${s}s` : `${m}m`;
	}

	function formatTimeAgo(dateStr: string): string {
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return dateStr;
			const diff = Math.floor((Date.now() - d.getTime()) / 1000);
			if (diff < 60) return 'Just now';
			if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
			if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
			return d.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
		} catch {
			return dateStr;
		}
	}

	async function loadData() {
		try {
			const current = siteStore.activeSiteId;
			if (!current) return;
			const res = await fetchSessions(current, dateStore.from, dateStore.to, 30);
			data = res;
		} catch (err) {
			console.error('Failed to load sessions', err);
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	function toggleExpand(id: string) {
		expandedSessionId = expandedSessionId === id ? null : id;
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
		}, 15000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Sessions & Journeys — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
		<div>
			<h1 class="text-lg font-bold tracking-tight text-heading flex items-center gap-2">
				<Timer size={18} class="text-indigo-400" />
				Sessions & Journeys
			</h1>
			<p class="text-xs text-label">
				Session-level telemetry, duration distributions, and complete visitor interaction flows.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => {
					isRefreshing = true;
					loadData();
				}}
				class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
				title="Refresh session data"
			>
				<RefreshCw size={13} class={isRefreshing ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
		<KPICard
			label="Total Sessions"
			value={data?.overview?.total_sessions?.toLocaleString() ?? '0'}
			icon={Timer}
			subtitle="Unique session identifiers"
		/>
		<KPICard
			label="Unique Visitors"
			value={data?.overview?.unique_visitors?.toLocaleString() ?? '0'}
			icon={Users}
			subtitle="Cookieless daily visitors"
		/>
		<KPICard
			label="Avg Duration"
			value={formatDuration(data?.overview?.avg_duration_sec ?? 0)}
			icon={Clock}
			subtitle="Active session time"
		/>
		<KPICard
			label="Pages / Session"
			value={(data?.overview?.pages_per_session ?? 0).toFixed(1)}
			icon={FileText}
			subtitle="Navigation depth"
		/>
		<KPICard
			label="Bounce Rate"
			value={`${(data?.overview?.bounce_rate ?? 0).toFixed(1)}%`}
			icon={ArrowRight}
			subtitle="Single-action sessions"
		/>
	</div>

	<!-- Duration Distribution -->
	<div class="card-surface p-4">
		<div class="mb-3 flex items-center justify-between">
			<div>
				<h2 class="text-xs font-semibold text-heading tracking-wide uppercase">Session Duration Distribution</h2>
				<p class="text-[11px] text-label">Bucketed engagement time per session</p>
			</div>
			<span class="text-[11px] font-mono text-label">
				{data?.overview?.total_sessions ?? 0} total sessions
			</span>
		</div>

		{#if data?.duration_buckets && data.duration_buckets.length > 0}
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
				{#each data.duration_buckets as b}
					<div class="rounded-md border border-themed bg-input p-2.5 flex flex-col justify-between">
						<div class="flex items-center justify-between mb-1.5">
							<span class="text-xs font-mono font-medium text-body">{b.bucket}</span>
							<span class="text-[10px] font-mono text-indigo-400 font-semibold">{b.percentage.toFixed(0)}%</span>
						</div>
						<div class="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style="background: var(--divider-strong);">
							<div
								class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
								style="width: {Math.max(b.percentage, 2)}%"
							></div>
						</div>
						<span class="text-[11px] font-mono text-label">{b.sessions} sessions</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="py-6 text-center text-xs text-hint">No session duration data recorded yet</div>
		{/if}
	</div>

	<!-- Recent Sessions Explorer -->
	<div class="card-surface overflow-hidden">
		<div class="border-b border-themed px-4 py-3 flex items-center justify-between">
			<div>
				<h2 class="text-xs font-semibold text-heading tracking-wide uppercase">Recent Sessions Explorer</h2>
				<p class="text-[11px] text-label">Click any session row to inspect the visitor's complete click & pageview journey</p>
			</div>
			<div class="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
				<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
				Live Telemetry
			</div>
		</div>

		{#if isLoading}
			<div class="py-12 text-center text-xs text-hint">Loading sessions...</div>
		{:else if !data?.recent_sessions || data.recent_sessions.length === 0}
			<div class="py-12 text-center text-xs text-hint">
				No sessions captured yet. Visit your tracked site or send an event to see live sessions.
			</div>
		{:else}
			<div class="flex flex-col" style="border-color: var(--divider);">
				{#each data.recent_sessions as s, idx (s.session_id)}
					{@const isExpanded = expandedSessionId === s.session_id}
					<div class="transition-colors hover:bg-card-hover" style="border-top: {idx > 0 ? '1px solid var(--divider)' : 'none'};">
						<!-- Summary Row -->
						<div
							role="button"
							tabindex="0"
							onclick={() => toggleExpand(s.session_id)}
							onkeydown={(e) => { if (e.key === 'Enter') toggleExpand(s.session_id); }}
							class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 cursor-pointer select-none"
						>
							<div class="flex items-center gap-3 min-w-0">
								<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
									{#if s.device_type === 'mobile'}
										<Smartphone size={15} />
									{:else}
										<Laptop size={15} />
									{/if}
								</div>

								<div class="flex flex-col min-w-0">
									<div class="flex items-center gap-2">
										<span class="font-mono text-xs font-semibold text-heading">#{s.session_id.substring(0, 8)}</span>
										<span class="badge-tag rounded px-1.5 py-0.5 text-[10px] font-mono text-body">
											{formatDuration(s.duration_sec)}
										</span>
										<span class="rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
											{s.events_count} {s.events_count === 1 ? 'event' : 'events'}
										</span>
									</div>
									<div class="flex items-center gap-2 mt-0.5 text-[11px] text-label">
										<span>{formatCountryName(s.country || 'US')}</span>
										{#if s.city && s.city !== 'Unknown'}
											<span>• {s.city}</span>
										{/if}
										<span>• {s.browser} on {s.os}</span>
									</div>
								</div>
							</div>

							<div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
								<!-- Path Flow: Entry -> Exit -->
								<div class="flex items-center gap-1.5 text-xs font-mono text-body max-w-[280px] truncate">
									<span class="truncate px-1.5 py-0.5 rounded badge-tag" title={s.entry_path}>
										{s.entry_path || '/'}
									</span>
									{#if s.exit_path && s.exit_path !== s.entry_path}
										<ArrowRight size={11} class="text-hint shrink-0" />
										<span class="truncate px-1.5 py-0.5 rounded badge-tag" title={s.exit_path}>
											{s.exit_path}
										</span>
									{/if}
								</div>

								<div class="flex items-center gap-2">
									<span class="text-[11px] text-label font-mono">{formatTimeAgo(s.started_at)}</span>
									<button
										class="flex h-6 w-6 items-center justify-center rounded text-label hover:text-heading"
										aria-label="Expand journey"
									>
										{#if isExpanded}
											<ChevronUp size={14} />
										{:else}
											<ChevronDown size={14} />
										{/if}
									</button>
								</div>
							</div>
						</div>

						<!-- Expanded Journey Drawer -->
						{#if isExpanded}
							<div class="border-t border-themed px-4 py-3 pl-14" style="background: var(--input-bg);">
								<h3 class="text-[10px] font-mono uppercase tracking-wider text-label mb-2">
									Session Journey Timeline ({s.events?.length ?? 0} actions)
								</h3>

								{#if s.events && s.events.length > 0}
									<div class="relative flex flex-col gap-2 pl-4 border-l border-themed">
										{#each s.events as ev, i}
											<div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
												<span class="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full {ev.event_name === 'pageview' ? 'bg-indigo-400' : 'bg-emerald-400'}" style="box-shadow: 0 0 0 4px var(--card-bg-solid);"></span>
												<div class="flex items-center gap-2 flex-wrap min-w-0">
													<span class="font-mono text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded {ev.event_name === 'pageview' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'}">
														{ev.event_name}
													</span>
													<span class="font-mono text-body truncate">{ev.url_path}</span>

													{#if ev.props && Object.keys(ev.props).length > 0}
														<div class="flex items-center gap-1 flex-wrap">
															{#each Object.entries(ev.props) as [k, v]}
																<span class="inline-flex items-center gap-1 rounded badge-tag px-1.5 py-0.5 text-[9px] font-mono text-body">
																	<span class="text-hint">{k}:</span>
																	<span class="text-amber-400">{v}</span>
																</span>
															{/each}
														</div>
													{/if}
												</div>

												<span class="text-[10px] font-mono text-label shrink-0">
													{new Date(ev.timestamp).toLocaleTimeString()}
												</span>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-xs text-hint italic">No granular journey steps captured for this session.</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
