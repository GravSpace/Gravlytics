<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		ShoppingBag,
		DollarSign,
		ShoppingCart,
		TrendingUp,
		Percent,
		RefreshCw,
		ExternalLink,
		PackageCheck,
		Copy,
		Check,
		CreditCard,
		Code2,
		Layers
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import { fetchEcommerce, type EcommerceOverviewResult, type TransactionItem } from '$lib/api';
	import KPICard from '$lib/components/KPICard.svelte';

	let ecommerceData = $state<EcommerceOverviewResult | null>(null);
	let isLoading = $state(true);
	let activeTab = $state<'js' | 'datalayer' | 'shopify'>('js');
	let copied = $state(false);

	async function loadEcommerceStats() {
		const siteId = siteStore.activeSiteId;
		if (!siteId) return;
		isLoading = true;
		try {
			const res = await fetchEcommerce(siteId, dateStore.from, dateStore.to);
			ecommerceData = res;
		} catch (err) {
			console.error('Failed to load ecommerce stats', err);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const s = siteStore.activeSiteId;
		const v = dateStore.version;
		if (s) {
			untrack(() => {
				loadEcommerceStats();
			});
		}
	});

	onMount(() => {
		loadEcommerceStats();
	});

	function formatCurrency(amount: number, currency: string = 'USD'): string {
		try {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: currency || 'USD',
				maximumFractionDigits: 2
			}).format(amount);
		} catch {
			return `$${amount.toFixed(2)}`;
		}
	}

	function copySnippet(text: string) {
		navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	const maxRevPoint = $derived(
		Math.max(...(ecommerceData?.revenue_timeseries?.map((d) => Number(d.pageviews)) || [1]), 1)
	);
</script>

<svelte:head>
	<title>E-commerce & Revenue — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-7xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col">
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
					<ShoppingBag size={18} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">E-commerce & Revenue Analytics</h1>
			</div>
			<p class="text-xs text-label mt-1">
				Real-time sales tracking, average order value, conversion velocity, and transaction logs.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={loadEcommerceStats}
				disabled={isLoading}
				class="btn-ghost flex items-center gap-1.5 rounded-lg border border-themed px-3 py-1.5 text-xs text-body hover:text-heading cursor-pointer shadow-sm"
			>
				<RefreshCw size={13} class={isLoading ? 'animate-spin' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- KPI Summary Cards -->
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<KPICard
			label="Total Revenue"
			value={formatCurrency(ecommerceData?.total_revenue || 0)}
			icon={DollarSign}
			subtitle="Gross sales for selected range"
		/>
		<KPICard
			label="Completed Orders"
			value={(ecommerceData?.total_orders || 0).toLocaleString()}
			icon={ShoppingCart}
			subtitle="Unique purchase events"
		/>
		<KPICard
			label="Average Order Value"
			value={formatCurrency(ecommerceData?.average_order_value || 0)}
			icon={TrendingUp}
			subtitle="Revenue per transaction"
		/>
		<KPICard
			label="E-comm Conversion Rate"
			value={`${(ecommerceData?.conversion_rate || 0).toFixed(2)}%`}
			icon={Percent}
			subtitle="Orders relative to sessions"
		/>
	</div>

	<!-- Revenue Trend Over Time -->
	<div class="card-inset flex flex-col p-4">
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
					<DollarSign size={13} strokeWidth={2} />
				</div>
				<h2 class="text-xs font-semibold text-heading">Revenue Daily Trend</h2>
			</div>
			<span class="text-[10px] text-hint">ClickHouse aggregate by date</span>
		</div>

		{#if isLoading}
			<div class="flex h-44 items-center justify-center">
				<RefreshCw size={18} class="animate-spin text-hint" />
			</div>
		{:else if !ecommerceData?.revenue_timeseries || ecommerceData.revenue_timeseries.length === 0}
			<div class="flex h-44 flex-col items-center justify-center text-center text-label">
				<PackageCheck size={28} class="mb-2 text-hint opacity-40" />
				<span class="text-xs font-medium text-body">No sales recorded in this date range</span>
				<span class="text-[11px] text-hint mt-0.5">Use the integration snippets below to record checkout purchases.</span>
			</div>
		{:else}
			<div class="flex h-44 items-end gap-1.5 pt-4">
				{#each ecommerceData.revenue_timeseries as point}
					{@const rev = Number(point.pageviews)}
					{@const orders = Number(point.unique_visitors || point.visitors || 0)}
					{@const heightPercent = Math.max((rev / maxRevPoint) * 100, 4)}
					<div class="group relative flex flex-1 flex-col items-center h-full justify-end">
						<!-- Tooltip -->
						<div class="pointer-events-none absolute -top-12 z-20 hidden flex-col items-center rounded bg-surface border border-themed px-2 py-1 shadow-lg group-hover:flex whitespace-nowrap">
							<span class="text-[10px] font-semibold text-emerald-400">{formatCurrency(rev)}</span>
							<span class="text-[9px] text-label">{orders} orders • {point.date}</span>
						</div>

						<!-- Bar -->
						<div
							class="w-full max-w-[32px] rounded-t bg-gradient-to-t from-emerald-500/30 to-emerald-400/80 transition-all duration-200 group-hover:from-emerald-500/50 group-hover:to-emerald-400"
							style="height: {heightPercent}%; min-height: 4px;"
						></div>

						<!-- Date Label -->
						<span class="mt-2 text-[9px] text-hint truncate w-full text-center">
							{point.date?.slice(5)}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent Transactions Table -->
	<div class="card-inset flex flex-col p-4">
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
					<CreditCard size={13} strokeWidth={2} />
				</div>
				<h2 class="text-xs font-semibold text-heading">Recent Transactions</h2>
			</div>
			<span class="text-[10px] text-hint">Latest purchases</span>
		</div>

		{#if isLoading}
			<div class="flex h-32 items-center justify-center">
				<RefreshCw size={16} class="animate-spin text-hint" />
			</div>
		{:else if !ecommerceData?.recent_orders || ecommerceData.recent_orders.length === 0}
			<div class="flex h-32 flex-col items-center justify-center text-center text-label">
				<ShoppingCart size={24} class="mb-2 text-hint opacity-40" />
				<span class="text-xs font-medium text-body">No orders detected yet</span>
				<span class="text-[11px] text-hint mt-0.5">Purchases sent via SDK or dataLayer will appear here instantly.</span>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-themed text-[10px] font-semibold text-label">
							<th class="pb-2">Order ID</th>
							<th class="pb-2">Date & Time</th>
							<th class="pb-2">Checkout Path</th>
							<th class="pb-2 text-center">Items</th>
							<th class="pb-2 text-right">Revenue</th>
							<th class="pb-2 text-right">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-themed">
						{#each ecommerceData.recent_orders as order}
							<tr class="group hover:bg-card-hover/40 transition-colors">
								<td class="py-2.5 font-mono text-[11px] font-medium text-heading">
									{order.order_id}
								</td>
								<td class="py-2.5 text-[11px] text-label">
									{order.timestamp}
								</td>
								<td class="py-2.5 font-mono text-[11px] text-body max-w-[200px] truncate" title={order.url_path}>
									{order.url_path || '/'}
								</td>
								<td class="py-2.5 text-center text-[11px] text-body">
									{order.items_count || 1}
								</td>
								<td class="py-2.5 text-right font-mono text-[11px] font-semibold text-emerald-400">
									{formatCurrency(order.revenue, order.currency)}
								</td>
								<td class="py-2.5 text-right">
									<span class="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400 border border-emerald-500/20">
										Completed
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Integration Guide Section -->
	<div class="card-inset flex flex-col p-4">
		<div class="mb-3 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
					<Code2 size={13} strokeWidth={2} />
				</div>
				<h2 class="text-xs font-semibold text-heading">E-commerce Integration Snippets</h2>
			</div>

			<div class="flex items-center gap-1 rounded-lg border border-themed bg-input p-0.5 text-[11px]">
				<button
					type="button"
					onclick={() => (activeTab = 'js')}
					class="rounded px-2.5 py-1 font-medium transition-colors {activeTab === 'js' ? 'bg-card-hover text-heading shadow-xs' : 'text-label hover:text-body'}"
				>
					JavaScript SDK
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'datalayer')}
					class="rounded px-2.5 py-1 font-medium transition-colors {activeTab === 'datalayer' ? 'bg-card-hover text-heading shadow-xs' : 'text-label hover:text-body'}"
				>
					GTM dataLayer (Auto)
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'shopify')}
					class="rounded px-2.5 py-1 font-medium transition-colors {activeTab === 'shopify' ? 'bg-card-hover text-heading shadow-xs' : 'text-label hover:text-body'}"
				>
					Shopify / Liquid
				</button>
			</div>
		</div>

		<div class="relative mt-2 rounded-lg border border-themed bg-surface/80 p-3 font-mono text-xs">
			{#if activeTab === 'js'}
				{@const code = `// Record a completed purchase
gravlytics.ecommerce.purchase({
  order_id: 'ord_98741',
  revenue: 89.99,
  currency: 'USD',
  items_count: 3
});`}
				<div class="flex items-center justify-between text-hint text-[10px] pb-2 border-b border-themed">
					<span>Call on your order confirmation / thank you page</span>
					<button
						type="button"
						onclick={() => copySnippet(code)}
						class="flex items-center gap-1 text-label hover:text-heading cursor-pointer"
					>
						{#if copied}<Check size={11} class="text-emerald-400" />{:else}<Copy size={11} />{/if}
						<span>{copied ? 'Copied' : 'Copy'}</span>
					</button>
				</div>
				<pre class="mt-2 text-label whitespace-pre-wrap">{code}</pre>
			{:else if activeTab === 'datalayer'}
				{@const code = `// Gravlytics automatically intercepts standard GA4 / GTM purchase events!
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T_12345',
    value: 129.00,
    currency: 'USD',
    items: [{ item_name: 'Premium Subscription', price: 129.00 }]
  }
});`}
				<div class="flex items-center justify-between text-hint text-[10px] pb-2 border-b border-themed">
					<span>Zero-config GA4 compatibility: automated event listener</span>
					<button
						type="button"
						onclick={() => copySnippet(code)}
						class="flex items-center gap-1 text-label hover:text-heading cursor-pointer"
					>
						{#if copied}<Check size={11} class="text-emerald-400" />{:else}<Copy size={11} />{/if}
						<span>{copied ? 'Copied' : 'Copy'}</span>
					</button>
				</div>
				<pre class="mt-2 text-label whitespace-pre-wrap">{code}</pre>
			{:else}
				{@const code = `<!-- Add to Shopify Admin > Settings > Checkout > Additional Scripts -->
<script>
  if (window.gravlytics) {
    gravlytics.ecommerce.purchase({
      order_id: '{{ order_number }}',
      revenue: {{ total_price | money_without_currency | remove: ',' }},
      currency: '{{ shop.currency }}',
      items_count: {{ line_items | size }}
    });
  }
<\/script>`}
				<div class="flex items-center justify-between text-hint text-[10px] pb-2 border-b border-themed">
					<span>Paste into Shopify Checkout Additional Scripts</span>
					<button
						type="button"
						onclick={() => copySnippet(code)}
						class="flex items-center gap-1 text-label hover:text-heading cursor-pointer"
					>
						{#if copied}<Check size={11} class="text-emerald-400" />{:else}<Copy size={11} />{/if}
						<span>{copied ? 'Copied' : 'Copy'}</span>
					</button>
				</div>
				<pre class="mt-2 text-label whitespace-pre-wrap">{code}</pre>
			{/if}
		</div>
	</div>
</div>
