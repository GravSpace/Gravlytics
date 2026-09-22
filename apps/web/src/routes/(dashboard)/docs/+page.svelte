<script lang="ts">
	import {
		BookOpen,
		Code2,
		Copy,
		Check,
		Layers,
		Zap,
		Globe,
		Terminal,
		CheckCircle2,
		Tag,
		Sparkles,
		ExternalLink,
		Server,
		ShieldCheck,
		Key,
		ArrowRight,
		Gauge,
		Megaphone
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';

	let activeTab = $state<'gtm' | 'script' | 'datalayer' | 'attributes' | 'sdk' | 'api' | 'security'>('gtm');
	let copiedSnippet = $state<string | null>(null);

	const docTabs = [
		{ id: 'gtm', label: 'Google Tag Manager', icon: Tag },
		{ id: 'script', label: 'Script Tag & Frameworks', icon: Globe },
		{ id: 'datalayer', label: 'Google dataLayer', icon: Layers },
		{ id: 'attributes', label: 'HTML Attributes', icon: Code2 },
		{ id: 'sdk', label: 'JavaScript SDK', icon: Zap },
		{ id: 'api', label: 'External REST API', icon: Server },
		{ id: 'security', label: 'Bot & DDoS Protection', icon: ShieldCheck }
	] as const;

	let activeApiLang = $state<'curl' | 'js' | 'python'>('curl');

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedSnippet = id;
		setTimeout(() => {
			if (copiedSnippet === id) copiedSnippet = null;
		}, 2000);
	}

	const activeSiteId = $derived(siteStore.activeSiteId || 'YOUR_TRACKING_ID');

	const gtmSnippet = $derived(
`<!-- Gravlytics Analytics Tag for Google Tag Manager -->
<script
  defer
  data-site-id="${activeSiteId}"
  src="http://localhost:8081/gravlytics.min.js"
><\/script>`
	);

	const htmlScriptSnippet = $derived(
`<!-- Paste this script inside your website's <head> tag -->
<script
  defer
  data-site-id="${activeSiteId}"
  src="http://localhost:8081/gravlytics.min.js"
><\/script>`
	);

	const nextjsSnippet = $derived(
`// app/layout.tsx (Next.js 14+ App Router)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          data-site-id="${activeSiteId}"
          src="http://localhost:8081/gravlytics.min.js"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`
	);

	const dataLayerEventSnippet = `// Custom event tracking via Google dataLayer
window.dataLayer = window.dataLayer || [];

window.dataLayer.push({
  event: 'purchase',
  transaction_id: 'TX_9921',
  value: 149.00,
  currency: 'USD',
  item_category: 'Electronics',
  customer_tier: 'Gold'
});`;

	const dataLayerSchemaSnippet = `<!-- Page Context Schema (Publication Date, Category, Author/Editor, etc.) -->
<!-- Gravlytics automatically ingests all attributes into session dimensions -->
<script>
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    publish_date: "2026-09-22 15:30",
    category: "Technology",
    author: "Editorial Team",
    editor: "Desk Editor",
    id: "ART_88192",
    topic: "Analytics",
    tag: "Gravlytics, Web Analytics, Realtime",
    code: 200
  });
<\/script>`;

	const htmlAttrSnippet = `<!-- Declarative HTML Tracking (Zero JavaScript required) -->
<button
  data-gravlytics-event="Subscription Upgrade"
  data-gravlytics-event-tier="pro"
  data-gravlytics-event-price="99"
  data-gravlytics-event-billing="monthly"
>
  Upgrade to Pro
</button>

<!-- 100% compatible with Umami data attributes: -->
<a
  href="/demo"
  data-umami-event="View Demo"
  data-umami-event-source="hero_cta"
>
  Try Interactive Demo
</a>`;

	const jsSdkSnippet = `// 1. Track Custom Events
gravlytics.track('checkout_completed', {
  order_id: 'ORD_9921',
  amount: 250.00,
  payment_method: 'credit_card'
});

// 2. Track Function Execution
document.getElementById('btn-signup').addEventListener('click', gravlytics.track(function() {
  executeSignupFlow();
}, 'click_signup_button', { position: 'header' }));

// 3. Ad & Viewability Tracking
gravlytics.ad.impression('header_leaderboard');
gravlytics.ad.viewable('header_leaderboard', 1.8);
gravlytics.ad.click('header_leaderboard');

// 4. Identify Users
gravlytics.identify('user_10283', { plan: 'enterprise', role: 'admin' });`;

	const apiExamples = $derived({
		curl: `# 1. Fetch Top 5 Most Visited Pages (Top 5 Pageviews)
curl -X GET "http://localhost:5174/api/v1/external/top-pages?limit=5&period=30d" \\
  -H "Authorization: Bearer ${activeSiteId}"

# 2. Fetch Metrics Overview (Visitors, Pageviews, Bounce Rate)
curl -X GET "http://localhost:5174/api/v1/external/overview?period=7d" \\
  -H "Authorization: Bearer ${activeSiteId}"

# 3. Fetch Realtime Active Visitors
curl -X GET "http://localhost:5174/api/v1/external/realtime" \\
  -H "Authorization: Bearer ${activeSiteId}"

# 4. Ingest Analytics Event from Server / CMS Backend
curl -X POST "http://localhost:5174/api/v1/external/event" \\
  -H "Authorization: Bearer ${activeSiteId}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "article_read_complete",
    "url_path": "/news/digital-economy-2026",
    "props": {
      "category": "economy",
      "reading_time_seconds": 180
    }
  }'`,

		js: `// JavaScript Fetch / Node.js Integration
const API_BASE = 'http://localhost:5174/api/v1/external';
const API_KEY = '${activeSiteId}';

// 1. Fetch Top 5 Popular Pages
async function getTopPages() {
  const res = await fetch(\`\${API_BASE}/top-pages?limit=5&period=30d\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  const data = await res.json();
  console.log('Top 5 Pages:', data.top_pages);
}

// 2. Ingest Server-side Event from Backend
async function trackServerEvent(eventName, properties) {
  const res = await fetch(\`\${API_BASE}/event\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: eventName,
      url_path: '/checkout',
      props: properties
    })
  });
  return await res.json();
}`,

		python: `# Python (requests) Integration
import requests

API_BASE = "http://localhost:5174/api/v1/external"
HEADERS = {"Authorization": "Bearer ${activeSiteId}"}

# 1. Fetch Top 5 Most Visited Pages
res = requests.get(f"{API_BASE}/top-pages", params={"limit": 5, "period": "30d"}, headers=HEADERS)
top_pages = res.json().get("top_pages", [])
for p in top_pages:
    print(f"#{p['rank']} {p['path']}: {p['pageviews']} pageviews ({p['visitors']} visitors)")

# 2. Fetch Realtime Active Visitors
realtime = requests.get(f"{API_BASE}/realtime", headers=HEADERS).json()
print("Active Visitors:", realtime["active_visitors"])

# 3. Ingest Server-Side Event (e.g. from CMS or Django backend)
payload = {
    "name": "payment_confirmed",
    "url_path": "/api/transaction",
    "props": {
        "gateway": "stripe",
        "status": "paid"
    }
}
requests.post(f"{API_BASE}/event", json=payload, headers=HEADERS)`
	});
</script>

<svelte:head>
	<title>Documentation & API Integration Guide — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-5xl">
	<!-- Header -->
	<div class="flex flex-col gap-1.5 border-b border-themed pb-5">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div class="flex items-center gap-2.5">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					<BookOpen size={20} />
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading">Documentation & Integration Guide</h1>
			</div>
			<a
				href="/docs/proxy"
				class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-emerald-600/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/20 transition-colors"
			>
				<ShieldCheck size={14} />
				<span>AdBlocker Bypass Wizard</span>
				<ArrowRight size={12} />
			</a>
		</div>
		<p class="text-xs text-label">
			Comprehensive guide for Google Tag Manager, HTML analytics scripts, Google dataLayer, Web Vitals, Ads Viewability, Bot/DDoS Mitigation, and External REST API Reference.
		</p>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 overflow-x-auto border-b border-themed pb-2.5 text-xs no-scrollbar">
		{#each docTabs as tab}
			<button
				onclick={() => (activeTab = tab.id)}
				class="group flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer {activeTab === tab.id
					? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 font-semibold'
					: 'text-label hover:text-heading hover:bg-card-hover border border-transparent'}"
			>
				<tab.icon size={14} class="shrink-0 {activeTab === tab.id ? 'text-white' : 'text-label group-hover:text-heading transition-colors'}" />
				<span class="whitespace-nowrap">{tab.label}</span>
			</button>
		{/each}
	</div>

	<!-- TAB 1: GOOGLE TAG MANAGER -->
	{#if activeTab === 'gtm'}
		<div class="flex flex-col gap-5">
			<div class="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col gap-2">
				<div class="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
					<Sparkles size={15} />
					<span>Full Google Tag Manager (GTM) Compatibility</span>
				</div>
				<p class="text-xs leading-relaxed text-label">
					Gravlytics can be deployed seamlessly via Google Tag Manager without editing your website source code. Once installed, the tracker automatically listens to all <code class="px-1 py-0.5 rounded bg-card border border-themed text-indigo-400 font-mono">dataLayer.push</code> events and single-page application (SPA) route changes.
				</p>
			</div>

			<!-- Step by Step Setup -->
			<div class="flex flex-col gap-3">
				<h2 class="text-sm font-semibold text-heading">Google Tag Manager Setup (5 Easy Steps)</h2>

				<div class="grid grid-cols-1 gap-3">
					<div class="rounded-lg border border-themed bg-card p-4 flex gap-3.5">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</div>
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-heading">Open GTM & Create a New Tag</span>
							<p class="text-xs text-label">Go to your Google Tag Manager container, select <strong>Tags</strong> in the left navigation, then click <strong>New</strong>.</p>
						</div>
					</div>

					<div class="rounded-lg border border-themed bg-card p-4 flex gap-3.5">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</div>
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-heading">Choose Tag Type: Custom HTML</span>
							<p class="text-xs text-label">In the Tag Configuration panel, select <strong>Custom HTML</strong> as the tag type.</p>
						</div>
					</div>

					<div class="rounded-lg border border-themed bg-card p-4 flex gap-3.5">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">3</div>
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-heading">Paste the Gravlytics Script Tag</span>
							<p class="text-xs text-label">Copy and paste the code snippet below into the HTML textarea:</p>
							<div class="relative mt-2 rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
								<button
									onclick={() => copyToClipboard(gtmSnippet, 'gtm')}
									class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
								>
									{#if copiedSnippet === 'gtm'}
										<Check size={12} class="text-emerald-400" />
										<span class="text-emerald-400">Copied!</span>
									{:else}
										<Copy size={12} />
										<span>Copy</span>
									{/if}
								</button>
								<pre class="overflow-x-auto pr-16">{gtmSnippet}</pre>
							</div>
						</div>
					</div>

					<div class="rounded-lg border border-themed bg-card p-4 flex gap-3.5">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">4</div>
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-heading">Set Trigger: All Pages / Window Loaded</span>
							<p class="text-xs text-label">Select <strong>Initialization - All Pages</strong> or <strong>All Pages</strong> to ensure analytics runs on every pageview.</p>
						</div>
					</div>

					<div class="rounded-lg border border-themed bg-card p-4 flex gap-3.5">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">5</div>
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-heading">Save & Publish Container</span>
							<p class="text-xs text-label">Click <strong>Save</strong>, then click <strong>Submit &gt; Publish</strong> in the top-right corner to deploy the container changes.</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 2: SCRIPT TAG & FRAMEWORKS -->
	{#if activeTab === 'script'}
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-2">
				<h2 class="text-sm font-semibold text-heading">Standard HTML Script Tag</h2>
				<p class="text-xs text-label">Paste the script below into your web page's <code class="text-indigo-400 font-mono">&lt;head&gt;</code> tag:</p>

				<div class="relative rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
					<button
						onclick={() => copyToClipboard(htmlScriptSnippet, 'html')}
						class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
					>
						{#if copiedSnippet === 'html'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
					<pre class="overflow-x-auto pr-16">{htmlScriptSnippet}</pre>
				</div>
			</div>

			<div class="flex flex-col gap-2 pt-2">
				<h2 class="text-sm font-semibold text-heading">Next.js (App Router 14+)</h2>
				<p class="text-xs text-label">Use Next.js built-in <code class="text-indigo-400 font-mono">next/script</code> component with the <code class="text-indigo-400 font-mono">afterInteractive</code> strategy:</p>

				<div class="relative rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
					<button
						onclick={() => copyToClipboard(nextjsSnippet, 'nextjs')}
						class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
					>
						{#if copiedSnippet === 'nextjs'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
					<pre class="overflow-x-auto pr-16">{nextjsSnippet}</pre>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 3: GOOGLE DATALAYER -->
	{#if activeTab === 'datalayer'}
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-2">
				<h2 class="text-sm font-semibold text-heading">Google dataLayer Event Tracking</h2>
				<p class="text-xs text-label">Gravlytics automatically intercepts calls made to <code class="text-indigo-400 font-mono">window.dataLayer.push</code>:</p>

				<div class="relative rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
					<button
						onclick={() => copyToClipboard(dataLayerEventSnippet, 'dlevent')}
						class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
					>
						{#if copiedSnippet === 'dlevent'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
					<pre class="overflow-x-auto pr-16">{dataLayerEventSnippet}</pre>
				</div>
			</div>

			<div class="flex flex-col gap-2 pt-2">
				<h2 class="text-sm font-semibold text-heading">Editorial & News Portal Page Context Schema</h2>
				<p class="text-xs text-label">Attributes like author, category, publication date, and article ID are automatically ingested into session dimensions:</p>

				<div class="relative rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
					<button
						onclick={() => copyToClipboard(dataLayerSchemaSnippet, 'dlschema')}
						class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
					>
						{#if copiedSnippet === 'dlschema'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
					<pre class="overflow-x-auto pr-16">{dataLayerSchemaSnippet}</pre>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 4: ATRIBUT HTML -->
	{#if activeTab === 'attributes'}
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-2">
				<h2 class="text-sm font-semibold text-heading">Zero-JavaScript Declarative Tracking</h2>
				<p class="text-xs text-label">Embed tracking attributes directly onto button, link, or form elements. Fully compatible with Gravlytics and Umami attributes:</p>

				<div class="relative rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
					<button
						onclick={() => copyToClipboard(htmlAttrSnippet, 'htmlattr')}
						class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
					>
						{#if copiedSnippet === 'htmlattr'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
					<pre class="overflow-x-auto pr-16">{htmlAttrSnippet}</pre>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 5: JAVASCRIPT SDK -->
	{#if activeTab === 'sdk'}
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-2">
				<h2 class="text-sm font-semibold text-heading">JavaScript Client SDK</h2>
				<p class="text-xs text-label">The tracker exposes a global <code class="text-indigo-400 font-mono">window.gravlytics</code> object (with <code class="text-indigo-400 font-mono">window.umami</code> alias):</p>

				<div class="relative rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
					<button
						onclick={() => copyToClipboard(jsSdkSnippet, 'jssdk')}
						class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
					>
						{#if copiedSnippet === 'jssdk'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
					<pre class="overflow-x-auto pr-16">{jsSdkSnippet}</pre>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 6: REST API EKSTERNAL -->
	{#if activeTab === 'api'}
		<div class="flex flex-col gap-6" id="api-external">
			<div class="rounded-lg border border-themed bg-card p-4 flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-heading font-semibold text-xs">
						<Key size={15} class="text-indigo-400" />
						<span>External REST API Authentication & API Keys</span>
					</div>
					<span class="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
						API v1 Ready
					</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					The external REST API is designed for third-party system integrations including CMS platforms (WordPress), mobile app backends, BI reporting pipelines, and scheduled cron workers. Provide your API Key in the request header:
				</p>
				<div class="p-2.5 rounded bg-canvas border border-themed font-mono text-xs text-heading">
					<code>Authorization: Bearer &lt;API_KEY&gt;</code> <span class="text-label text-[11px] ml-2">(or <code>X-API-Key: &lt;API_KEY&gt;</code>)</span>
				</div>
			</div>

			<!-- Language Switcher for Code Samples -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-semibold text-heading">Integration Code Examples</h2>
					<div class="flex items-center gap-1 rounded bg-card p-0.5 border border-themed text-xs">
						<button
							onclick={() => (activeApiLang = 'curl')}
							class="rounded px-2.5 py-1 font-medium transition-colors cursor-pointer {activeApiLang === 'curl' ? 'bg-indigo-600 text-white' : 'text-label hover:text-heading'}"
						>
							cURL
						</button>
						<button
							onclick={() => (activeApiLang = 'js')}
							class="rounded px-2.5 py-1 font-medium transition-colors cursor-pointer {activeApiLang === 'js' ? 'bg-indigo-600 text-white' : 'text-label hover:text-heading'}"
						>
							JavaScript / Node
						</button>
						<button
							onclick={() => (activeApiLang = 'python')}
							class="rounded px-2.5 py-1 font-medium transition-colors cursor-pointer {activeApiLang === 'python' ? 'bg-indigo-600 text-white' : 'text-label hover:text-heading'}"
						>
							Python
						</button>
					</div>
				</div>

				<div class="relative rounded-md border border-themed bg-canvas p-3 font-mono text-xs text-heading">
					<button
						onclick={() => copyToClipboard(apiExamples[activeApiLang], 'apicode')}
						class="absolute right-2 top-2 flex items-center gap-1 rounded bg-card border border-themed px-2 py-1 text-[10px] text-label hover:text-heading cursor-pointer transition-colors"
					>
						{#if copiedSnippet === 'apicode'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Copied!</span>
						{:else}
							<Copy size={12} />
							<span>Copy</span>
						{/if}
					</button>
					<pre class="overflow-x-auto pr-16 leading-relaxed">{apiExamples[activeApiLang]}</pre>
				</div>
			</div>

			<!-- Endpoints Directory Table -->
			<div class="flex flex-col gap-3 pt-2">
				<h2 class="text-sm font-semibold text-heading">External API Endpoints Directory</h2>

				<div class="rounded-lg border border-themed bg-card overflow-hidden text-xs">
					<table class="w-full text-left">
						<thead>
							<tr class="border-b border-themed bg-canvas/40 text-label font-medium">
								<th class="p-3">Method</th>
								<th class="p-3">Endpoint URL</th>
								<th class="p-3">Description & Use Cases</th>
								<th class="p-3">Parameters (Query / Body)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-themed">
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/top-pages</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Top Pages / Articles:</strong> Returns most viewed URLs and articles (e.g. top 5 trending news widget for portals).
								</td>
								<td class="p-3 text-label font-mono text-[11px]">limit=5, period=30d, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/overview</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Analytics Overview:</strong> Unique visitors, pageviews, sessions, bounce rate, and average duration.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">period, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/realtime</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Realtime Visitors:</strong> Live active readers in the last 5 minutes with active path breakdown.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">—</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/sources</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Traffic Sources:</strong> Referrer breakdown (search engines, social media) and UTM campaigns.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">limit, period, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/locations</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Geographic Distribution:</strong> Breakdown by country and city with visitor metrics.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">limit, period, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/devices</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Devices & Environments:</strong> Device categories (Desktop, Mobile, Tablet), browsers, and operating systems.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">limit, period, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/events</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Custom Events:</strong> Triggered event inventory with occurrence frequencies.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">limit, period, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/vitals</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Core Web Vitals:</strong> LCP, CLS, INP, FCP, TTFB (P75) for CI/CD assertions and uptime dashboards.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">period, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-indigo-400">GET</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/ads</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Ad Inventory:</strong> Fill rate, IAB-standard viewability ratio, and CTR per placement slot.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">period, from, to</td>
							</tr>
							<tr class="table-row-hover">
								<td class="p-3 font-mono font-bold text-emerald-400">POST</td>
								<td class="p-3 font-mono text-heading">/api/v1/external/event</td>
								<td class="p-3 text-label">
									<strong class="text-heading">Server-Side Ingestion:</strong> Ingest backend transactions, account creations, or offline batch events.
								</td>
								<td class="p-3 text-label font-mono text-[11px]">name, url_path, props</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}

	<!-- TAB 7: PROTEKSI BOT & DDOS -->
	{#if activeTab === 'security'}
		<div class="flex flex-col gap-5">
			<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col gap-2">
				<div class="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
					<ShieldCheck size={16} />
					<span>Gravlytics Multi-Tier Bot & DDoS Defense Architecture</span>
				</div>
				<p class="text-xs leading-relaxed text-label">
					If your primary website experiences scraper bots or DDoS floods, Gravlytics employs a multi-tiered defense across the client (<code class="text-emerald-400 font-mono">gravlytics.js</code>) and collector server (<code class="text-emerald-400 font-mono">collector</code>) to guarantee unpolluted analytics and uninterrupted platform stability:
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="p-4 rounded-xl border border-themed bg-card space-y-2">
					<div class="flex items-center gap-2">
						<span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 font-bold text-xs">1</span>
						<h3 class="text-xs font-semibold text-heading">Client-Side Bot Interception</h3>
					</div>
					<p class="text-xs text-label leading-relaxed">
						The <code class="text-indigo-400 font-mono">gravlytics.js</code> script probes automated headless environments (<code class="font-mono text-[11px]">navigator.webdriver</code>, Headless Chrome, PhantomJS, bot user agents). When flagged, the script performs an <strong>immediate early return</strong> without ever firing an HTTP beacon to the analytics collector.
					</p>
				</div>

				<div class="p-4 rounded-xl border border-themed bg-card space-y-2">
					<div class="flex items-center gap-2">
						<span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 font-bold text-xs">2</span>
						<h3 class="text-xs font-semibold text-heading">Client-Side Leaky Bucket Rate Limiter</h3>
					</div>
					<p class="text-xs text-label leading-relaxed">
						If an attacker script rapid-fires reloads in milliseconds, an in-memory leaky-bucket limiter within <code class="text-indigo-400 font-mono">gravlytics.js</code> throttles traffic to a maximum of 12 events per 5 seconds and 60 events per minute per browser tab.
					</p>
				</div>

				<div class="p-4 rounded-xl border border-themed bg-card space-y-2">
					<div class="flex items-center gap-2">
						<span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 font-bold text-xs">3</span>
						<h3 class="text-xs font-semibold text-heading">Server-Side Token Bucket Limiter (100 req/s per IP)</h3>
					</div>
					<p class="text-xs text-label leading-relaxed">
						The high-throughput Go ingestion collector operates an ultra-fast Token Bucket per-IP rate limiter. Each source IP is bounded to 100 req/sec (burst 200). Excessive volume is dropped immediately with an HTTP <strong>429 Too Many Requests</strong> status.
					</p>
				</div>

				<div class="p-4 rounded-xl border border-themed bg-card space-y-2">
					<div class="flex items-center gap-2">
						<span class="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 font-bold text-xs">4</span>
						<h3 class="text-xs font-semibold text-heading">Payload Size Bounds & Clean Bot Tagging</h3>
					</div>
					<p class="text-xs text-label leading-relaxed">
						Every incoming beacon is restricted to 64 KB via <code class="font-mono text-[11px]">http.MaxBytesReader</code> to reject buffer exhaustion attacks. Legitimate search engine crawlers (Googlebot, Bingbot) are automatically tagged <code class="font-mono text-[11px]">is_bot: "1"</code>, preserving pristine human audience data.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
