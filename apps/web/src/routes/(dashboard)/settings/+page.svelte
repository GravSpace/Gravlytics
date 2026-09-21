<script lang="ts">
	let orgName = $state('Gravlytics Team');
	let orgSlug = $state('gravlytics-team');
	let isSaved = $state(false);

	function handleSave() {
		isSaved = true;
		setTimeout(() => (isSaved = false), 2500);
	}
</script>

<svelte:head>
	<title>Organization Settings — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-3xl">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold tracking-tight text-white">Organization Settings</h1>
		<p class="text-sm text-muted-light">Manage your organization profile, tenants, and preferences</p>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 border-b border-ink-border pb-3">
		<a href="/settings" class="rounded-lg bg-ink-lighter px-3.5 py-1.5 text-xs font-semibold text-white">General</a>
		<a href="/settings/sites" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">Sites</a>
		<a href="/settings/team" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">Team</a>
		<a href="/settings/api-keys" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">API Keys</a>
	</div>

	<div class="glass-card p-6 flex flex-col gap-5">
		<h2 class="text-base font-semibold text-white">General Information</h2>

		<div class="flex flex-col gap-4">
			<div>
				<label for="org-name" class="mb-1.5 block text-xs font-medium text-muted-light">Organization Name</label>
				<input
					id="org-name"
					type="text"
					bind:value={orgName}
					class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
				/>
			</div>

			<div>
				<label for="org-slug" class="mb-1.5 block text-xs font-medium text-muted-light">Organization Slug (URL identifier)</label>
				<div class="flex items-center rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2.5">
					<span class="text-sm text-muted mr-1">app.gravlytics.dev/</span>
					<input
						id="org-slug"
						type="text"
						bind:value={orgSlug}
						class="w-full bg-transparent text-sm text-white focus:outline-none"
					/>
				</div>
			</div>
		</div>

		<div class="mt-2 flex items-center justify-between border-t border-ink-border pt-4">
			{#if isSaved}
				<span class="text-xs text-emerald-400">✓ Settings saved successfully</span>
			{:else}
				<span></span>
			{/if}
			<button
				onclick={handleSave}
				class="gradient-accent rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98]"
			>
				Save Changes
			</button>
		</div>
	</div>

	<!-- Danger zone -->
	<div class="glass-card border-red-500/20 p-6 flex flex-col gap-3">
		<h2 class="text-sm font-semibold text-red-400">Danger Zone</h2>
		<p class="text-xs text-muted-light">
			Permanently delete this organization, all registered sites, tracking keys, and event history.
		</p>
		<div class="pt-2">
			<button
				class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
			>
				Delete Organization
			</button>
		</div>
	</div>
</div>
