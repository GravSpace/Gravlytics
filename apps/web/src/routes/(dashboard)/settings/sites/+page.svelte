<script lang="ts">
	import {
		User,
		Sliders,
		Globe,
		Users,
		Key,
		Plus,
		Code2,
		Copy,
		Check,
		Trash2,
		X,
		Share2,
		ExternalLink,
		Lock,
		Shield,
		Download
	} from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import SettingsTabs from '$lib/components/SettingsTabs.svelte';

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

<div class="flex max-w-4xl flex-col gap-4">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
		<div class="flex flex-col">
			<h1 class="text-heading text-lg font-bold tracking-tight">Sites & Domains</h1>
			<p class="text-label text-xs">Manage registered web properties and copy telemetry snippets</p>
		</div>
		<button
			onclick={() => (showAddModal = true)}
			class="flex items-center gap-1.5 self-start rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover active:scale-[0.98] sm:self-auto"
		>
			<Plus size={14} strokeWidth={2} />
			<span>Add Site</span>
		</button>
	</div>

	<!-- Navigation Tabs -->
	<SettingsTabs />

	<!-- Sites List -->
	<div class="flex flex-col gap-2">
		{#each sites as site}
			<div
				class="card flex items-center justify-between p-3.5 px-4 transition-colors hover:border-primary/40"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"
					>
						<Globe size={16} strokeWidth={1.75} />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-heading text-xs font-semibold">{site.name}</h3>
							{#if site.isPublic}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
								>
									Public
									{#if site.hasPassword}
										<Lock size={9} />
									{/if}
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full border border-slate-500/20 bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
								>
									Private
								</span>
							{/if}
						</div>
						<p class="text-label font-mono text-[11px]">{site.domain}</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<div class="mr-2 hidden flex-col items-end sm:flex">
						<span class="text-body font-mono text-[11px]">ID: {site.trackingId}</span>
					</div>

					<button
						onclick={() => openShareModal(site)}
						class="border-themed bg-input hover:bg-card-hover hover:text-heading flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors"
						title="Public Sharing"
					>
						<Share2 size={13} />
						<span class="hidden md:inline">Share</span>
					</button>

					<button
						type="button"
						onclick={() => (selectedExportSite = site)}
						class="border-themed bg-input hover:bg-card-hover hover:text-heading flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors"
						title="Export Telemetry Data"
					>
						<Download size={13} />
						<span class="hidden md:inline">Export</span>
					</button>

					<button
						onclick={() => (selectedSnippetSite = site)}
						class="border-themed bg-input hover:bg-card-hover hover:text-heading flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors"
						title="Get Tracker Code"
					>
						<Code2 size={13} />
						<span class="hidden md:inline">Snippet</span>
					</button>

					<button
						onclick={() => handleDelete(site.id)}
						class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-500/10 hover:text-rose-400"
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
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		>
			<div class="card-modal flex w-full max-w-md flex-col gap-4 p-5">
				<div class="border-themed flex items-center justify-between border-b pb-3">
					<div class="flex items-center gap-2">
						<Globe size={16} class="text-indigo-400" />
						<h2 class="text-heading text-sm font-bold">Register New Domain</h2>
					</div>
					<button
						onclick={() => (showAddModal = false)}
						class="hover:text-heading text-slate-400"
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="domain" class="text-body mb-1 block text-[11px] font-medium"
							>Domain / Hostname</label
						>
						<input
							id="domain"
							type="text"
							bind:value={newDomain}
							placeholder="e.g. yoursite.com"
							class="input-field w-full rounded-md px-3 py-1.5 text-xs"
						/>
					</div>

					<div>
						<label for="name" class="text-body mb-1 block text-[11px] font-medium"
							>Site Display Name (Optional)</label
						>
						<input
							id="name"
							type="text"
							bind:value={newName}
							placeholder="e.g. My SaaS Landing"
							class="input-field w-full rounded-md px-3 py-1.5 text-xs"
						/>
					</div>
				</div>

				<div class="border-themed mt-2 flex justify-end gap-2 border-t pt-3">
					<button
						onclick={() => (showAddModal = false)}
						class="hover:text-heading rounded-md px-3 py-1.5 text-xs font-medium text-slate-400"
					>
						Cancel
					</button>
					<button
						onclick={handleAddSite}
						class="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
					>
						Add Site
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Snippet Modal -->
	{#if selectedSnippetSite}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		>
			<div class="card-modal flex w-full max-w-lg flex-col gap-4 p-5">
				<div class="border-themed flex items-center justify-between border-b pb-3">
					<div class="flex items-center gap-2">
						<Code2 size={16} class="text-indigo-400" />
						<h2 class="text-heading text-sm font-bold">
							Embed Script for {selectedSnippetSite.name}
						</h2>
					</div>
					<button
						onclick={() => (selectedSnippetSite = null)}
						class="hover:text-heading text-slate-400"
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				<p class="text-label text-xs">
					Place this lightweight snippet inside the <code class="text-primary font-semibold">&lt;head&gt;</code
					> tag of your website:
				</p>

				<pre
					class="border-themed bg-code overflow-x-auto rounded-lg border p-3 font-mono text-[11px] text-sky-600 dark:text-sky-400 select-all font-semibold">
&lt;script defer data-site-id="{selectedSnippetSite.trackingId}" src="http://localhost:8081/gravlytics.js"&gt;&lt;/script&gt;</pre>

				<div class="border-themed flex items-center justify-between border-t pt-3">
					<span class="text-hint text-[11px]">&lt; 1 KB footprint • Cookieless</span>
					<button
						onclick={() => copySnippet(selectedSnippetSite?.trackingId || '')}
						class="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
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
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		>
			<div class="card-modal flex w-full max-w-lg flex-col gap-4 p-5">
				<div class="border-themed flex items-center justify-between border-b pb-3">
					<div class="flex items-center gap-2">
						<Share2 size={16} class="text-indigo-400" />
						<h2 class="text-heading text-sm font-bold">
							Public Sharing — {selectedShareSite.name}
						</h2>
					</div>
					<button
						onclick={() => (selectedShareSite = null)}
						class="hover:text-heading text-slate-400"
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				<div class="flex flex-col gap-4">
					<p class="text-label text-xs">
						Allow anyone with the link to view this site's analytics dashboard in a secure,
						read-only view. No login required.
					</p>

					<!-- Toggle Switch -->
					<div
						class="border-themed bg-card flex items-center justify-between rounded-lg border p-3"
					>
						<div class="flex flex-col">
							<span class="text-heading text-xs font-semibold">Enable Public Dashboard</span>
							<span class="text-hint text-[11px]">Anyone with the URL can view metrics</span>
						</div>
						<button
							type="button"
							onclick={() => (shareIsPublic = !shareIsPublic)}
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {shareIsPublic
								? 'bg-indigo-600'
								: 'bg-slate-700'}"
							role="switch"
							aria-checked={shareIsPublic}
						>
							<span class="sr-only">Enable public dashboard</span>
							<span
								class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out {shareIsPublic
									? 'translate-x-4'
									: 'translate-x-0'}"
							></span>
						</button>
					</div>

					{#if shareIsPublic}
						<!-- Share URL Box -->
						<div class="flex flex-col gap-1.5">
							<label for="share-public-link" class="text-body text-[11px] font-medium"
								>Public Link</label
							>
							<div class="flex items-center gap-2">
								<input
									id="share-public-link"
									readonly
									type="text"
									value="{typeof window !== 'undefined'
										? window.location.origin
										: ''}/share/{selectedShareSite.trackingId}"
									class="input-field bg-card w-full rounded-md px-3 py-1.5 font-mono text-xs select-all"
								/>
								<button
									type="button"
									onclick={() => copyShareUrl(selectedShareSite?.trackingId || '')}
									class="border-themed bg-input hover:bg-card-hover hover:text-heading flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors"
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
									class="border-themed bg-input hover:bg-card-hover hover:text-heading flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors"
									title="Open in new tab"
								>
									<ExternalLink size={13} />
								</a>
							</div>
						</div>

						<!-- Password Protection Field -->
						<div class="flex flex-col gap-1.5">
							<label
								for="share-pass"
								class="text-body flex items-center justify-between text-[11px] font-medium"
							>
								<span class="flex items-center gap-1"
									><Lock size={12} /> Password Protect (Optional)</span
								>
								{#if selectedShareSite.hasPassword}
									<span class="text-[10px] text-emerald-400">Password is currently active</span>
								{/if}
							</label>
							<input
								id="share-pass"
								type="password"
								bind:value={sharePassword}
								placeholder={selectedShareSite.hasPassword
									? 'Enter new password to change, or leave blank to keep'
									: 'Optional password (e.g. secret123)'}
								class="input-field w-full rounded-md px-3 py-1.5 text-xs"
							/>
							<p class="text-hint text-[10px]">
								Leave blank to retain current password or leave unprotected.
							</p>
						</div>
					{/if}
				</div>

				<div class="border-themed mt-2 flex items-center justify-end gap-2 border-t pt-3">
					<button
						onclick={() => (selectedShareSite = null)}
						class="hover:text-heading rounded-md px-3 py-1.5 text-xs font-medium text-slate-400"
					>
						Cancel
					</button>
					<button
						onclick={handleSaveShare}
						disabled={shareSaving}
						class="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
					>
						<span>{shareSaving ? 'Saving...' : 'Save Settings'}</span>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Export Data Modal -->
	{#if selectedExportSite}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		>
			<div class="card-modal flex w-full max-w-md flex-col gap-4 p-5">
				<div class="border-themed flex items-center justify-between border-b pb-3">
					<div class="flex items-center gap-2">
						<Download size={16} class="text-indigo-400" />
						<h2 class="text-heading text-sm font-bold">Export Data — {selectedExportSite.name}</h2>
					</div>
					<button
						type="button"
						onclick={() => (selectedExportSite = null)}
						class="hover:text-heading text-slate-400"
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				<p class="text-label text-xs">
					Export raw telemetry summaries, timeseries data, top paths, referrers, and country
					demographics.
				</p>

				<div class="flex flex-col gap-3">
					<div>
						<span class="text-body mb-1.5 block text-[11px] font-medium">Export Format</span>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								onclick={() => (exportFormat = 'csv')}
								class="rounded-md border p-2 text-center text-xs font-medium transition-colors {exportFormat ===
								'csv'
									? 'border-primary bg-primary/10 text-primary font-semibold'
									: 'border-themed bg-input text-label hover:text-heading'}"
							>
								CSV (Spreadsheet)
							</button>
							<button
								type="button"
								onclick={() => (exportFormat = 'json')}
								class="rounded-md border p-2 text-center text-xs font-medium transition-colors {exportFormat ===
								'json'
									? 'border-primary bg-primary/10 text-primary font-semibold'
									: 'border-themed bg-input text-label hover:text-heading'}"
							>
								JSON (Raw Objects)
							</button>
						</div>
					</div>

					<div>
						<label for="export-range" class="text-body mb-1.5 block text-[11px] font-medium"
							>Time Range</label
						>
						<select
							id="export-range"
							bind:value={exportRange}
							class="input-field w-full rounded-md px-2.5 py-1.5 text-xs"
						>
							<option value="today">Today</option>
							<option value="7d">Last 7 Days</option>
							<option value="30d">Last 30 Days</option>
							<option value="90d">Last 90 Days</option>
						</select>
					</div>
				</div>

				<div class="border-themed mt-2 flex items-center justify-end gap-2 border-t pt-3">
					<button
						type="button"
						onclick={() => (selectedExportSite = null)}
						class="hover:text-heading rounded-md px-3 py-1.5 text-xs font-medium text-slate-400"
					>
						Cancel
					</button>
					<a
						href="/api/export?siteId={selectedExportSite.trackingId}&format={exportFormat}&range={exportRange}"
						download
						onclick={() => (selectedExportSite = null)}
						class="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
					>
						<Download size={13} />
						<span>Download {exportFormat.toUpperCase()}</span>
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
