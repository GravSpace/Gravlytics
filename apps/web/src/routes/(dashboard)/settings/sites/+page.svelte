<script lang="ts">
	let sites = $state([
		{
			id: 'site-demo-1',
			domain: 'gravlytics.dev',
			name: 'Gravlytics Official',
			trackingId: 'gly_demo_8829',
			timezone: 'UTC',
			createdAt: '2026-03-10'
		},
		{
			id: 'site-demo-2',
			domain: 'docs.gravlytics.dev',
			name: 'Documentation Site',
			trackingId: 'gly_demo_9912',
			timezone: 'UTC',
			createdAt: '2026-03-15'
		}
	]);

	let showAddModal = $state(false);
	let selectedSnippetSite = $state<{ name: string; trackingId: string } | null>(null);

	let newDomain = $state('');
	let newName = $state('');
	let copied = $state(false);

	function handleAddSite() {
		if (!newDomain) return;
		const id = 'site_' + Math.random().toString(36).substring(2, 8);
		const trackingId = 'gly_' + Math.random().toString(36).substring(2, 8);
		sites.push({
			id,
			domain: newDomain,
			name: newName || newDomain,
			trackingId,
			timezone: 'UTC',
			createdAt: new Date().toISOString().split('T')[0]
		});
		newDomain = '';
		newName = '';
		showAddModal = false;
	}

	function handleDelete(siteId: string) {
		sites = sites.filter((s) => s.id !== siteId);
	}

	function copySnippet(trackingId: string) {
		const snippet = `<script defer data-site-id="${trackingId}" src="https://analytics.yourdomain.com/gravlytics.js"><\/script>`;
		navigator.clipboard.writeText(snippet);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>Site Management — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-4xl">
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight text-white">Sites & Domains</h1>
			<p class="text-sm text-muted-light">Manage registered web properties and get tracking snippets</p>
		</div>
		<button
			onclick={() => (showAddModal = true)}
			class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98]"
		>
			+ Add Site
		</button>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 border-b border-ink-border pb-3">
		<a href="/settings" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">General</a>
		<a href="/settings/sites" class="rounded-lg bg-ink-lighter px-3.5 py-1.5 text-xs font-semibold text-white">Sites</a>
		<a href="/settings/team" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">Team</a>
		<a href="/settings/api-keys" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">API Keys</a>
	</div>

	<!-- Sites List -->
	<div class="flex flex-col gap-3">
		{#each sites as site}
			<div class="glass-card flex items-center justify-between p-5">
				<div class="flex items-center gap-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg">
						🌐
					</div>
					<div>
						<h3 class="text-sm font-semibold text-white">{site.name}</h3>
						<p class="text-xs text-muted-light">{site.domain}</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<div class="hidden sm:flex flex-col items-end mr-3">
						<span class="text-[11px] font-mono text-muted-light">Site ID: {site.trackingId}</span>
						<span class="text-[10px] text-muted">Added {site.createdAt}</span>
					</div>

					<button
						onclick={() => (selectedSnippetSite = site)}
						class="rounded-lg border border-ink-border bg-ink-lighter px-3 py-1.5 text-xs font-medium text-muted-light hover:border-primary/50 hover:text-white"
					>
						Snippet
					</button>

					<button
						onclick={() => handleDelete(site.id)}
						class="rounded-lg p-2 text-muted hover:text-red-400 hover:bg-red-500/10"
						title="Delete Site"
					>
						🗑️
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Add Site Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="glass-card w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-semibold text-white">Add New Site</h2>
					<button onclick={() => (showAddModal = false)} class="text-muted hover:text-white">✕</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="new-domain" class="mb-1.5 block text-xs font-medium text-muted-light">Domain</label>
						<input
							id="new-domain"
							type="text"
							bind:value={newDomain}
							placeholder="mywebsite.com"
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						/>
					</div>
					<div>
						<label for="new-name" class="mb-1.5 block text-xs font-medium text-muted-light">Site Name (optional)</label>
						<input
							id="new-name"
							type="text"
							bind:value={newName}
							placeholder="My Awesome Website"
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						/>
					</div>
				</div>

				<div class="mt-2 flex justify-end gap-2">
					<button
						onclick={() => (showAddModal = false)}
						class="rounded-lg px-4 py-2 text-xs font-medium text-muted-light hover:bg-ink-lighter"
					>
						Cancel
					</button>
					<button
						onclick={handleAddSite}
						class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90"
					>
						Add Site
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Tracking Snippet Modal -->
	{#if selectedSnippetSite}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="glass-card w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-base font-semibold text-white">Embed Tracking Code</h2>
						<p class="text-xs text-muted-light">{selectedSnippetSite.name} ({selectedSnippetSite.trackingId})</p>
					</div>
					<button onclick={() => (selectedSnippetSite = null)} class="text-muted hover:text-white">✕</button>
				</div>

				<p class="text-xs text-muted-light">
					Paste this snippet inside the <code class="font-mono text-accent">&lt;head&gt;</code> of your website. It's cookieless, lightweight (&lt;2KB), and respects Do Not Track.
				</p>

				<div class="relative rounded-lg border border-ink-border bg-ink p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
					&lt;script defer data-site-id="{selectedSnippetSite.trackingId}" src="https://analytics.yourdomain.com/gravlytics.js"&gt;&lt;/script&gt;
				</div>

				<div class="flex justify-end gap-2">
					<button
						onclick={() => copySnippet(selectedSnippetSite!.trackingId)}
						class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90"
					>
						{copied ? '✓ Copied to Clipboard' : 'Copy Snippet'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
