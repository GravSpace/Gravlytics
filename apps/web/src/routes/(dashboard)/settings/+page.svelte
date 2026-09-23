<script lang="ts">
	import { Check, AlertTriangle, Loader2 } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { FORMATTED_VERSION } from '$lib/version';
	import SettingsTabs from '$lib/components/SettingsTabs.svelte';

	let orgName = $state('');
	let orgSlug = $state('');
	let role = $state<string>('');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let isSaved = $state(false);
	let errorMessage = $state('');

	async function loadOrganization() {
		isLoading = true;
		try {
			const res = await fetch('/api/organization');
			if (res.ok) {
				const data = await res.json();
				if (data.organization) {
					orgName = data.organization.name;
					orgSlug = data.organization.slug;
					role = data.role || 'Member';
				}
			}
		} catch (err) {
			console.error('Failed to load organization', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleSave() {
		if (!orgName.trim()) {
			errorMessage = 'Organization name is required';
			return;
		}

		isSaving = true;
		errorMessage = '';
		isSaved = false;

		try {
			const res = await fetch('/api/organization', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: orgName, slug: orgSlug })
			});

			const data = await res.json();
			if (res.ok) {
				if (data.organization) {
					orgName = data.organization.name;
					orgSlug = data.organization.slug;
				}
				isSaved = true;
				setTimeout(() => (isSaved = false), 3000);
			} else {
				errorMessage = data.error || 'Failed to update organization';
			}
		} catch {
			errorMessage = 'Network error while updating organization';
		} finally {
			isSaving = false;
		}
	}

	onMount(() => {
		loadOrganization();
	});
</script>

<svelte:head>
	<title>Organization Settings — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4 max-w-3xl">
	<div class="flex flex-col">
		<h1 class="text-lg font-bold tracking-tight text-heading">Organization Settings</h1>
		<p class="text-xs text-label">Manage tenant profiles, workspace identifier, and global configurations</p>
	</div>

	<!-- Navigation Tabs -->
	<SettingsTabs />

	<div class="card-inset p-5 flex flex-col gap-4 relative">
		<div class="flex items-center justify-between">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-body">General Information</h2>
			<div class="flex items-center gap-2">
				<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-input text-label border border-themed">
					Version: {FORMATTED_VERSION}
				</span>
				{#if role}
					<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
						Role: {role}
					</span>
				{/if}
			</div>
		</div>

		{#if errorMessage}
			<div class="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
				{errorMessage}
			</div>
		{/if}

		{#if isLoading}
			<div class="flex items-center justify-center py-8 text-label gap-2">
				<Loader2 size={16} class="animate-spin text-indigo-500" />
				<span class="text-xs">Loading workspace details...</span>
			</div>
		{:else}
			<div class="flex flex-col gap-3">
				<div>
					<label for="org-name" class="mb-1 block text-[11px] font-medium text-body">Organization Name</label>
					<input
						id="org-name"
						type="text"
						bind:value={orgName}
						disabled={role !== 'Owner' && role !== 'Admin'}
						class="w-full rounded-md input-field px-3 py-1.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
					/>
				</div>

				<div>
					<label for="org-slug" class="mb-1 block text-[11px] font-medium text-body">Organization Slug (URL identifier)</label>
					<div class="flex items-center rounded-md border border-themed bg-input px-3 py-1.5 font-mono text-xs">
						<span class="text-slate-500 mr-1">app.gravlytics.dev/</span>
						<input
							id="org-slug"
							type="text"
							bind:value={orgSlug}
							disabled={role !== 'Owner' && role !== 'Admin'}
							class="w-full bg-transparent text-heading focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
						/>
					</div>
				</div>
			</div>

			<div class="mt-2 flex items-center justify-between border-t border-themed pt-3">
				{#if isSaved}
					<span class="flex items-center gap-1.5 text-xs text-emerald-400">
						<Check size={14} />
						<span>Settings saved successfully</span>
					</span>
				{:else}
					<span></span>
				{/if}
				<button
					onclick={handleSave}
					disabled={isSaving || (role !== 'Owner' && role !== 'Admin')}
					class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
				>
					{#if isSaving}
						<Loader2 size={13} class="animate-spin" />
					{/if}
					<span>Save Changes</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Danger zone -->
	<div class="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 flex flex-col gap-2">
		<div class="flex items-center gap-2 text-rose-400">
			<AlertTriangle size={15} />
			<h2 class="text-xs font-semibold uppercase tracking-wider">Danger Zone</h2>
		</div>
		<p class="text-xs text-label">
			Permanently delete this organization, all registered sites, tracking keys, and event history.
		</p>
		<div class="pt-2">
			<button
				class="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
			>
				Delete Organization
			</button>
		</div>
	</div>
</div>
