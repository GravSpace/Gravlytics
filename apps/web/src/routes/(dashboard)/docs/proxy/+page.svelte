<script lang="ts">
	import { ShieldCheck, Copy, Check, Terminal, ExternalLink, Globe, Sparkles, Server, ArrowLeft } from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';

	let customPath = $state('telemetry');
	let collectorUrl = $state('http://localhost:8081');
	let activeTab = $state<'nextjs' | 'cloudflare' | 'nginx' | 'caddy' | 'vercel'>('nextjs');
	let copiedTab = $state<string | null>(null);

	const trackingId = $derived(siteStore.activeSite?.trackingId || 'your-site-tracking-id');

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedTab = id;
		setTimeout(() => (copiedTab = null), 2000);
	}

	const nextJsSnippet = $derived(`// next.config.mjs or next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/js/${customPath}.js',
        destination: '${collectorUrl}/gravlytics.js',
      },
      {
        source: '/api/${customPath}/:path*',
        destination: '${collectorUrl}/:path*',
      },
    ];
  },
};

export default nextConfig;`);

	const cloudflareWorkerSnippet = $derived(`// Cloudflare Worker Script
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetBase = '${collectorUrl}';

    if (url.pathname === '/js/${customPath}.js') {
      return fetch(new Request(targetBase + '/gravlytics.js', request));
    }

    if (url.pathname.startsWith('/api/${customPath}')) {
      const forwardPath = url.pathname.replace('/api/${customPath}', '');
      const dest = targetBase + forwardPath + url.search;
      return fetch(new Request(dest, request));
    }

    return fetch(request);
  }
};`);

	const nginxSnippet = $derived(`# Nginx server block
location /js/${customPath}.js {
    proxy_pass ${collectorUrl}/gravlytics.js;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_buffering on;
    expires 1d;
}

location /api/${customPath}/ {
    proxy_pass ${collectorUrl}/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
}`);

	const caddySnippet = $derived(`# Caddyfile
handle /js/${customPath}.js {
    reverse_proxy ${collectorUrl} {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}

handle_path /api/${customPath}/* {
    reverse_proxy ${collectorUrl}
}`);

	const vercelSnippet = $derived(`// vercel.json
{
  "rewrites": [
    {
      "source": "/js/${customPath}.js",
      "destination": "${collectorUrl}/gravlytics.js"
    },
    {
      "source": "/api/${customPath}/:match*",
      "destination": "${collectorUrl}/:match*"
    }
  ]
}`);

	const embedCode = $derived(
`<script defer 
  data-site-id="${trackingId}" 
  data-api="/api/${customPath}/api/event" 
  src="/js/${customPath}.js">
<\/script>`
	);
</script>

<svelte:head>
	<title>AdBlocker Bypass & Proxy Wizard — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-4xl">
	<div class="flex items-center gap-2 text-xs text-label">
		<a href="/docs" class="hover:text-heading transition-colors flex items-center gap-1">
			<ArrowLeft size={12} />
			<span>Documentation</span>
		</a>
		<span>/</span>
		<span class="text-heading font-medium">AdBlocker Bypass</span>
	</div>

	<!-- Title & Intro -->
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
				<ShieldCheck size={18} />
			</div>
			<h1 class="text-xl font-bold tracking-tight text-heading">AdBlocker Resilience & Reverse Proxy Wizard</h1>
		</div>
		<p class="text-xs text-label leading-relaxed">
			Between 25% to 45% of tech and developer audience web traffic is silently dropped by ad blockers (Brave Shields, uBlock Origin, Pi-hole). By proxying the tracker script and ingestion endpoints through your own first-party domain, telemetry requests become indistinguishable from first-party app assets.
		</p>
	</div>

	<!-- Customizer Toolbar -->
	<div class="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col sm:flex-row sm:items-center gap-4">
			<div>
				<label for="custom-path" class="block text-[11px] font-medium text-body mb-1">Custom Asset Subpath</label>
				<div class="flex items-center gap-1 text-xs">
					<span class="text-hint font-mono">/js/</span>
					<input
						id="custom-path"
						type="text"
						bind:value={customPath}
						class="w-32 rounded input-field px-2 py-1 font-mono text-xs"
					/>
					<span class="text-hint font-mono">.js</span>
				</div>
			</div>

			<div>
				<label for="collector-url" class="block text-[11px] font-medium text-body mb-1">Backend Collector URL</label>
				<input
					id="collector-url"
					type="text"
					bind:value={collectorUrl}
					class="w-56 rounded input-field px-2.5 py-1 font-mono text-xs"
				/>
			</div>
		</div>

		<div class="flex flex-col sm:items-end">
			<span class="text-[10px] text-hint">Active Property</span>
			<span class="text-xs font-semibold text-heading">{siteStore.activeSite?.name || 'All Sites'}</span>
		</div>
	</div>

	<!-- Step 1: Proxy Setup -->
	<div class="flex flex-col gap-3">
		<h2 class="text-sm font-bold text-heading flex items-center gap-2">
			<span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
			<span>Choose Your Framework or Web Server</span>
		</h2>

		<!-- Platform Tabs -->
		<div class="flex items-center gap-1.5 border-b border-themed pb-2 text-xs overflow-x-auto no-scrollbar">
			<button
				onclick={() => (activeTab = 'nextjs')}
				class="rounded-md px-3 py-1.5 font-medium transition-colors {activeTab === 'nextjs' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading hover:bg-card-hover'}"
			>
				Next.js
			</button>
			<button
				onclick={() => (activeTab = 'cloudflare')}
				class="rounded-md px-3 py-1.5 font-medium transition-colors {activeTab === 'cloudflare' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading hover:bg-card-hover'}"
			>
				Cloudflare Workers
			</button>
			<button
				onclick={() => (activeTab = 'nginx')}
				class="rounded-md px-3 py-1.5 font-medium transition-colors {activeTab === 'nginx' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading hover:bg-card-hover'}"
			>
				Nginx
			</button>
			<button
				onclick={() => (activeTab = 'caddy')}
				class="rounded-md px-3 py-1.5 font-medium transition-colors {activeTab === 'caddy' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading hover:bg-card-hover'}"
			>
				Caddy
			</button>
			<button
				onclick={() => (activeTab = 'vercel')}
				class="rounded-md px-3 py-1.5 font-medium transition-colors {activeTab === 'vercel' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-label hover:text-heading hover:bg-card-hover'}"
			>
				Vercel (vercel.json)
			</button>
		</div>

		<!-- Code Block -->
		<div class="relative rounded-lg border border-themed bg-code overflow-hidden">
			<div class="flex items-center justify-between border-b border-themed px-4 py-2 bg-card">
				<span class="font-mono text-[11px] text-label">{activeTab}.conf</span>
				<button
					onclick={() => {
						const code = activeTab === 'nextjs' ? nextJsSnippet : activeTab === 'cloudflare' ? cloudflareWorkerSnippet : activeTab === 'nginx' ? nginxSnippet : activeTab === 'caddy' ? caddySnippet : vercelSnippet;
						copyToClipboard(code, activeTab);
					}}
					class="flex items-center gap-1 rounded bg-input px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-heading transition-colors"
				>
					{#if copiedTab === activeTab}
						<Check size={12} class="text-emerald-400" />
						<span>Copied</span>
					{:else}
						<Copy size={12} />
						<span>Copy Config</span>
					{/if}
				</button>
			</div>
			<pre class="overflow-x-auto p-4 font-mono text-[11px] text-slate-300 leading-relaxed select-all">
{#if activeTab === 'nextjs'}{nextJsSnippet}{:else if activeTab === 'cloudflare'}{cloudflareWorkerSnippet}{:else if activeTab === 'nginx'}{nginxSnippet}{:else if activeTab === 'caddy'}{caddySnippet}{:else}{vercelSnippet}{/if}</pre>
		</div>
	</div>

	<!-- Step 2: Client Embed Code -->
	<div class="flex flex-col gap-3">
		<h2 class="text-sm font-bold text-heading flex items-center gap-2">
			<span class="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">2</span>
			<span>Update Your Website &lt;head&gt; Tag</span>
		</h2>
		<p class="text-xs text-label">
			Replace your standard telemetry script tag with this first-party snippet. The browser will now fetch the script and dispatch events directly through your own domain.
		</p>

		<div class="relative rounded-lg border border-themed bg-code overflow-hidden">
			<div class="flex items-center justify-between border-b border-themed px-4 py-2 bg-card">
				<span class="font-mono text-[11px] text-label">HTML Embed</span>
				<button
					onclick={() => copyToClipboard(embedCode, 'embed')}
					class="flex items-center gap-1 rounded bg-input px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-heading transition-colors"
				>
					{#if copiedTab === 'embed'}
						<Check size={12} class="text-emerald-400" />
						<span>Copied</span>
					{:else}
						<Copy size={12} />
						<span>Copy Script</span>
					{/if}
				</button>
			</div>
			<pre class="overflow-x-auto p-4 font-mono text-[11px] text-cyan-400 leading-relaxed select-all">{embedCode}</pre>
		</div>
	</div>
</div>
