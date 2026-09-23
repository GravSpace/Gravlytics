<script lang="ts">
	import { onMount } from 'svelte';
	import {
		User,
		Sliders,
		Globe,
		Users,
		Key,
		Shield,
		Lock,
		Clock,
		Search,
		RefreshCw,
		FileText,
	} from '@lucide/svelte';
	import SettingsTabs from '$lib/components/SettingsTabs.svelte';

	interface AuditLogItem {
		id: string;
		action: string;
		details: Record<string, any>;
		createdAt: string;
		user: {
			name: string;
			email: string;
		} | null;
	}

	let logs = $state<AuditLogItem[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let selectedAction = $state('all');

	async function loadLogs() {
		isLoading = true;
		try {
			const res = await fetch('/api/audit');
			if (res.ok) {
				logs = await res.json();
			}
		} catch (err) {
			console.error('Failed to load audit logs', err);
		} finally {
			isLoading = false;
		}
	}

	const filteredLogs = $derived(
		logs.filter((log) => {
			const matchesAction = selectedAction === 'all' || log.action.toLowerCase().includes(selectedAction.toLowerCase());
			const query = searchQuery.toLowerCase().trim();
			if (!query) return matchesAction;
			const matchesQuery =
				log.action.toLowerCase().includes(query) ||
				log.user?.name.toLowerCase().includes(query) ||
				log.user?.email.toLowerCase().includes(query) ||
				JSON.stringify(log.details).toLowerCase().includes(query);
			return matchesAction && matchesQuery;
		})
	);

	function formatActionColor(action: string) {
		if (action.includes('delete') || action.includes('remove')) {
			return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
		}
		if (action.includes('create') || action.includes('add') || action.includes('register')) {
			return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
		}
		if (action.includes('login') || action.includes('auth')) {
			return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
		}
		return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
	}

	onMount(() => {
		loadLogs();
	});
</script>

<svelte:head>
	<title>Audit Logs & Security Trail — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4 max-w-5xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Audit Trail & Compliance</h1>
			<p class="text-xs text-label">
				Immutable log of administrative actions, team modifications, and security events
			</p>
		</div>
		<button
			onclick={loadLogs}
			disabled={isLoading}
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md border border-themed bg-input px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-card-hover hover:text-heading transition-colors"
		>
			<RefreshCw size={12} class={isLoading ? 'animate-spin' : ''} />
			<span>Refresh</span>
		</button>
	</div>

	<!-- Navigation Tabs -->
	<SettingsTabs />

	<!-- Filter Controls -->
	<div class="card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
		<div class="relative w-full sm:w-72">
			<Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-hint" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search action or user..."
				class="w-full rounded-md input-field pl-8 pr-3 py-1.5 text-xs"
			/>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto">
			<span class="text-[11px] text-label shrink-0">Action:</span>
			<select bind:value={selectedAction} class="rounded-md input-field px-2.5 py-1 text-xs">
				<option value="all">All Events</option>
				<option value="site">Site Events</option>
				<option value="auth">Auth & Login</option>
				<option value="member">Team & Invites</option>
				<option value="alert">Alerts</option>
			</select>
		</div>
	</div>

	<!-- Logs List / Table -->
	{#if isLoading}
		<div class="flex h-48 items-center justify-center card">
			<div class="flex items-center gap-2 text-xs text-label">
				<Clock size={16} class="animate-spin text-indigo-400" />
				<span>Loading audit trail...</span>
			</div>
		</div>
	{:else if filteredLogs.length === 0}
		<div class="flex flex-col items-center justify-center p-12 text-center card border-dashed">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-2 border border-indigo-500/20">
				<FileText size={20} />
			</div>
			<h3 class="text-xs font-semibold text-heading">No audit events recorded</h3>
			<p class="text-[11px] text-label max-w-sm mt-1">
				Actions like registering sites, generating API keys, inviting team members, or changing permissions will be listed here.
			</p>
		</div>
	{:else}
		<div class="card overflow-hidden divide-y divide-themed">
			<div class="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold text-label bg-sidebar border-b border-themed">
				<span class="col-span-3">Timestamp</span>
				<span class="col-span-3">Actor</span>
				<span class="col-span-3">Action</span>
				<span class="col-span-3">Details</span>
			</div>

			{#each filteredLogs as log}
				<div class="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 px-4 items-center text-xs hover:bg-card-hover transition-colors">
					<!-- Timestamp -->
					<div class="col-span-3 flex items-center gap-1.5 text-hint font-mono text-[11px]">
						<Clock size={12} class="text-slate-500 shrink-0" />
						<span>{new Date(log.createdAt).toLocaleString()}</span>
					</div>

					<!-- Actor -->
					<div class="col-span-3 flex flex-col">
						{#if log.user}
							<span class="font-medium text-heading text-xs truncate">{log.user.name}</span>
							<span class="text-[10px] text-hint truncate font-mono">{log.user.email}</span>
						{:else}
							<span class="text-hint italic text-xs">System / Automated</span>
						{/if}
					</div>

					<!-- Action Badge -->
					<div class="col-span-3">
						<span class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border {formatActionColor(log.action)}">
							{log.action}
						</span>
					</div>

					<!-- Details -->
					<div class="col-span-3 font-mono text-[11px] text-label truncate">
						{#if log.details && Object.keys(log.details).length > 0}
							<span title={JSON.stringify(log.details, null, 2)}>{JSON.stringify(log.details)}</span>
						{:else}
							<span class="text-hint italic">—</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
