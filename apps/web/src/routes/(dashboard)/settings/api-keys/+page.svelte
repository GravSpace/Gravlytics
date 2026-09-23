<script lang="ts">
	import { Sliders, Globe, Users, Key, Plus, Trash2, Copy, Check, X, ShieldCheck, User, Loader2, AlertCircle } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import SettingsTabs from '$lib/components/SettingsTabs.svelte';

	interface ApiKeyItem {
		id: string;
		siteId: string;
		siteDomain?: string;
		siteName?: string;
		name: string;
		prefix: string;
		scope: string;
		createdAt: string;
		lastUsedAt?: string;
	}

	let apiKeys = $state<ApiKeyItem[]>([]);
	let isLoading = $state(true);
	let isCreating = $state(false);
	let errorMessage = $state('');
	let showCreateModal = $state(false);
	let newKeyName = $state('');
	let newKeyScope = $state('all');
	let newlyCreatedKey = $state<string | null>(null);
	let copied = $state(false);

	async function loadApiKeys() {
		isLoading = true;
		try {
			const res = await fetch('/api/api-keys');
			if (res.ok) {
				const data = await res.json();
				apiKeys = data.apiKeys || [];
			}
		} catch (err) {
			console.error('Failed to load API keys', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleCreate() {
		if (!newKeyName.trim()) return;
		isCreating = true;
		errorMessage = '';
		try {
			const res = await fetch('/api/api-keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newKeyName, scope: newKeyScope })
			});
			const data = await res.json();
			if (res.ok && data.success) {
				newlyCreatedKey = data.rawKey;
				newKeyName = '';
				showCreateModal = false;
				await loadApiKeys();
			} else {
				errorMessage = data.error || 'Failed to generate API key';
			}
		} catch {
			errorMessage = 'Network error while generating API key';
		} finally {
			isCreating = false;
		}
	}

	async function handleRevoke(keyId: string) {
		if (!confirm('Are you sure you want to revoke this API key? Applications using it will immediately lose access.')) return;
		try {
			const res = await fetch(`/api/api-keys?id=${encodeURIComponent(keyId)}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				apiKeys = apiKeys.filter((k) => k.id !== keyId);
			}
		} catch (err) {
			console.error('Failed to revoke key', err);
		}
	}

	function copyKey() {
		if (newlyCreatedKey) {
			navigator.clipboard.writeText(newlyCreatedKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	onMount(() => {
		loadApiKeys();
	});
</script>

<svelte:head>
	<title>API Access Keys — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4 max-w-4xl">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">API Keys & Tokens</h1>
			<p class="text-xs text-label">Scoped authentication tokens for external ingestion or query API integrations</p>
		</div>
		<button
			onclick={() => (showCreateModal = true)}
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-[0.98] cursor-pointer"
		>
			<Plus size={14} strokeWidth={2} />
			<span>Generate API Key</span>
		</button>
	</div>

	<!-- Navigation Tabs -->
	<SettingsTabs />

	<!-- Newly created key banner -->
	{#if newlyCreatedKey}
		<div class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col gap-2.5">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 text-emerald-400">
					<ShieldCheck size={16} />
					<h3 class="text-xs font-bold">Copy Your New API Secret Key</h3>
				</div>
				<button onclick={() => (newlyCreatedKey = null)} class="text-slate-400 hover:text-heading" aria-label="Dismiss">
					<X size={14} />
				</button>
			</div>
			<p class="text-xs text-body">
				This secret will only be shown once. Store it securely in your deployment environment secrets.
			</p>
			<div class="flex items-center gap-2">
				<code class="flex-1 rounded-md border border-themed bg-code px-3 py-1.5 font-mono text-xs text-cyan-300 select-all">
					{newlyCreatedKey}
				</code>
				<button
					onclick={copyKey}
					class="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
				>
					{#if copied}
						<Check size={13} />
						<span>Copied</span>
					{:else}
						<Copy size={13} />
						<span>Copy</span>
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Keys List -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12 text-label gap-2 card">
			<Loader2 size={16} class="animate-spin text-indigo-500" />
			<span class="text-xs">Loading API keys...</span>
		</div>
	{:else if apiKeys.length === 0}
		<div class="flex flex-col items-center justify-center py-10 px-4 text-center card border-dashed">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 mb-2">
				<Key size={18} />
			</div>
			<h3 class="text-xs font-semibold text-heading">No API Keys Generated</h3>
			<p class="text-xs text-label max-w-xs mt-1">
				Generate an API key to authenticate external services, backend microservices, or ingestion scripts.
			</p>
			<button
				onclick={() => (showCreateModal = true)}
				class="mt-3.5 flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
			>
				<Plus size={13} strokeWidth={2} />
				<span>Generate Key</span>
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each apiKeys as key}
				<div class="flex items-center justify-between card p-3.5 px-4 transition-colors hover:border-indigo-500/30">
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
							<Key size={16} strokeWidth={1.75} />
						</div>
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-xs font-semibold text-heading">{key.name}</h3>
								<span class="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
									{key.scope}
								</span>
								{#if key.siteDomain}
									<span class="rounded px-1.5 py-0.5 text-[9px] font-mono text-label bg-canvas border border-themed">
										{key.siteDomain}
									</span>
								{/if}
							</div>
							<p class="font-mono text-[11px] text-slate-400 mt-0.5">{key.prefix}_••••••••••••••••</p>
						</div>
					</div>

					<div class="flex items-center gap-4">
						<div class="hidden sm:flex flex-col items-end">
							<span class="font-mono text-[10px] text-hint">Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</span>
							<span class="font-mono text-[10px] text-slate-600">Created: {new Date(key.createdAt).toLocaleDateString()}</span>
						</div>

						<button
							onclick={() => handleRevoke(key.id)}
							class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/10 hover:text-rose-400 transition-colors cursor-pointer"
							title="Revoke Key"
							aria-label="Revoke Key"
						>
							<Trash2 size={13} strokeWidth={1.75} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create Key Modal -->
	{#if showCreateModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-md card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Key size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Generate API Key</h2>
					</div>
					<button onclick={() => (showCreateModal = false)} class="text-slate-400 hover:text-heading cursor-pointer" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				{#if errorMessage}
					<div class="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
						<AlertCircle size={14} class="shrink-0" />
						<span>{errorMessage}</span>
					</div>
				{/if}

				<div class="flex flex-col gap-3">
					<div>
						<label for="key-name" class="mb-1 block text-[11px] font-medium text-body">Key Name</label>
						<input
							id="key-name"
							type="text"
							bind:value={newKeyName}
							placeholder="e.g. CLI or Staging Ingestion"
							class="w-full rounded-md input-field px-3 py-1.5 text-xs"
						/>
					</div>

					<div>
						<label for="key-scope" class="mb-1 block text-[11px] font-medium text-body">Access Scope</label>
						<select
							id="key-scope"
							bind:value={newKeyScope}
							class="w-full rounded-md input-solid px-3 py-1.5 text-xs focus:border-indigo-500"
						>
							<option value="all">Full Access (Ingestion & Reporting Query)</option>
							<option value="ingestion">Ingestion Only (Send events)</option>
							<option value="query">Query Only (Read stats & reports)</option>
						</select>
					</div>
				</div>

				<div class="mt-2 flex justify-end gap-2 border-t border-themed pt-3">
					<button
						onclick={() => (showCreateModal = false)}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-heading cursor-pointer"
					>
						Cancel
					</button>
					<button
						onclick={handleCreate}
						disabled={isCreating}
						class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-60 cursor-pointer"
					>
						{#if isCreating}
							<Loader2 size={13} class="animate-spin" />
						{/if}
						<span>Generate Key</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
