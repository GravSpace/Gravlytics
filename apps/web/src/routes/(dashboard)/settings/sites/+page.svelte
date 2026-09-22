<script lang="ts">
	import { User, Sliders, Globe, Users, Key, Plus, Code2, Copy, Check, Trash2, X } from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { siteStore } from '$lib/stores/site.svelte';

	interface SiteItem {
		id: string;
		domain: string;
		name: string;
		trackingId: string;
		timezone: string;
		createdAt: string;
	}

	let sites = $state<SiteItem[]>([]);
	let isLoading = $state(true);

	let showAddModal = $state(false);
	let selectedSnippetSite = $state<{ name: string; trackingId: string } | null>(null);

	let newDomain = $state('');
	let newName = $state('');
	let copied = $state(false);

	async function loadSites() {
		try {
			const res = await fetch('/api/sites');
			if (res.ok) {
				sites = await res.json();
				await siteStore.loadSites();
			}
		} catch (err) {
			console.error('Failed to load sites', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleAddSite() {
		if (!newDomain) return;
		try {
			const res = await fetch('/api/sites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ domain: newDomain, name: newName || newDomain })
			});
			if (res.ok) {
				newDomain = '';
				newName = '';
				showAddModal = false;
				await loadSites();
			}
		} catch (err) {
			console.error('Failed to create site', err);
		}
	}

	async function handleDelete(siteId: string) {
		try {
			await fetch(`/api/sites?id=${siteId}`, { method: 'DELETE' });
			await loadSites();
		} catch (err) {
			console.error('Failed to delete site', err);
		}
	}

	onMount(() => {
		loadSites();
	});

	function copySnippet(trackingId: string) {
		const snippet = `<script defer data-site-id="${trackingId}" src="https://analytics.yourdomain.com/gravlytics.js"><\/script>`;
		navigator.clipboard.writeText(snippet);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>Sites & Properties — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4 max-w-4xl">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Sites & Domains</h1>
			<p class="text-xs text-label">Manage registered web properties and copy telemetry snippets</p>
		</div>
		<button
			onclick={() => (showAddModal = true)}
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-[0.98]"
		>
			<Plus size={14} strokeWidth={2} />
			<span>Add Site</span>
		</button>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-1.5 border-b border-themed pb-2 text-xs overflow-x-auto no-scrollbar">
		<a href="/settings/profile" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<User size={13} />
			<span>Profile</span>
		</a>
		<a href="/settings" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Sliders size={13} />
			<span>General</span>
		</a>
		<a href="/settings/sites" class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white shadow-sm whitespace-nowrap shrink-0">
			<Globe size={13} />
			<span>Sites</span>
		</a>
		<a href="/settings/team" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Users size={13} />
			<span>Team</span>
		</a>
		<a href="/settings/api-keys" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Key size={13} />
			<span>API Keys</span>
		</a>
	</div>

	<!-- Sites List -->
	<div class="flex flex-col gap-2">
		{#each sites as site}
			<div class="flex items-center justify-between card p-3.5 px-4 transition-colors hover:border-indigo-500/30">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
						<Globe size={16} strokeWidth={1.75} />
					</div>
					<div>
						<h3 class="text-xs font-semibold text-heading">{site.name}</h3>
						<p class="font-mono text-[11px] text-label">{site.domain}</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<div class="hidden sm:flex flex-col items-end mr-2">
						<span class="text-[11px] font-mono text-body">Site ID: {site.trackingId}</span>
						<span class="text-[10px] text-hint">Created {site.createdAt}</span>
					</div>

					<button
						onclick={() => (selectedSnippetSite = site)}
						class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-input hover:text-gray-400 transition-colors"
						title="Get Tracker Code"
					>
						<Code2 size={13} />
						<span class="hidden md:inline">Snippet</span>
					</button>

					<button
						onclick={() => handleDelete(site.id)}
						class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/10 hover:text-rose-400 transition-colors"
						title="Delete Site"
						aria-label="Delete Site"
					>
						<Trash2 size={13} strokeWidth={1.75} />
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Add Site Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-md card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Globe size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Register New Domain</h2>
					</div>
					<button onclick={() => (showAddModal = false)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="domain" class="mb-1 block text-[11px] font-medium text-body">Domain / Hostname</label>
						<input
							id="domain"
							type="text"
							bind:value={newDomain}
							placeholder="e.g. yoursite.com"
							class="w-full rounded-md input-field px-3 py-1.5 text-xs"
						/>
					</div>

					<div>
						<label for="name" class="mb-1 block text-[11px] font-medium text-body">Site Display Name (Optional)</label>
						<input
							id="name"
							type="text"
							bind:value={newName}
							placeholder="e.g. My SaaS Landing"
							class="w-full rounded-md input-field px-3 py-1.5 text-xs"
						/>
					</div>
				</div>

				<div class="mt-2 flex justify-end gap-2 border-t border-themed pt-3">
					<button
						onclick={() => (showAddModal = false)}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-heading"
					>
						Cancel
					</button>
					<button
						onclick={handleAddSite}
						class="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
					>
						Add Site
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Snippet Modal -->
	{#if selectedSnippetSite}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-lg card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Code2 size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Embed Script for {selectedSnippetSite.name}</h2>
					</div>
					<button onclick={() => (selectedSnippetSite = null)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<p class="text-xs text-label">
					Place this lightweight snippet inside the <code class="text-indigo-300">&lt;head&gt;</code> tag of your website:
				</p>

				<pre class="overflow-x-auto rounded-lg border border-themed bg-code p-3 font-mono text-[11px] text-cyan-500 select-all">
&lt;script defer data-site-id="{selectedSnippetSite.trackingId}" src="http://localhost:8081/gravlytics.js"&gt;&lt;/script&gt;</pre>

				<div class="flex items-center justify-between border-t border-themed pt-3">
					<span class="text-[11px] text-hint">&lt; 1 KB footprint • Cookieless</span>
					<button
						onclick={() => copySnippet(selectedSnippetSite?.trackingId || '')}
						class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
					>
						{#if copied}
							<Check size={14} />
							<span>Copied!</span>
						{:else}
							<Copy size={14} />
							<span>Copy Snippet</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
