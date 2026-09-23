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
		Plus,
		Trash2,
		X,
		Bell,
		Send,
		Check,
		AlertCircle,
		Clock,
		Activity,
		ExternalLink
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import SettingsTabs from '$lib/components/SettingsTabs.svelte';

	interface AlertItem {
		id: string;
		siteId: string;
		name: string;
		metric: string;
		condition: string;
		threshold: number;
		windowMinutes: number;
		webhookUrl: string;
		enabled: boolean;
		lastTriggeredAt: string | null;
		createdAt: string;
	}

	let alerts = $state<AlertItem[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);

	// Modal State
	let showAddModal = $state(false);
	let newName = $state('');
	let newMetric = $state('visitors');
	let newCondition = $state('greater_than');
	let newThreshold = $state<number>(1000);
	let newWindow = $state<number>(60);
	let newWebhookUrl = $state('');

	// Test ping feedback
	let testingId = $state<string | null>(null);
	let testFeedback = $state<{ id: string; success: boolean; message: string } | null>(null);

	async function loadAlerts() {
		if (!siteStore.activeSiteId) return;
		isLoading = true;
		try {
			const res = await fetch(`/api/alerts?siteId=${siteStore.activeSiteId}`);
			if (res.ok) {
				alerts = await res.json();
			}
		} catch (err) {
			console.error('Failed to load alerts', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleAddAlert() {
		if (!newName.trim() || !newWebhookUrl.trim() || !siteStore.activeSiteId) return;
		isSaving = true;
		try {
			const res = await fetch('/api/alerts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: siteStore.activeSiteId,
					name: newName.trim(),
					metric: newMetric,
					condition: newCondition,
					threshold: newThreshold,
					windowMinutes: newWindow,
					webhookUrl: newWebhookUrl.trim()
				})
			});

			if (res.ok) {
				newName = '';
				newWebhookUrl = '';
				showAddModal = false;
				await loadAlerts();
			}
		} catch (err) {
			console.error('Failed to create alert', err);
		} finally {
			isSaving = false;
		}
	}

	async function handleToggle(alert: AlertItem) {
		const newStatus = !alert.enabled;
		alert.enabled = newStatus;
		try {
			await fetch('/api/alerts', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ alertId: alert.id, enabled: newStatus })
			});
		} catch (err) {
			console.error('Failed to toggle alert', err);
			alert.enabled = !newStatus;
		}
	}

	async function handleDelete(alertId: string) {
		try {
			await fetch(`/api/alerts?id=${alertId}`, { method: 'DELETE' });
			alerts = alerts.filter((a) => a.id !== alertId);
		} catch (err) {
			console.error('Failed to delete alert', err);
		}
	}

	async function handleTestPing(alert: AlertItem) {
		testingId = alert.id;
		testFeedback = null;
		try {
			const res = await fetch('/api/alerts?action=test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					webhookUrl: alert.webhookUrl,
					alertName: alert.name
				})
			});
			const data = await res.json();
			if (res.ok && data.success) {
				testFeedback = { id: alert.id, success: true, message: 'Ping sent successfully!' };
			} else {
				testFeedback = { id: alert.id, success: false, message: data.error || `HTTP ${data.status}` };
			}
		} catch (err: any) {
			testFeedback = { id: alert.id, success: false, message: err.message || 'Network error' };
		} finally {
			testingId = null;
			setTimeout(() => {
				if (testFeedback?.id === alert.id) testFeedback = null;
			}, 4000);
		}
	}

	$effect(() => {
		if (siteStore.activeSiteId) {
			loadAlerts();
		}
	});

	onMount(() => {
		if (siteStore.activeSiteId) {
			loadAlerts();
		}
	});
</script>

<svelte:head>
	<title>Anomaly & Webhook Alerts — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-4 max-w-4xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Anomaly & Webhook Alerts</h1>
			<p class="text-xs text-label">
				Receive real-time notifications in Slack, Discord, or generic endpoints on traffic surges or drops
			</p>
		</div>
		<button
			onclick={() => (showAddModal = true)}
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-[0.98]"
		>
			<Plus size={14} strokeWidth={2} />
			<span>New Alert</span>
		</button>
	</div>

	<!-- Navigation Tabs -->
	<SettingsTabs />

	<!-- Alerts List -->
	{#if isLoading}
		<div class="flex h-40 items-center justify-center card">
			<div class="flex items-center gap-2 text-xs text-label">
				<Clock size={16} class="animate-spin text-indigo-400" />
				<span>Loading alerts...</span>
			</div>
		</div>
	{:else if alerts.length === 0}
		<div class="flex flex-col items-center justify-center p-10 text-center card border-dashed">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-2 border border-indigo-500/20">
				<Bell size={20} />
			</div>
			<h3 class="text-xs font-semibold text-heading">No alerts configured</h3>
			<p class="text-[11px] text-label max-w-sm mt-1 mb-3">
				Set up automatic triggers to get notified when traffic exceeds normal thresholds or suddenly drops.
			</p>
			<button
				onclick={() => (showAddModal = true)}
				class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
			>
				<Plus size={13} />
				<span>Create Alert Trigger</span>
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-2.5">
			{#each alerts as alert}
				<div class="card p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-indigo-500/30">
					<div class="flex items-start sm:items-center gap-3">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md {alert.enabled ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}">
							<Bell size={16} />
						</div>

						<div class="flex flex-col">
							<div class="flex items-center gap-2">
								<h3 class="text-xs font-semibold text-heading">{alert.name}</h3>
								<span class="rounded px-1.5 py-0.2 text-[10px] font-mono {alert.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
									{alert.enabled ? 'Active' : 'Disabled'}
								</span>
							</div>

							<div class="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-label font-mono">
								<span>Condition:</span>
								<span class="text-primary font-semibold">{alert.metric}</span>
								<span>{alert.condition === 'greater_than' ? '>' : '<'}</span>
								<span class="text-primary font-semibold">{alert.threshold.toLocaleString()}</span>
								<span class="text-hint">({alert.windowMinutes}m rolling window)</span>
							</div>

							<div class="mt-1 flex items-center gap-2 text-[10px] text-hint font-mono truncate max-w-sm">
								<span class="truncate">{alert.webhookUrl}</span>
							</div>
						</div>
					</div>

					<div class="flex items-center gap-2 self-end sm:self-auto">
						{#if testFeedback?.id === alert.id}
							<span class="text-[11px] {testFeedback.success ? 'text-emerald-400' : 'text-rose-400'}">
								{testFeedback.message}
							</span>
						{/if}

						<button
							onclick={() => handleTestPing(alert)}
							disabled={testingId === alert.id}
							class="flex items-center gap-1 rounded-md border border-themed bg-input px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-card-hover hover:text-heading transition-colors"
							title="Send a sample webhook payload"
						>
							<Send size={12} class={testingId === alert.id ? 'animate-pulse' : ''} />
							<span>{testingId === alert.id ? 'Pinging...' : 'Test'}</span>
						</button>

						<!-- Toggle Switch -->
						<button
							type="button"
							onclick={() => handleToggle(alert)}
							aria-label="Toggle alert active"
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {alert.enabled ? 'bg-indigo-600' : 'bg-slate-700'}"
							role="switch"
							aria-checked={alert.enabled}
						>
							<span
								class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out {alert.enabled ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</button>

						<button
							onclick={() => handleDelete(alert.id)}
							class="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/10 hover:text-rose-400 transition-colors"
							title="Delete Alert"
						>
							<Trash2 size={13} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create Alert Modal -->
	{#if showAddModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="w-full max-w-md card-modal p-5 flex flex-col gap-4">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Bell size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Create Traffic Alert</h2>
					</div>
					<button onclick={() => (showAddModal = false)} class="text-slate-400 hover:text-heading" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="alert-name" class="mb-1 block text-[11px] font-medium text-body">Alert Name</label>
						<input
							id="alert-name"
							type="text"
							bind:value={newName}
							placeholder="e.g. Traffic Spike > 5,000 Visitors"
							class="w-full rounded-md input-field px-3 py-1.5 text-xs"
						/>
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div>
							<label for="alert-metric" class="mb-1 block text-[11px] font-medium text-body">Metric</label>
							<select id="alert-metric" bind:value={newMetric} class="w-full rounded-md input-field px-2.5 py-1.5 text-xs">
								<option value="visitors">Unique Visitors</option>
								<option value="pageviews">Pageviews</option>
								<option value="bounce_rate">Bounce Rate (%)</option>
							</select>
						</div>

						<div>
							<label for="alert-cond" class="mb-1 block text-[11px] font-medium text-body">Condition</label>
							<select id="alert-cond" bind:value={newCondition} class="w-full rounded-md input-field px-2.5 py-1.5 text-xs">
								<option value="greater_than">Greater than (&gt;)</option>
								<option value="less_than">Less than (&lt;)</option>
							</select>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div>
							<label for="alert-thresh" class="mb-1 block text-[11px] font-medium text-body">Threshold Value</label>
							<input
								id="alert-thresh"
								type="number"
								bind:value={newThreshold}
								class="w-full rounded-md input-field px-3 py-1.5 text-xs font-mono"
							/>
						</div>

						<div>
							<label for="alert-win" class="mb-1 block text-[11px] font-medium text-body">Rolling Window</label>
							<select id="alert-win" bind:value={newWindow} class="w-full rounded-md input-field px-2.5 py-1.5 text-xs">
								<option value={15}>15 minutes</option>
								<option value={60}>1 hour</option>
								<option value={1440}>24 hours</option>
							</select>
						</div>
					</div>

					<div>
						<label for="alert-hook" class="mb-1 block text-[11px] font-medium text-body">Webhook Destination URL</label>
						<input
							id="alert-hook"
							type="url"
							bind:value={newWebhookUrl}
							placeholder="https://hooks.slack.com/services/... or Discord webhook"
							class="w-full rounded-md input-field px-3 py-1.5 text-xs font-mono"
						/>
						<span class="text-[10px] text-hint mt-1 block">Supports Slack, Discord, Zapier, Make, and generic JSON POST webhooks.</span>
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
						onclick={handleAddAlert}
						disabled={isSaving || !newName.trim() || !newWebhookUrl.trim()}
						class="rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
					>
						{isSaving ? 'Creating...' : 'Create Alert'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
