<script lang="ts">
	import { User, Sliders, Globe, Users, Key, Plus, Code2, Copy, Check, Trash2, X, Share2, ExternalLink, Lock, Shield, Download } from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { siteStore } from '$lib/stores/site.svelte';

	interface SiteItem {
		id: string;
		domain: string;
		name: string;
		trackingId: string;
		timezone: string;
		isPublic?: boolean;
		hasPassword?: boolean;
		createdAt: string;
	}

	let sites = $state<SiteItem[]>([]);
	let isLoading = $state(true);

	let showAddModal = $state(false);
	let selectedSnippetSite = $state<{ name: string; trackingId: string } | null>(null);
	let selectedShareSite = $state<SiteItem | null>(null);
	let selectedExportSite = $state<SiteItem | null>(null);
	let exportFormat = $state<'csv' | 'json'>('csv');
	let exportRange = $state('30d');
	let shareIsPublic = $state(false);
	let sharePassword = $state('');
	let shareSaving = $state(false);
	let shareCopied = $state(false);

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

	function openShareModal(site: SiteItem) {
		selectedShareSite = site;
		shareIsPublic = Boolean(site.isPublic);
		sharePassword = '';
	}

	async function handleSaveShare() {
		if (!selectedShareSite) return;
		shareSaving = true;
		try {
			const res = await fetch('/api/sites/share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: selectedShareSite.id,
					isPublic: shareIsPublic,
					password: sharePassword.trim() || undefined
				})
			});
			if (res.ok) {
				await loadSites();
				selectedShareSite = null;
			}
		} catch (err) {
			console.error('Failed to update sharing', err);
		} finally {
			shareSaving = false;
		}
	}

	function copyShareUrl(trackingId: string) {
		const url = `${window.location.origin}/share/${trackingId}`;
		navigator.clipboard.writeText(url);
		shareCopied = true;
		setTimeout(() => (shareCopied = false), 2000);
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
		<a href="/settings/alerts" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Shield size={13} />
			<span>Alerts</span>
		</a>
		<a href="/settings/audit" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Lock size={13} />
			<span>Audit Log</span>
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
						<div class="flex items-center gap-2">
							<h3 class="text-xs font-semibold text-heading">{site.name}</h3>
							{#if site.isPublic}
								<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
									Public
									{#if site.hasPassword}
										<Lock size={9} />
									{/if}
								</span>
							{:else}
								<span class="inline-flex items-center rounded-full bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-500/20">
									Private
								</span>
							{/if}
						</div>
						<p class="font-mono text-[11px] text-label">{site.domain}</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<div class="hidden sm:flex flex-col items-end mr-2">
						<span class="text-[11px] font-mono text-body">ID: {site.trackingId}</span>
					</div>

					<button
						onclick={() => openShareModal(site)}
						class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-card-hover hover:text-heading transition-colors"
						title="Public Sharing"
					>
						<Share2 size={13} />
						<span class="hidden md:inline">Share</span>
					</button>

					<button
						type="button"
						onclick={() => (selectedExportSite = site)}
						class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-card-hover hover:text-heading transition-colors"
						title="Export Telemetry Data"
					>
						<Download size={13} />
						<span class="hidden md:inline">Export</span>
					</button>

					<button
						onclick={() => (selectedSnippetSite = site)}
						class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-card-hover hover:text-heading transition-colors"
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

	<!-- Public Share Modal -->
	{#if selectedShareSite}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-lg card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Share2 size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Public Sharing — {selectedShareSite.name}</h2>
					</div>
					<button onclick={() => (selectedShareSite = null)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<div class="flex flex-col gap-4">
					<p class="text-xs text-label">
						Allow anyone with the link to view this site's analytics dashboard in a secure, read-only view. No login required.
					</p>

					<!-- Toggle Switch -->
					<div class="flex items-center justify-between p-3 rounded-lg border border-themed bg-card">
						<div class="flex flex-col">
							<span class="text-xs font-semibold text-heading">Enable Public Dashboard</span>
							<span class="text-[11px] text-hint">Anyone with the URL can view metrics</span>
						</div>
						<button
							type="button"
							onclick={() => (shareIsPublic = !shareIsPublic)}
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {shareIsPublic ? 'bg-indigo-600' : 'bg-slate-700'}"
							role="switch"
							aria-checked={shareIsPublic}
						>
							<span class="sr-only">Enable public dashboard</span>
							<span
								class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out {shareIsPublic ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</button>
					</div>

					{#if shareIsPublic}
						<!-- Share URL Box -->
						<div class="flex flex-col gap-1.5">
							<label for="share-public-link" class="text-[11px] font-medium text-body">Public Link</label>
							<div class="flex items-center gap-2">
								<input
									id="share-public-link"
									readonly
									type="text"
									value="{typeof window !== 'undefined' ? window.location.origin : ''}/share/{selectedShareSite.trackingId}"
									class="w-full rounded-md input-field px-3 py-1.5 text-xs font-mono select-all bg-card"
								/>
								<button
									type="button"
									onclick={() => copyShareUrl(selectedShareSite?.trackingId || '')}
									class="flex items-center gap-1 shrink-0 rounded-md border border-themed bg-input px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-card-hover hover:text-heading transition-colors"
								>
									{#if shareCopied}
										<Check size={13} class="text-emerald-400" />
										<span>Copied</span>
									{:else}
										<Copy size={13} />
										<span>Copy</span>
									{/if}
								</button>
								<a
									href="/share/{selectedShareSite.trackingId}"
									target="_blank"
									rel="noreferrer"
									class="flex items-center gap-1 shrink-0 rounded-md border border-themed bg-input px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-card-hover hover:text-heading transition-colors"
									title="Open in new tab"
								>
									<ExternalLink size={13} />
								</a>
							</div>
						</div>

						<!-- Password Protection Field -->
						<div class="flex flex-col gap-1.5">
							<label for="share-pass" class="flex items-center justify-between text-[11px] font-medium text-body">
								<span class="flex items-center gap-1"><Lock size={12} /> Password Protect (Optional)</span>
								{#if selectedShareSite.hasPassword}
									<span class="text-[10px] text-emerald-400">Password is currently active</span>
								{/if}
							</label>
							<input
								id="share-pass"
								type="password"
								bind:value={sharePassword}
								placeholder={selectedShareSite.hasPassword ? 'Enter new password to change, or leave blank to keep' : 'Optional password (e.g. secret123)'}
								class="w-full rounded-md input-field px-3 py-1.5 text-xs"
							/>
							<p class="text-[10px] text-hint">Leave blank to retain current password or leave unprotected.</p>
						</div>
					{/if}
				</div>

				<div class="mt-2 flex items-center justify-end gap-2 border-t border-themed pt-3">
					<button
						onclick={() => (selectedShareSite = null)}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-heading"
					>
						Cancel
					</button>
					<button
						onclick={handleSaveShare}
						disabled={shareSaving}
						class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
					>
						<span>{shareSaving ? 'Saving...' : 'Save Settings'}</span>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Export Data Modal -->
	{#if selectedExportSite}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-md card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Download size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Export Data — {selectedExportSite.name}</h2>
					</div>
					<button type="button" onclick={() => (selectedExportSite = null)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<p class="text-xs text-label">
					Export raw telemetry summaries, timeseries data, top paths, referrers, and country demographics.
				</p>

				<div class="flex flex-col gap-3">
					<div>
						<span class="mb-1.5 block text-[11px] font-medium text-body">Export Format</span>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								onclick={() => (exportFormat = 'csv')}
								class="rounded-md border p-2 text-xs font-medium text-center transition-colors {exportFormat === 'csv' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-themed bg-input text-label hover:text-heading'}"
							>
								CSV (Spreadsheet)
							</button>
							<button
								type="button"
								onclick={() => (exportFormat = 'json')}
								class="rounded-md border p-2 text-xs font-medium text-center transition-colors {exportFormat === 'json' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-themed bg-input text-label hover:text-heading'}"
							>
								JSON (Raw Objects)
							</button>
						</div>
					</div>

					<div>
						<label for="export-range" class="mb-1.5 block text-[11px] font-medium text-body">Time Range</label>
						<select id="export-range" bind:value={exportRange} class="w-full rounded-md input-field px-2.5 py-1.5 text-xs">
							<option value="today">Today</option>
							<option value="7d">Last 7 Days</option>
							<option value="30d">Last 30 Days</option>
							<option value="90d">Last 90 Days</option>
						</select>
					</div>
				</div>

				<div class="mt-2 flex items-center justify-end gap-2 border-t border-themed pt-3">
					<button
						type="button"
						onclick={() => (selectedExportSite = null)}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-heading"
					>
						Cancel
					</button>
					<a
						href="/api/export?siteId={selectedExportSite.trackingId}&format={exportFormat}&range={exportRange}"
						download
						onclick={() => (selectedExportSite = null)}
						class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
					>
						<Download size={13} />
						<span>Download {exportFormat.toUpperCase()}</span>
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
