<script lang="ts">
	let apiKeys = $state([
		{
			id: 'key-1',
			name: 'Production Ingestion Key',
			prefix: 'gly_8f92',
			scope: 'ingestion',
			createdAt: '2026-03-05',
			lastUsedAt: '2 hours ago'
		},
		{
			id: 'key-2',
			name: 'BI Reporting Query Key',
			prefix: 'gly_3c19',
			scope: 'query',
			createdAt: '2026-03-12',
			lastUsedAt: 'Yesterday'
		}
	]);

	let showCreateModal = $state(false);
	let newKeyName = $state('');
	let newKeyScope = $state('all');
	let newlyCreatedKey = $state<string | null>(null);
	let copied = $state(false);

	function handleCreate() {
		if (!newKeyName) return;
		const prefix = 'gly_' + Math.random().toString(36).substring(2, 6);
		const secret = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
		const fullKey = `${prefix}_${secret}`;

		apiKeys.push({
			id: 'key_' + Math.random().toString(36).substring(2, 8),
			name: newKeyName,
			prefix,
			scope: newKeyScope,
			createdAt: new Date().toISOString().split('T')[0],
			lastUsedAt: 'Never'
		});

		newlyCreatedKey = fullKey;
		newKeyName = '';
		showCreateModal = false;
	}

	function handleRevoke(keyId: string) {
		apiKeys = apiKeys.filter((k) => k.id !== keyId);
	}

	function copyKey() {
		if (newlyCreatedKey) {
			navigator.clipboard.writeText(newlyCreatedKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<svelte:head>
	<title>API Keys — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-4xl">
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight text-white">API Keys & Tokens</h1>
			<p class="text-sm text-muted-light">Programmatically ingest events or query analytics with scoped tokens</p>
		</div>
		<button
			onclick={() => (showCreateModal = true)}
			class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98]"
		>
			+ Generate API Key
		</button>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 border-b border-ink-border pb-3">
		<a href="/settings" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">General</a>
		<a href="/settings/sites" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">Sites</a>
		<a href="/settings/team" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">Team</a>
		<a href="/settings/api-keys" class="rounded-lg bg-ink-lighter px-3.5 py-1.5 text-xs font-semibold text-white">API Keys</a>
	</div>

	<!-- Newly created key banner -->
	{#if newlyCreatedKey}
		<div class="glass-card border-emerald-500/30 bg-emerald-500/10 p-5 flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-semibold text-emerald-400">Save Your API Key Now</h3>
				<button onclick={() => (newlyCreatedKey = null)} class="text-muted hover:text-white text-xs">Dismiss</button>
			</div>
			<p class="text-xs text-muted-light">
				This token won't be shown again. Store it securely in your secrets manager.
			</p>
			<div class="flex items-center gap-2">
				<code class="flex-1 rounded-lg border border-ink-border bg-ink px-3 py-2 font-mono text-xs text-emerald-300">
					{newlyCreatedKey}
				</code>
				<button
					onclick={copyKey}
					class="gradient-accent rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
				>
					{copied ? '✓ Copied' : 'Copy'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Keys List -->
	<div class="flex flex-col gap-3">
		{#each apiKeys as key}
			<div class="glass-card flex items-center justify-between p-5">
				<div class="flex items-center gap-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-lg">
						🔑
					</div>
					<div>
						<h3 class="text-sm font-semibold text-white">{key.name}</h3>
						<div class="mt-0.5 flex items-center gap-2">
							<code class="font-mono text-xs text-muted-light">{key.prefix}••••••••••••</code>
							<span class="rounded bg-ink-lighter px-2 py-0.5 text-[10px] uppercase font-mono text-accent">
								{key.scope}
							</span>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<div class="hidden sm:flex flex-col items-end mr-3">
						<span class="text-[11px] text-muted-light">Last used: {key.lastUsedAt}</span>
						<span class="text-[10px] text-muted">Created {key.createdAt}</span>
					</div>

					<button
						onclick={() => handleRevoke(key.id)}
						class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
					>
						Revoke
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Create Modal -->
	{#if showCreateModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="glass-card w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-semibold text-white">Generate API Key</h2>
					<button onclick={() => (showCreateModal = false)} class="text-muted hover:text-white">✕</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="key-name" class="mb-1.5 block text-xs font-medium text-muted-light">Key Name</label>
						<input
							id="key-name"
							type="text"
							bind:value={newKeyName}
							placeholder="e.g., CI/CD Test Token"
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						/>
					</div>
					<div>
						<label for="key-scope" class="mb-1.5 block text-xs font-medium text-muted-light">Key Scope</label>
						<select
							id="key-scope"
							bind:value={newKeyScope}
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						>
							<option value="all">All (Ingestion + Query)</option>
							<option value="ingestion">Ingestion Only (Send events)</option>
							<option value="query">Query Only (Read stats & aggregations)</option>
						</select>
					</div>
				</div>

				<div class="mt-2 flex justify-end gap-2">
					<button
						onclick={() => (showCreateModal = false)}
						class="rounded-lg px-4 py-2 text-xs font-medium text-muted-light hover:bg-ink-lighter"
					>
						Cancel
					</button>
					<button
						onclick={handleCreate}
						class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90"
					>
						Create Key
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
