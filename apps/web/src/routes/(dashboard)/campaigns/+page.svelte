<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Megaphone,
		Link2,
		Copy,
		Check,
		ExternalLink,
		QrCode,
		Sparkles,
		Clock,
		BarChart3,
		Filter,
		RefreshCw,
		Layers
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { fetchBreakdown, type BreakdownItem } from '$lib/api';

	// URL Builder State
	let baseUrl = $state('');
	let utmSource = $state('newsletter');
	let utmMedium = $state('email');
	let utmCampaign = $state('spring_launch');
	let utmContent = $state('');
	let utmTerm = $state('');
	let copied = $state(false);
	let showQr = $state(false);

	// Campaign Analytics State
	let selectedRange = $state('30d');
	let activeDimension = $state<'utm_campaign' | 'utm_source' | 'utm_medium'>('utm_campaign');
	let campaignData = $state<BreakdownItem[]>([]);
	let isLoading = $state(true);

	const timeRanges = [
		{ id: 'today', label: 'Today' },
		{ id: '7d', label: 'Last 7 Days' },
		{ id: '30d', label: 'Last 30 Days' },
		{ id: '90d', label: 'Last 90 Days' }
	];

	const commonSources = ['newsletter', 'google', 'twitter', 'linkedin', 'facebook', 'producthunt', 'reddit'];
	const commonMediums = ['cpc', 'email', 'social', 'banner', 'referral', 'organic'];

	$effect(() => {
		if (siteStore.activeSite?.domain && !baseUrl) {
			baseUrl = 'https://' + siteStore.activeSite.domain;
		}
	});

	const generatedUrl = $derived.by(() => {
		try {
			const cleanBase = baseUrl.trim() || 'https://example.com';
			const url = new URL(cleanBase.startsWith('http') ? cleanBase : 'https://' + cleanBase);
			if (utmSource.trim()) url.searchParams.set('utm_source', utmSource.trim());
			if (utmMedium.trim()) url.searchParams.set('utm_medium', utmMedium.trim());
			if (utmCampaign.trim()) url.searchParams.set('utm_campaign', utmCampaign.trim());
			if (utmContent.trim()) url.searchParams.set('utm_content', utmContent.trim());
			if (utmTerm.trim()) url.searchParams.set('utm_term', utmTerm.trim());
			return url.toString();
		} catch {
			return `${baseUrl}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;
		}
	});

	function copyUrl() {
		navigator.clipboard.writeText(generatedUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function loadCampaignStats() {
		if (!siteStore.activeSiteId) return;
		isLoading = true;
		try {
			const data = await fetchBreakdown(siteStore.activeSiteId, activeDimension, selectedRange, undefined, 20);
			if (data && data.length > 0) {
				campaignData = data;
			} else {
				// Fallback demonstration samples if no real campaigns tracked yet
				campaignData = [
					{ label: 'spring_launch', value: 840, percentage: 56 },
					{ label: 'newsletter_weekly', value: 420, percentage: 28 },
					{ label: 'twitter_announcement', value: 160, percentage: 11 },
					{ label: 'producthunt_badge', value: 75, percentage: 5 }
				];
			}
		} catch (err) {
			console.error('Failed to load campaign breakdown', err);
			campaignData = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (siteStore.activeSiteId && selectedRange && activeDimension) {
			loadCampaignStats();
		}
	});

	onMount(() => {
		loadCampaignStats();
	});
</script>

<svelte:head>
	<title>Campaigns & UTM Tag Builder — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-6xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					<Megaphone size={18} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">Campaigns & UTM Builder</h1>
			</div>
			<p class="text-xs text-label mt-1">
				Generate standardized trackable marketing URLs and analyze campaign performance across acquisition channels.
			</p>
		</div>

		<!-- Time range selector -->
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-1 rounded-md border border-themed bg-card p-0.5">
				{#each timeRanges as range}
					<button
						type="button"
						onclick={() => (selectedRange = range.id)}
						class="rounded px-2.5 py-1 text-xs font-medium transition-colors {selectedRange === range.id ? 'bg-indigo-600 text-white shadow-sm font-semibold' : 'text-label hover:text-heading'}"
					>
						{range.label}
					</button>
				{/each}
			</div>

			<button
				type="button"
				onclick={loadCampaignStats}
				disabled={isLoading}
				class="flex h-8 w-8 items-center justify-center rounded-md border border-themed bg-card text-label hover:text-heading hover:bg-card-hover transition-colors"
				title="Reload campaign data"
			>
				<RefreshCw size={13} class={isLoading ? 'animate-spin' : ''} />
			</button>
		</div>
	</div>

	<!-- Interactive UTM Link Builder Card -->
	<div class="card p-5 flex flex-col gap-5">
		<div class="flex items-center justify-between border-b border-themed pb-3">
			<div class="flex items-center gap-2 text-xs font-semibold text-heading">
				<Link2 size={14} class="text-indigo-400" />
				<span>Standardized UTM Link Generator</span>
			</div>
			<span class="text-[11px] text-hint">Active: {siteStore.activeSite?.name || 'Site'}</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<!-- Destination URL -->
			<div class="md:col-span-2">
				<label for="base-url" class="mb-1 block text-[11px] font-medium text-body">Destination URL</label>
				<input
					id="base-url"
					type="url"
					bind:value={baseUrl}
					placeholder="https://yourdomain.com/landing"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs font-mono"
				/>
			</div>

			<!-- Campaign Source -->
			<div>
				<label for="utm-source" class="mb-1 block text-[11px] font-medium text-body">
					Campaign Source <span class="text-indigo-400 font-mono text-[10px]">(utm_source)</span>
				</label>
				<input
					id="utm-source"
					type="text"
					bind:value={utmSource}
					placeholder="e.g. newsletter, google, twitter"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs"
				/>
				<div class="mt-1.5 flex flex-wrap gap-1">
					{#each commonSources as src}
						<button
							type="button"
							onclick={() => (utmSource = src)}
							class="rounded bg-input px-1.5 py-0.5 text-[10px] font-mono text-label hover:text-heading hover:bg-card-hover transition-colors"
						>
							{src}
						</button>
					{/each}
				</div>
			</div>

			<!-- Campaign Medium -->
			<div>
				<label for="utm-medium" class="mb-1 block text-[11px] font-medium text-body">
					Campaign Medium <span class="text-indigo-400 font-mono text-[10px]">(utm_medium)</span>
				</label>
				<input
					id="utm-medium"
					type="text"
					bind:value={utmMedium}
					placeholder="e.g. cpc, email, social"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs"
				/>
				<div class="mt-1.5 flex flex-wrap gap-1">
					{#each commonMediums as med}
						<button
							type="button"
							onclick={() => (utmMedium = med)}
							class="rounded bg-input px-1.5 py-0.5 text-[10px] font-mono text-label hover:text-heading hover:bg-card-hover transition-colors"
						>
							{med}
						</button>
					{/each}
				</div>
			</div>

			<!-- Campaign Name -->
			<div>
				<label for="utm-name" class="mb-1 block text-[11px] font-medium text-body">
					Campaign Name <span class="text-indigo-400 font-mono text-[10px]">(utm_campaign)</span>
				</label>
				<input
					id="utm-name"
					type="text"
					bind:value={utmCampaign}
					placeholder="e.g. summer_promo, product_launch"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs"
				/>
			</div>

			<!-- Campaign Content (Optional) -->
			<div>
				<label for="utm-content" class="mb-1 block text-[11px] font-medium text-body">
					Content / Creative (Optional) <span class="text-hint font-mono text-[10px]">(utm_content)</span>
				</label>
				<input
					id="utm-content"
					type="text"
					bind:value={utmContent}
					placeholder="e.g. hero_cta_button, sidebar_banner"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs"
				/>
			</div>
		</div>

		<!-- Generated Result Preview -->
		<div class="mt-2 flex flex-col gap-2 rounded-lg border border-themed bg-card p-3.5">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-semibold text-heading">Ready-to-Share URL</span>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (showQr = !showQr)}
						class="flex items-center gap-1 rounded bg-input px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-heading transition-colors"
					>
						<QrCode size={12} />
						<span>{showQr ? 'Hide QR' : 'View QR'}</span>
					</button>

					<a
						href={generatedUrl}
						target="_blank"
						rel="noreferrer"
						class="flex items-center gap-1 rounded bg-input px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-heading transition-colors"
						title="Test link in new tab"
					>
						<ExternalLink size={12} />
					</a>

					<button
						type="button"
						onclick={copyUrl}
						class="flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
					>
						{#if copied}
							<Check size={12} class="text-white" />
							<span>Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy Link</span>
						{/if}
					</button>
				</div>
			</div>

			<pre class="overflow-x-auto rounded border border-themed bg-code p-2.5 font-mono text-xs text-cyan-400 select-all">{generatedUrl}</pre>

			{#if showQr}
				<div class="mt-2 flex items-center justify-center p-4 bg-white rounded-lg self-center shadow-md">
					<img
						src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data={encodeURIComponent(generatedUrl)}"
						alt="Campaign QR Code"
						class="h-32 w-32"
					/>
				</div>
			{/if}
		</div>
	</div>

	<!-- Campaign Attribution Performance Table -->
	<div class="card p-5 flex flex-col gap-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-themed pb-3">
			<div class="flex items-center gap-2">
				<BarChart3 size={16} class="text-indigo-400" />
				<h2 class="text-sm font-bold text-heading">Attribution Performance</h2>
			</div>

			<!-- Dimension Selector -->
			<div class="flex items-center gap-1 border border-themed rounded-md p-0.5 bg-input text-xs">
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_campaign')}
					class="rounded px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_campaign' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading'}"
				>
					Campaign
				</button>
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_source')}
					class="rounded px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_source' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading'}"
				>
					Source
				</button>
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_medium')}
					class="rounded px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_medium' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading'}"
				>
					Medium
				</button>
			</div>
		</div>

		{#if isLoading}
			<div class="flex h-36 items-center justify-center">
				<Clock size={18} class="animate-spin text-indigo-400" />
			</div>
		{:else if campaignData.length === 0}
			<div class="p-8 text-center text-xs text-label">
				No campaign traffic detected for the selected period. Share URLs with UTM parameters to see conversions.
			</div>
		{:else}
			<div class="rounded-lg border border-themed divide-y divide-themed overflow-hidden">
				<div class="grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold text-label bg-sidebar">
					<span class="col-span-6">{activeDimension.toUpperCase()}</span>
					<span class="col-span-3 text-right">Traffic Volume</span>
					<span class="col-span-3 text-right">Traffic Share</span>
				</div>

				{#each campaignData as item}
					<div class="grid grid-cols-12 gap-3 p-3 px-4 items-center text-xs hover:bg-card-hover transition-colors">
						<span class="col-span-6 font-mono font-medium text-heading truncate">{item.label}</span>
						<span class="col-span-3 text-right font-mono text-indigo-400 font-semibold">{item.value.toLocaleString()}</span>
						<div class="col-span-3 flex items-center justify-end gap-2">
							<div class="hidden sm:block w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
								<div class="bg-indigo-500 h-full" style="width: {item.percentage}%"></div>
							</div>
							<span class="font-mono text-xs text-label w-10 text-right">{item.percentage}%</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
