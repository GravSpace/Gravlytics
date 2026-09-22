<script lang="ts">
	import { Globe, ChevronDown, Check, Search, Plus, X } from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';

	let isOpen = $state(false);
	let searchQuery = $state('');

	let filteredSites = $derived(
		siteStore.sites.filter((s) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				s.domain.toLowerCase().includes(q) ||
				(s.name && s.name.toLowerCase().includes(q)) ||
				s.trackingId.toLowerCase().includes(q)
			);
		})
	);

	function selectSite(trackingId: string) {
		siteStore.setSite(trackingId);
		isOpen = false;
		searchQuery = '';
	}
</script>

<div class="relative">
	<!-- Trigger Button -->
	<button
		onclick={() => (isOpen = !isOpen)}
		class="btn-ghost flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold outline-none shadow-sm cursor-pointer hover:border-themed-strong transition-all"
		title="Select website"
		aria-expanded={isOpen}
	>
		<Globe size={13} class="text-indigo-400 shrink-0" />
		<span class="max-w-[140px] sm:max-w-[200px] truncate text-heading font-medium">
			{siteStore.currentSite?.domain || 'Select Site'}
		</span>
		<ChevronDown size={12} class="text-label shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" />
	</button>

	{#if isOpen}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-40"
			onclick={() => {
				isOpen = false;
				searchQuery = '';
			}}
			role="presentation"
		></div>

		<!-- Dropdown Popover -->
		<div
			class="card-modal absolute left-0 top-full mt-2 w-72 sm:w-80 p-2 z-50 flex flex-col gap-2 shadow-xl animate-in fade-in zoom-in-95 duration-100"
		>
			<!-- Search Bar -->
			<div class="relative flex items-center px-1">
				<Search size={13} class="absolute left-3 text-label pointer-events-none" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search domain or site name..."
					class="w-full pl-8 pr-7 py-1.5 text-xs rounded-md bg-canvas border border-themed text-heading placeholder:text-label outline-none focus:border-indigo-500 transition-colors"
				/>
				{#if searchQuery}
					<button
						onclick={() => (searchQuery = '')}
						class="absolute right-3 text-label hover:text-heading cursor-pointer"
					>
						<X size={12} />
					</button>
				{/if}
			</div>

			<!-- Sites List -->
			<div class="max-h-60 overflow-y-auto divide-y divide-themed px-1">
				{#if filteredSites.length > 0}
					{#each filteredSites as site}
						{@const isSelected = siteStore.activeSiteId === site.trackingId}
						<button
							onclick={() => selectSite(site.trackingId)}
							class="w-full flex items-center justify-between p-2 rounded-md text-left transition-colors cursor-pointer group {isSelected
								? 'bg-indigo-500/10 text-heading font-semibold'
								: 'hover:bg-card-hover text-label hover:text-heading'}"
						>
							<div class="min-w-0 flex-1 pr-2">
								<div class="flex items-center gap-1.5">
									<span class="text-xs font-medium text-heading truncate">{site.domain}</span>
									{#if isSelected}
										<span class="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
									{/if}
								</div>
								<div class="flex items-center gap-2 mt-0.5">
									{#if site.name && site.name !== site.domain}
										<span class="text-[11px] text-label truncate">{site.name}</span>
										<span class="text-[10px] text-label">&bull;</span>
									{/if}
									<span class="text-[10px] font-mono text-label">{site.trackingId}</span>
								</div>
							</div>

							{#if isSelected}
								<Check size={14} class="text-indigo-400 shrink-0" />
							{/if}
						</button>
					{/each}
				{:else}
					<div class="py-6 text-center text-xs text-label flex flex-col items-center gap-2">
						{#if siteStore.sites.length === 0}
							<span>No websites added yet.</span>
							<a
								href="/settings/sites"
								onclick={() => (isOpen = false)}
								class="inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-indigo-500 transition-colors"
							>
								<Plus size={11} />
								<span>Add Website</span>
							</a>
						{:else}
							<span>No sites matching "{searchQuery}"</span>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer Action -->
			<div class="pt-2 border-t border-themed px-1 flex items-center justify-between text-[11px]">
				<span class="text-label">{siteStore.sites.length} total sites</span>
				<a
					href="/settings/sites"
					onclick={() => (isOpen = false)}
					class="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
				>
					<Plus size={11} />
					<span>Manage / Add Sites</span>
				</a>
			</div>
		</div>
	{/if}
</div>
