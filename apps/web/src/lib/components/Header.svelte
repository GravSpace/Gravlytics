<script lang="ts">
	import {
		Download,
		LogOut,
		Sun,
		Moon,
		BookOpen,
		User,
		Sliders,
		Key,
		Users,
		ChevronDown
	} from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import SiteSwitcher from '$lib/components/SiteSwitcher.svelte';
	import CalendarPopover from '$lib/components/CalendarPopover.svelte';

	let { sidebarCollapsed = false }: { sidebarCollapsed: boolean } = $props();

	let isUserMenuOpen = $state(false);

	let user = $derived($page.data?.user || { name: 'Admin', email: 'admin@gravlytics.dev', role: 'admin' });
	let userInitials = $derived(
		user.name
			? user.name
					.split(' ')
					.map((n: string) => n[0])
					.join('')
					.toUpperCase()
					.slice(0, 2)
			: 'U'
	);

	onMount(() => {
		siteStore.loadSites();
	});

	function handleExport() {
		const data = [
			['Metric', 'Value'],
			['Site ID', siteStore.activeSiteId],
			['Export Date', new Date().toISOString()],
			['Date Range', dateStore.label],
			['From', dateStore.from],
			['To', dateStore.to]
		]
			.map((e) => e.join(','))
			.join('\n');
		const blob = new Blob([data], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `gravlytics_export_${dateStore.from}_${dateStore.to}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<header
	class="flex h-13 shrink-0 items-center justify-between border-b border-themed bg-header backdrop-blur-md px-5 z-20"
>
	<!-- Left section: Searchable Site Switcher + Live Badge -->
	<div class="flex items-center gap-3">
		<SiteSwitcher />

		<!-- Live status badge -->
		<div
			class="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20"
		>
			<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
			<span>Live Streaming</span>
		</div>
	</div>

	<!-- Right section: Shadcn/ui Datepicker + Controls -->
	<div class="flex items-center gap-2">
		<!-- Shadcn/ui Style Calendar Date Range Filter -->
		<CalendarPopover />

		<!-- Theme Toggle Button (Dark / Light) -->
		<button
			onclick={() => themeStore.toggle()}
			class="btn-ghost flex h-7 w-7 items-center justify-center rounded-md cursor-pointer"
			title="Toggle Theme (Dark / Light)"
			aria-label="Toggle Theme (Dark / Light)"
		>
			{#if themeStore.current === 'dark'}
				<Sun size={14} strokeWidth={1.75} class="text-amber-400" />
			{:else}
				<Moon size={14} strokeWidth={1.75} class="text-indigo-600" />
			{/if}
		</button>

		<!-- Docs Link Button -->
		<a
			href="/docs"
			class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium active:scale-[0.98] shadow-sm"
			title="Open Documentation & API Reference"
		>
			<BookOpen size={13} strokeWidth={1.75} class="text-indigo-400" />
			<span class="hidden md:inline">Docs</span>
		</a>

		<!-- Export Report Button -->
		<button
			onclick={handleExport}
			class="btn-ghost flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium active:scale-[0.98] shadow-sm cursor-pointer"
			title="Export report to CSV"
		>
			<Download size={13} strokeWidth={1.75} class="text-label" />
			<span class="hidden md:inline">Export</span>
		</button>

		<!-- User Avatar Menu -->
		<div class="relative ml-1">
			<button
				onclick={() => (isUserMenuOpen = !isUserMenuOpen)}
				class="flex items-center gap-1.5 p-1 rounded-full border border-themed bg-card hover:border-indigo-500/50 transition-all cursor-pointer shadow-sm group"
				aria-expanded={isUserMenuOpen}
				title="User Account & Settings"
			>
				<div class="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
					{userInitials}
				</div>
				<ChevronDown size={11} class="text-label group-hover:text-heading transition-transform duration-200 {isUserMenuOpen ? 'rotate-180' : ''} pr-0.5" />
			</button>

			{#if isUserMenuOpen}
				<!-- Backdrop -->
				<div
					class="fixed inset-0 z-40"
					onclick={() => (isUserMenuOpen = false)}
					role="presentation"
				></div>

				<!-- Menu Popover -->
				<div
					class="card-modal absolute right-0 top-full mt-2 w-56 p-1.5 z-50 flex flex-col rounded-xl border border-themed bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-100"
				>
					<!-- User Info Header -->
					<div class="p-2 border-b border-themed">
						<div class="flex items-center justify-between">
							<span class="text-xs font-semibold text-heading truncate">{user.name}</span>
							<span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
								{user.role || 'Member'}
							</span>
						</div>
						<span class="text-[11px] text-label truncate block mt-0.5">{user.email}</span>
					</div>

					<!-- Navigation Links -->
					<div class="py-1 flex flex-col gap-0.5">
						<a
							href="/settings/profile"
							onclick={() => (isUserMenuOpen = false)}
							class="flex items-center gap-2 px-2.5 py-1.5 text-xs text-label hover:text-heading hover:bg-card-hover rounded-md transition-colors"
						>
							<User size={13} class="text-indigo-400" />
							<span>Account Profile</span>
						</a>
						<a
							href="/settings"
							onclick={() => (isUserMenuOpen = false)}
							class="flex items-center gap-2 px-2.5 py-1.5 text-xs text-label hover:text-heading hover:bg-card-hover rounded-md transition-colors"
						>
							<Sliders size={13} class="text-slate-400" />
							<span>Workspace Settings</span>
						</a>
						<a
							href="/settings/team"
							onclick={() => (isUserMenuOpen = false)}
							class="flex items-center gap-2 px-2.5 py-1.5 text-xs text-label hover:text-heading hover:bg-card-hover rounded-md transition-colors"
						>
							<Users size={13} class="text-emerald-400" />
							<span>Team & Members</span>
						</a>
						<a
							href="/settings/api-keys"
							onclick={() => (isUserMenuOpen = false)}
							class="flex items-center gap-2 px-2.5 py-1.5 text-xs text-label hover:text-heading hover:bg-card-hover rounded-md transition-colors"
						>
							<Key size={13} class="text-amber-400" />
							<span>API Keys</span>
						</a>
					</div>

					<!-- Sign Out -->
					<div class="pt-1 border-t border-themed">
						<a
							href="/logout"
							class="flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors font-medium"
						>
							<LogOut size={13} />
							<span>Sign Out</span>
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>
</header>
