<script lang="ts">
	import { onMount, untrack } from 'svelte';
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
		Layers,
		Users,
		Globe,
		Tag,
		TrendingUp,
		Share2
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import {
		fetchBreakdown,
		fetchCampaignOverview,
		type BreakdownItem,
		type CampaignOverviewResult
	} from '$lib/api';
	import KPICard from '$lib/components/KPICard.svelte';

	// URL Builder State
	let baseUrl = $state('');
	let utmSource = $state('newsletter');
	let utmMedium = $state('email');
	let utmCampaign = $state('spring_launch');
	let utmContent = $state('');
	let utmTerm = $state('');
	let copied = $state(false);

	// Campaign Analytics State
	let activeDimension = $state<'utm_campaign' | 'utm_source' | 'utm_medium' | 'utm_term' | 'utm_content'>('utm_campaign');
	let campaignData = $state<BreakdownItem[]>([]);
	let campaignOverview = $state<CampaignOverviewResult | null>(null);
	let isLoading = $state(true);

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
		const siteId = siteStore.activeSiteId;
		if (!siteId) return;
		isLoading = true;
		try {
			const [overview, data] = await Promise.all([
				fetchCampaignOverview(siteId, dateStore.from, dateStore.to),
				fetchBreakdown(siteId, activeDimension, dateStore.from, dateStore.to, 50)
			]);
			campaignOverview = overview;
			campaignData = data || [];
		} catch (err) {
			console.error('Failed to load campaign breakdown', err);
			campaignData = [];
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const s = siteStore.activeSiteId;
		const v = dateStore.version;
		const dim = activeDimension;
		if (s) {
			untrack(() => {
				loadCampaignStats();
			});
		}
	});

	onMount(() => {
		loadCampaignStats();
	});
</script>

<svelte:head>
	<title>Campaigns & UTM Analytics — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-6xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					<Megaphone size={18} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">Campaigns & UTM Attribution</h1>
			</div>
			<p class="text-xs text-label mt-1">
				Track multi-channel marketing campaigns, attribution source tags, and build trackable UTM links.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={loadCampaignStats}
				disabled={isLoading}
				class="btn-ghost flex items-center gap-1.5 rounded-lg border border-themed px-3 py-1.5 text-xs text-body hover:text-heading cursor-pointer shadow-sm"
				title="Reload campaign data"
			>
				<RefreshCw size={13} class={isLoading ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- Campaign Summary KPIs -->
	{#if campaignOverview}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<KPICard
				label="Campaign Visitors"
				value={campaignOverview.total_visitors}
				icon={Users}
				subtitle="Unique visitors from UTMs"
			/>
			<KPICard
				label="Campaign Sessions"
				value={campaignOverview.total_sessions}
				icon={BarChart3}
				subtitle="Total tracked sessions"
			/>
			<KPICard
				label="Campaign Bounce Rate"
				value={campaignOverview.bounce_rate}
				format="percent"
				icon={TrendingUp}
				subtitle="Single page sessions"
			/>
			<div class="card flex flex-col justify-between p-4">
				<span class="text-[11px] font-semibold uppercase tracking-wider text-label">Top Campaign</span>
				<div class="mt-2 flex flex-col">
					<span class="text-lg font-bold text-heading truncate">{campaignOverview.top_campaign || 'None'}</span>
					<span class="text-[11px] text-hint mt-0.5">Medium: {campaignOverview.top_medium || 'N/A'}</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Interactive UTM Link Builder Card -->
	<div class="card p-5 flex flex-col gap-5">
		<div class="flex items-center justify-between border-b border-themed pb-3">
			<div class="flex items-center gap-2 text-xs font-semibold text-heading">
				<Link2 size={14} class="text-indigo-400" />
				<span>Standardized UTM Link Generator</span>
			</div>
			<span class="text-[11px] text-hint font-mono">{siteStore.activeSite?.domain || 'Active Domain'}</span>
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

			<!-- Campaign Term -->
			<div>
				<label for="utm-term" class="mb-1 block text-[11px] font-medium text-body">
					Search Term / Keyword (Optional) <span class="text-hint font-mono text-[10px]">(utm_term)</span>
				</label>
				<input
					id="utm-term"
					type="text"
					bind:value={utmTerm}
					placeholder="e.g. cloud_analytics"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs"
				/>
			</div>

			<!-- Campaign Content (Optional) -->
			<div class="md:col-span-2">
				<label for="utm-content" class="mb-1 block text-[11px] font-medium text-body">
					Content / Creative Variant (Optional) <span class="text-hint font-mono text-[10px]">(utm_content)</span>
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

		<!-- Generated URL Output Area -->
		<div class="rounded-xl border border-themed bg-input/40 p-4 flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<span class="text-[11px] font-semibold text-heading">Generated Campaign Link</span>
				<button
					type="button"
					onclick={copyUrl}
					class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
				>
					{#if copied}
						<Check size={13} />
						<span>Copied!</span>
					{:else}
						<Copy size={13} />
						<span>Copy Link</span>
					{/if}
				</button>
			</div>
			<div class="p-2.5 rounded-lg bg-input font-mono text-xs text-indigo-300 break-all select-all border border-themed/60">
				{generatedUrl}
			</div>
		</div>
	</div>

	<!-- Campaign Analytics Breakdown Table -->
	<div class="card p-5 flex flex-col gap-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-themed pb-3">
			<div class="flex items-center gap-2">
				<BarChart3 size={16} class="text-indigo-400" />
				<h3 class="font-semibold text-sm text-heading">Traffic Attribution Breakdown</h3>
			</div>

			<!-- Dimension Switcher -->
			<div class="flex items-center gap-1 rounded-lg border border-themed bg-input p-0.5 text-xs">
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_campaign')}
					class="rounded-md px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_campaign' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
				>
					Campaign
				</button>
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_source')}
					class="rounded-md px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_source' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
				>
					Source
				</button>
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_medium')}
					class="rounded-md px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_medium' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
				>
					Medium
				</button>
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_term')}
					class="rounded-md px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_term' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
				>
					Term
				</button>
				<button
					type="button"
					onclick={() => (activeDimension = 'utm_content')}
					class="rounded-md px-2.5 py-1 font-medium transition-colors {activeDimension === 'utm_content' ? 'bg-indigo-600 text-white font-semibold' : 'text-label hover:text-heading'}"
				>
					Content
				</button>
			</div>
		</div>

		<!-- Table content -->
		{#if isLoading}
			<div class="flex h-36 items-center justify-center text-xs text-hint">
				Loading campaign metrics...
			</div>
		{:else if campaignData.length === 0}
			<div class="flex flex-col items-center justify-center h-44 text-center p-6 border border-dashed border-themed rounded-xl">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-input text-hint mb-2">
					<Tag size={18} />
				</div>
				<span class="text-sm font-semibold text-heading">No campaign parameters detected</span>
				<p class="text-xs text-hint mt-1 max-w-sm">
					Use the UTM link generator above to tag your incoming marketing links and analyze campaign traffic here.
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-themed text-[11px] font-semibold text-hint">
							<th class="py-2 px-3">Name</th>
							<th class="py-2 px-3 text-right">Visitors</th>
							<th class="py-2 px-3 text-right">Pageviews</th>
							<th class="py-2 px-3 text-right">Share</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-themed/50 font-mono">
						{#each campaignData as item}
							{@const maxVal = Math.max(...campaignData.map(d => d.value), 1)}
							{@const sharePct = Math.round((item.value / maxVal) * 100)}
							<tr class="hover:bg-card-hover transition-colors">
								<td class="py-2.5 px-3 font-medium text-heading">
									<div class="flex items-center gap-2">
										<span class="truncate max-w-md">{item.label}</span>
									</div>
								</td>
								<td class="py-2.5 px-3 text-right font-bold text-heading">
									{item.value.toLocaleString()}
								</td>
								<td class="py-2.5 px-3 text-right text-hint">
									{(item.percentage || item.value).toLocaleString()}
								</td>
								<td class="py-2.5 px-3 text-right">
									<div class="flex items-center justify-end gap-2">
										<div class="w-16 h-1.5 rounded-full bg-input overflow-hidden">
											<div class="h-full bg-indigo-500 rounded-full" style="width: {sharePct}%"></div>
										</div>
										<span class="text-[10px] text-hint w-8">{sharePct}%</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
