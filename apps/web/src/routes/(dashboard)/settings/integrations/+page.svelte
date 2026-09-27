<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		Search,
		CheckCircle2,
		AlertCircle,
		Loader2,
		Copy,
		Check,
		ExternalLink,
		KeyRound,
		ShieldCheck,
		RefreshCw,
		Trash2,
		UploadCloud,
		FileCode2,
		Globe,
		Sparkles,
		Lock,
		Radio,
		ChevronRight,
		HelpCircle,
		ArrowRight,
		BookOpen
	} from '@lucide/svelte';
	import SettingsTabs from '$lib/components/SettingsTabs.svelte';
	import { siteStore } from '$lib/stores/site.svelte';

	interface GSCConnectionData {
		connected: boolean;
		id?: string;
		siteId?: string;
		siteDomain?: string;
		authType?: 'service_account' | 'oauth';
		clientEmail?: string;
		propertyUrl?: string;
		verifiedSites?: { siteUrl: string; permissionLevel: string }[];
		lastSyncAt?: string | null;
		lastSyncStatus?: string;
		lastError?: string | null;
		suggestedPropertyUrl?: string;
		hasServiceAccountKey?: boolean;
		hasOAuthToken?: boolean;
	}

	let connection = $state<GSCConnectionData | null>(null);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let isTesting = $state(false);
	let isDisconnecting = $state(false);
	let testSuccessMessage = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let copiedEmail = $state(false);

	// Form state
	let authType = $state<'service_account' | 'oauth'>('service_account');
	let serviceAccountKeyJson = $state('');
	let clientEmail = $state('');
	let propertyUrl = $state('');
	let discoveredProperties = $state<{ siteUrl: string; permissionLevel: string }[]>([]);

	let showInstructions = $state(true);

	const activeSite = $derived(siteStore.currentSite);

	async function loadGscStatus() {
		if (!activeSite?.id) return;
		isLoading = true;
		errorMessage = null;
		testSuccessMessage = null;

		try {
			const res = await fetch(`/api/integrations/search-console?siteId=${activeSite.id}`);
			if (res.ok) {
				const data: GSCConnectionData = await res.json();
				connection = data;

				if (data.connected) {
					authType = data.authType || 'service_account';
					clientEmail = data.clientEmail || '';
					propertyUrl = data.propertyUrl || '';
					discoveredProperties = data.verifiedSites || [];
				} else {
					propertyUrl = data.suggestedPropertyUrl || `sc-domain:${activeSite.domain || ''}`;
				}
			} else {
				const err = await res.json();
				errorMessage = err.error || 'Failed to load integration status';
			}
		} catch (err: any) {
			errorMessage = 'Network error while checking Search Console integration';
		} finally {
			isLoading = false;
		}
	}

	function handleJsonInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		serviceAccountKeyJson = target.value;
		errorMessage = null;
		testSuccessMessage = null;

		try {
			if (serviceAccountKeyJson.trim()) {
				const parsed = JSON.parse(serviceAccountKeyJson);
				if (parsed.client_email) {
					clientEmail = parsed.client_email;
				}
			}
		} catch {
			// user might still be typing/pasting
		}
	}

	function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			serviceAccountKeyJson = content;
			try {
				const parsed = JSON.parse(content);
				if (parsed.client_email) {
					clientEmail = parsed.client_email;
				}
			} catch {
				errorMessage = 'Uploaded file is not valid JSON';
			}
		};
		reader.readAsText(file);
	}

	async function handleTestConnection() {
		if (!activeSite?.id) return;
		isTesting = true;
		errorMessage = null;
		testSuccessMessage = null;

		try {
			const res = await fetch('/api/integrations/search-console/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: activeSite.id,
					authType,
					serviceAccountKey: serviceAccountKeyJson || undefined,
					propertyUrl: propertyUrl.trim()
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				testSuccessMessage = data.message || 'Connection verified successfully!';
				if (Array.isArray(data.accessibleProperties) && data.accessibleProperties.length > 0) {
					discoveredProperties = data.accessibleProperties;
					if (!propertyUrl && discoveredProperties[0]) {
						propertyUrl = discoveredProperties[0].siteUrl;
					}
				}
			} else {
				errorMessage = data.error || data.message || 'Connection test failed';
			}
		} catch (err: any) {
			errorMessage = err.message || 'Network error during connection test';
		} finally {
			isTesting = false;
		}
	}

	async function handleSaveConnection() {
		if (!activeSite?.id) return;

		if (authType === 'service_account' && !serviceAccountKeyJson.trim() && !connection?.hasServiceAccountKey) {
			errorMessage = 'Please provide your Google Service Account JSON key';
			return;
		}

		if (!propertyUrl.trim()) {
			errorMessage = 'Please specify your Search Console Property URL (e.g., sc-domain:yourdomain.com)';
			return;
		}

		isSaving = true;
		errorMessage = null;
		testSuccessMessage = null;

		try {
			const res = await fetch('/api/integrations/search-console', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: activeSite.id,
					authType,
					serviceAccountKey: serviceAccountKeyJson.trim() || undefined,
					clientEmail: clientEmail.trim(),
					propertyUrl: propertyUrl.trim()
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				testSuccessMessage = 'Google Search Console successfully connected and verified!';
				await loadGscStatus();
			} else {
				errorMessage = data.error || 'Failed to save Google Search Console connection';
			}
		} catch {
			errorMessage = 'Network error while saving integration';
		} finally {
			isSaving = false;
		}
	}

	async function handleDisconnect() {
		if (!activeSite?.id) return;
		if (!confirm('Are you sure you want to disconnect Google Search Console from this site?')) return;

		isDisconnecting = true;
		errorMessage = null;

		try {
			const res = await fetch(`/api/integrations/search-console?siteId=${activeSite.id}`, {
				method: 'DELETE'
			});

			if (res.ok) {
				serviceAccountKeyJson = '';
				clientEmail = '';
				testSuccessMessage = 'Google Search Console disconnected.';
				await loadGscStatus();
			} else {
				const data = await res.json();
				errorMessage = data.error || 'Failed to disconnect';
			}
		} catch {
			errorMessage = 'Network error while disconnecting';
		} finally {
			isDisconnecting = false;
		}
	}

	function copyClientEmail() {
		if (!clientEmail) return;
		navigator.clipboard.writeText(clientEmail);
		copiedEmail = true;
		setTimeout(() => (copiedEmail = false), 2500);
	}

	onMount(() => {
		const urlParams = $page.url.searchParams;
		if (urlParams.get('connected')) {
			testSuccessMessage = 'Google Search Console connected successfully via OAuth!';
		}
		if (urlParams.get('error')) {
			errorMessage = urlParams.get('error');
		}

		loadGscStatus();
	});

	$effect(() => {
		if (activeSite?.id) {
			loadGscStatus();
		}
	});
</script>

<svelte:head>
	<title>Integrations & Google Search Console — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-5xl">
	<!-- Page Header -->
	<div class="flex flex-col gap-1">
		<div class="flex items-center gap-2">
			<h1 class="text-lg font-bold tracking-tight text-heading">Third-Party Integrations</h1>
			<span class="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-400 border border-indigo-500/20">
				Site: {activeSite?.name || activeSite?.domain || 'Active Site'}
			</span>
		</div>
		<p class="text-xs text-label">
			Connect external data sources, search engine indexes, and webhooks to enrich your analytics pipeline.
		</p>
	</div>

	<!-- Navigation Tabs -->
	<SettingsTabs activeTab="integrations" />

	<!-- Alerts / Notifications -->
	{#if testSuccessMessage}
		<div class="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-400">
			<CheckCircle2 size={16} class="shrink-0 text-emerald-400" />
			<div class="flex-1 font-medium">{testSuccessMessage}</div>
			<button onclick={() => (testSuccessMessage = null)} class="text-emerald-400 hover:text-emerald-300 text-xs">✕</button>
		</div>
	{/if}

	{#if errorMessage}
		<div class="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-400">
			<AlertCircle size={16} class="shrink-0 text-rose-400 mt-0.5" />
			<div class="flex-1 font-medium">{errorMessage}</div>
			<button onclick={() => (errorMessage = null)} class="text-rose-400 hover:text-rose-300 text-xs">✕</button>
		</div>
	{/if}

	<!-- Google Search Console Master Card -->
	<div class="card-inset flex flex-col gap-5 p-6 relative overflow-hidden border border-themed">
		<!-- Top Bar & Status -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-themed pb-5">
			<div class="flex items-start sm:items-center gap-3.5">
				<!-- Google Search Console Icon Emblem -->
				<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-primary/20 to-cyan-500/20 p-[1px] border border-themed">
					<div class="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-900/90 text-amber-400">
						<Search size={20} strokeWidth={2.25} />
					</div>
				</div>
				<div class="flex flex-col">
					<div class="flex items-center gap-2.5">
						<h2 class="text-sm font-semibold text-heading">Google Search Console (GSC)</h2>
						{#if isLoading}
							<span class="flex items-center gap-1 text-[10px] text-hint">
								<Loader2 size={11} class="animate-spin" /> Checking...
							</span>
						{:else if connection?.connected}
							<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/30">
								<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
								Connected & Synced
							</span>
						{:else}
							<span class="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-medium text-hint border border-themed">
								Not Connected
							</span>
						{/if}
					</div>
					<p class="text-xs text-label mt-0.5">
						Import organic search keywords, impressions, clicks, click-through rates (CTR), and Google average ranking positions.
					</p>
				</div>
			</div>

			<!-- Quick Actions when connected -->
			{#if connection?.connected}
				<div class="flex items-center gap-2 self-start sm:self-auto">
					<a
						href="/search-console"
						class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
					>
						<span>View Search Analytics</span>
						<ArrowRight size={13} />
					</a>
					<button
						onclick={handleDisconnect}
						disabled={isDisconnecting}
						class="flex items-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
					>
						{#if isDisconnecting}
							<Loader2 size={13} class="animate-spin" />
						{:else}
							<Trash2 size={13} />
						{/if}
						<span>Disconnect</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Connected State Overview -->
		{#if connection?.connected}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
				<div class="rounded-lg bg-input border border-themed p-3.5 flex flex-col gap-1">
					<span class="text-[11px] font-mono text-hint">GSC Property Target</span>
					<div class="flex items-center gap-1.5 font-mono text-xs font-semibold text-heading truncate">
						<Globe size={13} class="text-cyan-400 shrink-0" />
						<span class="truncate" title={connection.propertyUrl}>{connection.propertyUrl}</span>
					</div>
				</div>

				<div class="rounded-lg bg-input border border-themed p-3.5 flex flex-col gap-1">
					<span class="text-[11px] font-mono text-hint">Connected Account</span>
					<div class="flex items-center gap-1.5 font-mono text-xs text-heading truncate">
						<ShieldCheck size={13} class="text-indigo-400 shrink-0" />
						<span class="truncate" title={connection.clientEmail}>{connection.clientEmail || 'Google Service Account'}</span>
					</div>
				</div>

				<div class="rounded-lg bg-input border border-themed p-3.5 flex flex-col gap-1">
					<span class="text-[11px] font-mono text-hint">Sync Status & Last Update</span>
					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-emerald-400 flex items-center gap-1">
							<CheckCircle2 size={13} /> Operational
						</span>
						<span class="text-[10px] text-hint font-mono">
							{connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleTimeString() : 'Recent'}
						</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Configuration Form -->
		<div class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-body flex items-center gap-2">
					<KeyRound size={14} class="text-primary" />
					<span>Authentication & Credentials</span>
				</h3>

				<!-- Method Selector Tabs -->
				<div class="flex items-center gap-1 rounded-lg bg-input p-0.5 border border-themed text-xs">
					<button
						onclick={() => (authType = 'service_account')}
						class="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all {authType === 'service_account'
							? 'bg-indigo-600 text-white font-semibold shadow-xs'
							: 'text-label hover:text-heading'}"
					>
						<span>Service Account (Recommended)</span>
					</button>
					<button
						onclick={() => (authType = 'oauth')}
						class="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all {authType === 'oauth'
							? 'bg-indigo-600 text-white font-semibold shadow-xs'
							: 'text-label hover:text-heading'}"
					>
						<span>OAuth2 Login</span>
					</button>
				</div>
			</div>

			<!-- Method A: Service Account -->
			{#if authType === 'service_account'}
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center justify-between text-xs">
							<label for="sa_json" class="font-medium text-heading flex items-center gap-1.5">
								<span>Google Service Account JSON Key</span>
								<span class="text-[11px] font-normal text-hint">(Contains RS256 private key)</span>
							</label>

							<label
								class="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
							>
								<UploadCloud size={13} />
								<span>Upload .json file</span>
								<input type="file" accept=".json" onchange={handleFileUpload} class="hidden" />
							</label>
						</div>

						<textarea
							id="sa_json"
							rows="5"
							value={serviceAccountKeyJson}
							oninput={handleJsonInput}
							placeholder={connection?.hasServiceAccountKey
								? '•••••••• (A service account key is already securely stored. Paste a new JSON key to replace it)'
								: '{\n  "type": "service_account",\n  "project_id": "my-project",\n  "client_email": "gravlytics-gsc@my-project.iam.gserviceaccount.com",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n..."\n}'}
							class="w-full rounded-md border border-themed bg-input p-3 font-mono text-[11px] text-heading placeholder:text-hint focus:border-indigo-500 focus:outline-none"
						></textarea>
					</div>

					<!-- Extracted Client Email info banner -->
					{#if clientEmail}
						<div class="flex items-center justify-between gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs">
							<div class="flex items-center gap-2 min-w-0">
								<ShieldCheck size={16} class="text-indigo-400 shrink-0" />
								<div class="flex flex-col min-w-0">
									<span class="text-[11px] font-mono text-hint">Service Account Email to authorize:</span>
									<span class="font-mono text-xs font-semibold text-heading truncate">{clientEmail}</span>
								</div>
							</div>
							<button
								onclick={copyClientEmail}
								class="flex shrink-0 items-center gap-1.5 rounded-md border border-themed bg-input px-2.5 py-1 text-xs font-medium text-body hover:text-heading hover:bg-card-hover transition-colors"
							>
								{#if copiedEmail}
									<Check size={13} class="text-emerald-400" />
									<span class="text-emerald-400">Copied</span>
								{:else}
									<Copy size={13} />
									<span>Copy Email</span>
								{/if}
							</button>
						</div>
					{/if}

					<!-- Property URL input -->
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center justify-between text-xs">
							<label for="prop_url" class="font-medium text-heading">Search Console Property URL</label>
							<span class="text-[11px] text-hint font-mono">Domain property format: <code>sc-domain:example.com</code> or <code>https://example.com/</code></span>
						</div>
						<div class="flex gap-2">
							<input
								id="prop_url"
								type="text"
								bind:value={propertyUrl}
								placeholder="sc-domain:example.com or https://example.com/"
								class="flex-1 rounded-md border border-themed bg-input px-3 py-2 text-xs font-mono text-heading placeholder:text-hint focus:border-indigo-500 focus:outline-none"
							/>
							{#if discoveredProperties.length > 0}
								<select
									onchange={(e) => (propertyUrl = (e.target as HTMLSelectElement).value)}
									class="rounded-md border border-themed bg-input px-3 py-2 text-xs text-heading focus:border-indigo-500 focus:outline-none"
								>
									<option value="" disabled selected>Select from GSC account...</option>
									{#each discoveredProperties as p}
										<option value={p.siteUrl}>{p.siteUrl} ({p.permissionLevel})</option>
									{/each}
								</select>
							{/if}
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex items-center justify-between pt-2">
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={handleTestConnection}
								disabled={isTesting || (!serviceAccountKeyJson.trim() && !connection?.hasServiceAccountKey)}
								class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-3.5 py-2 text-xs font-semibold text-heading hover:bg-card-hover transition-colors cursor-pointer disabled:opacity-50"
							>
								{#if isTesting}
									<Loader2 size={13} class="animate-spin text-primary" />
									<span>Verifying with Google...</span>
								{:else}
									<RefreshCw size={13} class="text-primary" />
									<span>Test & Discover Properties</span>
								{/if}
							</button>
						</div>

						<button
							type="button"
							onclick={handleSaveConnection}
							disabled={isSaving}
							class="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
						>
							{#if isSaving}
								<Loader2 size={13} class="animate-spin" />
								<span>Saving Integration...</span>
							{:else}
								<Check size={13} />
								<span>Save & Connect Search Console</span>
							{/if}
						</button>
					</div>
				</div>
			{:else}
				<!-- Method B: OAuth2 -->
				<div class="flex flex-col gap-4 rounded-lg bg-input border border-themed p-5">
					<div class="flex items-start gap-3">
						<Radio size={18} class="text-indigo-400 shrink-0 mt-0.5" />
						<div class="flex flex-col gap-1">
							<h4 class="text-xs font-semibold text-heading">Sign in with Google OAuth</h4>
							<p class="text-xs text-label leading-relaxed">
								Authorize Gravlytics to read your verified Search Console properties directly with your Google account.
								Requires server environment variables <code class="text-indigo-300 font-mono">GSC_CLIENT_ID</code> and <code class="text-indigo-300 font-mono">GSC_CLIENT_SECRET</code>.
							</p>
						</div>
					</div>

					<div class="flex items-center gap-3 pt-2">
						<a
							href="/api/integrations/search-console/oauth?siteId={activeSite?.id}"
							class="flex items-center gap-2 rounded-md bg-white text-slate-900 px-4 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors shadow-sm"
						>
							<svg class="h-4 w-4" viewBox="0 0 24 24">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
							</svg>
							<span>Authorize with Google Search Console</span>
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Step-by-Step Connection Guide Accordion / Card -->
	<div class="card-inset flex flex-col gap-4 p-6 border border-themed">
		<div class="flex items-center justify-between border-b border-themed pb-3">
			<div class="flex items-center gap-2">
				<HelpCircle size={15} class="text-cyan-400" />
				<h3 class="text-xs font-semibold uppercase tracking-wider text-heading">
					Step-by-Step Setup Guide: Connecting Google Search Console
				</h3>
			</div>
			<div class="flex items-center gap-3">
				<a
					href="/docs/google-search-console"
					class="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
				>
					<BookOpen size={13} />
					<span>Full Documentation Page</span>
					<ArrowRight size={11} />
				</a>
				<button
					onclick={() => (showInstructions = !showInstructions)}
					class="text-xs text-label hover:text-heading transition-colors"
				>
					{showInstructions ? 'Hide Guide' : 'Show Guide'}
				</button>
			</div>
		</div>

		{#if showInstructions}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
				<!-- Step 1 & 2 -->
				<div class="flex flex-col gap-2 rounded-lg bg-input p-4 border border-themed">
					<div class="flex items-center gap-2 font-semibold text-heading">
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-[11px] font-mono">1</span>
						<span>Create Google Cloud Project & Enable API</span>
					</div>
					<ol class="list-decimal list-inside space-y-1.5 text-label text-[11px] leading-relaxed pl-1">
						<li>Open <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" class="text-indigo-400 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={10} /></a> and select or create a project.</li>
						<li>Navigate to <strong>APIs & Services &gt; Library</strong>.</li>
						<li>Search for <strong>"Google Search Console API"</strong> and click <strong>Enable</strong>.</li>
					</ol>
				</div>

				<!-- Step 3 -->
				<div class="flex flex-col gap-2 rounded-lg bg-input border border-themed p-4">
					<div class="flex items-center gap-2 font-semibold text-heading">
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-[11px] font-mono">2</span>
						<span>Create Service Account & Download Key</span>
					</div>
					<ol class="list-decimal list-inside space-y-1.5 text-label text-[11px] leading-relaxed pl-1">
						<li>Go to <strong>IAM & Admin &gt; Service Accounts</strong>.</li>
						<li>Click <strong>Create Service Account</strong> (name it e.g. <code>gravlytics-gsc</code>).</li>
						<li>Under the created service account, go to the <strong>Keys</strong> tab.</li>
						<li>Click <strong>Add Key &gt; Create new key &gt; JSON</strong>. Download the JSON key file.</li>
					</ol>
				</div>

				<!-- Step 4 -->
				<div class="flex flex-col gap-2 rounded-lg bg-input border border-themed p-4">
					<div class="flex items-center gap-2 font-semibold text-heading">
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-[11px] font-mono">3</span>
						<span>Add Service Account to Search Console</span>
					</div>
					<ol class="list-decimal list-inside space-y-1.5 text-label text-[11px] leading-relaxed pl-1">
						<li>Open <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" class="text-indigo-400 underline inline-flex items-center gap-0.5">Google Search Console <ExternalLink size={10} /></a>.</li>
						<li>Select your site property from the top-left dropdown.</li>
						<li>Click <strong>Settings</strong> in the left sidebar, then click <strong>Users and permissions</strong>.</li>
						<li>Click <strong>Add user</strong>, paste the service account email (from JSON <code>client_email</code>), and set permission to <strong>Full</strong> or <strong>Restricted</strong>.</li>
					</ol>
				</div>

				<!-- Step 5 -->
				<div class="flex flex-col gap-2 rounded-lg bg-input border border-themed p-4">
					<div class="flex items-center gap-2 font-semibold text-heading">
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-[11px] font-mono">4</span>
						<span>Connect & Inspect Queries</span>
					</div>
					<ol class="list-decimal list-inside space-y-1.5 text-label text-[11px] leading-relaxed pl-1">
						<li>Upload or paste your JSON key into the field above.</li>
						<li>Enter your property URL (e.g. <code>sc-domain:{activeSite?.domain || 'example.com'}</code>).</li>
						<li>Click <strong>Test & Discover Properties</strong> to verify connection.</li>
						<li>Click <strong>Save & Connect</strong>, then visit the <a href="/search-console" class="text-cyan-400 font-semibold underline">Search Console</a> dashboard!</li>
					</ol>
				</div>
			</div>
		{/if}
	</div>

	<!-- Other Integrations Showcase -->
	<div class="flex flex-col gap-3">
		<h3 class="text-xs font-semibold uppercase tracking-wider text-body">Other Available Integrations</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
			<a
				href="/settings/alerts"
				class="card-inset p-4 flex flex-col gap-2 rounded-lg border border-themed hover:border-indigo-500/30 transition-all group"
			>
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-heading group-hover:text-primary transition-colors">Webhooks & Alerts</span>
					<span class="text-[10px] font-mono text-emerald-400">Available</span>
				</div>
				<p class="text-[11px] text-label">
					Realtime threshold notifications for Slack, Discord, and custom HTTP endpoints when visitor spikes or anomalies occur.
				</p>
			</a>

			<a
				href="/settings/api-keys"
				class="card-inset p-4 flex flex-col gap-2 rounded-lg border border-themed hover:border-indigo-500/30 transition-all group"
			>
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-heading group-hover:text-primary transition-colors">REST Query API</span>
					<span class="text-[10px] font-mono text-emerald-400">Active</span>
				</div>
				<p class="text-[11px] text-label">
					Manage programmatic API keys to query raw time-series, rollups, and breakdown statistics directly into external BI dashboards.
				</p>
			</a>

			<div class="card-inset p-4 flex flex-col gap-2 rounded-lg border border-themed opacity-70">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-heading">BigQuery / Snowflake</span>
					<span class="text-[10px] font-mono text-hint">Roadmap</span>
				</div>
				<p class="text-[11px] text-label">
					Continuous streaming sink from ClickHouse into enterprise data warehouses for advanced SQL joins and customer data platform (CDP) sync.
				</p>
			</div>
		</div>
	</div>
</div>
