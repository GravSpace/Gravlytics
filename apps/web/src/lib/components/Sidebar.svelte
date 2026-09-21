<script lang="ts">
	let { collapsed = $bindable(false) }: { collapsed: boolean } = $props();

	const navItems = [
		{ label: 'Overview', href: '/', icon: 'chart' },
		{ label: 'Realtime', href: '/realtime', icon: 'pulse' },
		{ label: 'Pages', href: '/pages', icon: 'page' },
		{ label: 'Sources', href: '/sources', icon: 'link' },
		{ label: 'Locations', href: '/locations', icon: 'globe' },
		{ label: 'Devices', href: '/devices', icon: 'device' },
		{ label: 'Goals', href: '/goals', icon: 'target' },
		{ label: 'Funnels', href: '/funnels', icon: 'funnel' },
		{ label: 'Retention', href: '/retention', icon: 'retention' },
		{ label: 'Settings', href: '/settings', icon: 'gear' }
	];

	const icons: Record<string, string> = {
		chart: '📊',
		pulse: '⚡',
		page: '📄',
		link: '🔗',
		globe: '🌍',
		device: '💻',
		target: '🎯',
		funnel: '🔻',
		retention: '🔄',
		gear: '⚙️'
	};
</script>

<aside
	class="flex flex-col border-r border-ink-border bg-ink-light transition-all duration-300"
	class:w-[240px]={!collapsed}
	class:w-[64px]={collapsed}
>
	<!-- Logo -->
	<div class="flex h-14 items-center gap-3 border-b border-ink-border px-4">
		<div class="gradient-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
			<span class="text-sm font-bold text-white">G</span>
		</div>
		{#if !collapsed}
			<span class="gradient-accent-text text-lg font-bold tracking-tight">Gravlytics</span>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="mt-4 flex flex-1 flex-col gap-1 px-2">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-light transition-colors hover:bg-ink-lighter hover:text-white"
				class:justify-center={collapsed}
			>
				<span class="text-base">{icons[item.icon]}</span>
				{#if !collapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Collapse toggle -->
	<button
		onclick={() => (collapsed = !collapsed)}
		aria-label="Toggle sidebar"
		class="m-2 flex items-center justify-center rounded-lg p-2 text-muted-light transition-colors hover:bg-ink-lighter hover:text-white"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			class="h-5 w-5 transition-transform"
			class:rotate-180={collapsed}
		>
			<path
				fill-rule="evenodd"
				d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>
</aside>
