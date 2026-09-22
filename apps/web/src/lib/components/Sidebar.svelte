<script lang="ts">
	import { page } from '$app/stores';
	import {
		LayoutDashboard,
		Activity,
		FileText,
		Compass,
		Globe,
		MonitorSmartphone,
		Target,
		Filter,
		Repeat,
		Settings,
		PanelLeftClose,
		PanelLeftOpen,
		Sparkles,
		Timer,
		Zap,
		BookOpen,
		Gauge,
		Megaphone
	} from '@lucide/svelte';

	let { collapsed = $bindable(false) }: { collapsed: boolean } = $props();

	const navItems = [
		{ label: 'Overview', href: '/', icon: LayoutDashboard },
		{ label: 'Realtime', href: '/realtime', icon: Activity, badge: 'Live' },
		{ label: 'Sessions', href: '/sessions', icon: Timer },
		{ label: 'Pages & Paths', href: '/pages', icon: FileText },
		{ label: 'Events', href: '/events', icon: Zap },
		{ label: 'Web Vitals', href: '/vitals', icon: Gauge },
		{ label: 'Ads & Viewability', href: '/ads', icon: Megaphone },
		{ label: 'Acquisition', href: '/sources', icon: Compass },
		{ label: 'Locations', href: '/locations', icon: Globe },
		{ label: 'Devices', href: '/devices', icon: MonitorSmartphone },
		{ label: 'Goals', href: '/goals', icon: Target },
		{ label: 'Funnels', href: '/funnels', icon: Filter },
		{ label: 'Retention', href: '/retention', icon: Repeat },
		{ label: 'Documentation', href: '/docs', icon: BookOpen },
		{ label: 'Settings', href: '/settings', icon: Settings }
	];

	function isActive(href: string, currentPath: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}
</script>

<aside
	class="relative flex flex-col border-r border-themed bg-sidebar transition-all duration-200 select-none z-30"
	class:w-[220px]={!collapsed}
	class:w-[60px]={collapsed}
>
	<!-- Brand Header -->
	<div class="flex h-13 items-center justify-between border-b border-themed px-3.5">
		<a href="/" class="flex items-center gap-2.5 overflow-hidden">
			<div class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-primary to-cyan-400 p-[1px] shadow-sm shadow-indigo-500/20">
				<div class="flex h-full w-full items-center justify-center rounded-[7px]" style="background: var(--logo-inner-bg);">
					<span class="font-mono text-xs font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-primary to-cyan-200">G</span>
				</div>
			</div>
			{#if !collapsed}
				<div class="flex items-center gap-1.5 min-w-0">
					<span class="text-sm font-semibold tracking-tight text-heading">Gravlytics</span>
					<span class="badge-tag rounded px-1 py-0.5 text-[9px] font-mono font-medium">v1.0</span>
				</div>
			{/if}
		</a>

		{#if !collapsed}
			<button
				onclick={() => (collapsed = true)}
				class="flex h-6 w-6 items-center justify-center rounded-md text-label transition-colors hover:bg-card-hover hover:text-heading"
				title="Collapse sidebar"
				aria-label="Collapse sidebar"
			>
				<PanelLeftClose size={14} strokeWidth={1.75} />
			</button>
		{/if}
	</div>

	<!-- Navigation Items -->
	<nav class="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto overflow-x-hidden">
		{#each navItems as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			{@const Icon = item.icon}
			<a
				href={item.href}
				class="group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 {active
					? 'bg-indigo-500/10 text-heading font-semibold border border-indigo-500/20'
					: 'text-label hover:bg-card-hover hover:text-body border border-transparent'}"
				class:justify-center={collapsed}
				title={collapsed ? item.label : undefined}
			>
				{#if active}
					<span class="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r bg-indigo-400"></span>
				{/if}

				<span class="shrink-0 transition-colors {active ? 'text-indigo-400' : 'text-label group-hover:text-body'}">
					<Icon size={16} strokeWidth={active ? 2 : 1.75} />
				</span>

				{#if !collapsed}
					<span class="truncate flex-1">{item.label}</span>
					{#if item.badge}
						<span class="relative flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-400 border border-emerald-500/25">
							<span class="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
							{item.badge}
						</span>
					{/if}
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Footer / Status -->
	<div class="border-t border-themed p-2">
		{#if collapsed}
			<button
				onclick={() => (collapsed = false)}
				class="flex h-8 w-full items-center justify-center rounded-md text-label transition-colors hover:bg-card-hover hover:text-heading"
				title="Expand sidebar"
				aria-label="Expand sidebar"
			>
				<PanelLeftOpen size={15} strokeWidth={1.75} />
			</button>
		{:else}
			<div class="flex items-center justify-between rounded-md bg-input border border-themed px-2.5 py-1.5">
				<div class="flex items-center gap-2">
					<span class="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse"></span>
					<div class="flex flex-col">
						<span class="text-[10px] font-medium text-body">Analytics Engine</span>
						<span class="text-[9px] text-hint">Operational • Realtime Sync</span>
					</div>
				</div>
				<Sparkles size={12} class="text-amber-400/80" />
			</div>
		{/if}
	</div>
</aside>
