<script lang="ts">
	import {
		Search,
		ArrowLeft,
		Check,
		Copy,
		ExternalLink,
		KeyRound,
		ShieldCheck,
		AlertCircle,
		CheckCircle2,
		Sparkles,
		Globe,
		HelpCircle,
		ArrowRight,
		Terminal,
		Layers,
		TrendingUp,
		Eye,
		MousePointerClick,
		Percent,
		Award,
		BookOpen,
		Radio,
		Newspaper,
		Zap,
		Target,
		Compass,
		GitMerge,
		Download
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';

	let activeSection = $state<'overview' | 'service_account' | 'oauth' | 'features' | 'metrics' | 'troubleshooting' | 'api'>('service_account');
	let copiedSnippet = $state<string | null>(null);

	const activeSite = $derived(siteStore.currentSite);
	const targetDomain = $derived(activeSite?.domain || 'yourdomain.com');
	const suggestedProperty = $derived(`sc-domain:${targetDomain}`);

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedSnippet = id;
		setTimeout(() => {
			if (copiedSnippet === id) copiedSnippet = null;
		}, 2000);
	}

	const saJsonExample = `{
  "type": "service_account",
  "project_id": "gravlytics-seo-tracker",
  "private_key_id": "9a8b7c6d5e4f3a2b1c0d",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "gravlytics-reader@gravlytics-seo-tracker.iam.gserviceaccount.com",
  "client_id": "10839201948201948",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}`;

	const apiCurlExample = $derived(
		`curl -X GET "http://localhost:5173/api/integrations/search-console/data?siteId=${activeSite?.id || 'SITE_UUID'}&from=2026-09-01&to=2026-09-26" \\\n  -H "Cookie: gravlytics_token=YOUR_JWT_TOKEN"`
	);

	const apiResponseExample = $derived(`{
  "totalClicks": 1420,
  "totalImpressions": 18500,
  "averageCtr": 7.68,
  "averagePosition": 2.4,
  "topQueries": [
    {
      "query": "privacy friendly analytics",
      "clicks": 420,
      "impressions": 5800,
      "ctr": 7.24,
      "position": 2.1
    }
  ],
  "topPages": [
    {
      "page": "https://${targetDomain}/",
      "clicks": 980,
      "impressions": 12400,
      "ctr": 7.9,
      "position": 1.9
    }
  ]
}`);
</script>

<svelte:head>
	<title>Google Search Console Integration Guide — Gravlytics Documentation</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
	<!-- Breadcrumb & Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-themed pb-4">
		<div class="flex items-center gap-3">
			<a
				href="/docs"
				class="flex h-8 w-8 items-center justify-center rounded-lg border border-themed bg-input text-label hover:text-heading hover:bg-card-hover transition-colors"
				title="Back to Documentation"
			>
				<ArrowLeft size={16} />
			</a>
			<div class="flex flex-col">
				<div class="flex items-center gap-2">
					<span class="text-xs text-hint">Documentation</span>
					<span class="text-xs text-hint">/</span>
					<span class="text-xs text-hint">Integrations</span>
					<span class="text-xs text-hint">/</span>
					<span class="text-xs font-semibold text-heading">Google Search Console</span>
				</div>
				<h1 class="text-xl font-bold tracking-tight text-heading flex items-center gap-2.5">
					<span>Google Search Console Integration</span>
					<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary border border-primary/25">
						Official Guide
					</span>
				</h1>
			</div>
		</div>

		<div class="flex items-center gap-2 self-start sm:self-auto">
			<a
				href="/search-console"
				class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-3 py-1.5 text-xs font-medium text-body hover:text-heading hover:bg-card-hover transition-colors"
			>
				<Search size={13} />
				<span>View Analytics</span>
			</a>
			<a
				href="/settings/integrations"
				class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
			>
				<KeyRound size={13} />
				<span>Configure Connection</span>
				<ArrowRight size={13} />
			</a>
		</div>
	</div>

	<!-- Hero Banner -->
	<div class="card-inset p-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-indigo-950/25 via-card to-cyan-950/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
		<div class="flex items-start gap-4 max-w-2xl">
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/25 p-2 shadow-sm">
				<Search size={24} strokeWidth={2.2} />
			</div>
			<div class="flex flex-col gap-1.5">
				<h2 class="text-base font-bold text-heading">Unlock Organic Search Keywords & Google Rankings</h2>
				<p class="text-xs text-label leading-relaxed">
					Connect your website's Google Search Console property to automatically pull Google Search clicks, keyword queries, impression counts, average ranking positions, and click-through rates (CTR) directly into your Gravlytics workspace.
				</p>
			</div>
		</div>

		<div class="flex flex-col gap-2 shrink-0 w-full md:w-auto">
			<div class="rounded-lg bg-input/80 border border-themed p-3 text-xs flex flex-col gap-1 font-mono">
				<span class="text-[10px] text-hint uppercase">Active Website</span>
				<span class="font-semibold text-heading truncate">{targetDomain}</span>
				<span class="text-[10px] text-cyan-400">Target: {suggestedProperty}</span>
			</div>
		</div>
	</div>

	<!-- Section Selector Tabs -->
	<div class="flex items-center gap-1.5 overflow-x-auto border-b border-themed pb-2.5 text-xs no-scrollbar">
		<button
			onclick={() => (activeSection = 'service_account')}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {activeSection === 'service_account'
				? 'bg-indigo-600 text-white font-semibold shadow-xs'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<ShieldCheck size={14} />
			<span>1. Service Account Setup (Recommended)</span>
		</button>

		<button
			onclick={() => (activeSection = 'oauth')}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {activeSection === 'oauth'
				? 'bg-indigo-600 text-white font-semibold shadow-xs'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<Radio size={14} />
			<span>2. Google OAuth2 Setup</span>
		</button>

		<button
			onclick={() => (activeSection = 'features')}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {activeSection === 'features'
				? 'bg-emerald-600 text-white font-semibold shadow-xs'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<Target size={14} />
			<span>3. Fitur SEO, Discover & Sitemaps</span>
		</button>

		<button
			onclick={() => (activeSection = 'metrics')}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {activeSection === 'metrics'
				? 'bg-indigo-600 text-white font-semibold shadow-xs'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<TrendingUp size={14} />
			<span>4. Metrics & Dimensions</span>
		</button>

		<button
			onclick={() => (activeSection = 'troubleshooting')}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {activeSection === 'troubleshooting'
				? 'bg-indigo-600 text-white font-semibold shadow-xs'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<HelpCircle size={14} />
			<span>5. Troubleshooting & FAQs</span>
		</button>

		<button
			onclick={() => (activeSection = 'api')}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all {activeSection === 'api'
				? 'bg-indigo-600 text-white font-semibold shadow-xs'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<Terminal size={14} />
			<span>6. REST API Spec</span>
		</button>
	</div>

	<!-- ── Section 1: Service Account Setup (Recommended) ── -->
	{#if activeSection === 'service_account'}
		<div class="flex flex-col gap-6">
			<div class="card-inset p-6 flex flex-col gap-5 border border-themed">
				<div class="flex items-center gap-2">
					<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs font-mono">
						1
					</span>
					<h3 class="text-sm font-bold text-heading">Enable Google Search Console API in Google Cloud</h3>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Gravlytics communicates directly with Google's official Webmasters/Search Console API. Before connecting, the API must be enabled on your Google Cloud Console project.
				</p>
				<ol class="list-decimal list-inside space-y-2 text-xs text-body pl-2">
					<li>
						Buka <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" class="text-indigo-400 underline font-medium inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={11} /></a> dan pilih atau buat project baru (contoh: <code>gravlytics-analytics</code>).
					</li>
					<li>Di bilah navigasi kiri, masuk ke menu <strong>APIs &amp; Services &gt; Library</strong>.</li>
					<li>Ketik <strong>Google Search Console API</strong> pada kotak pencarian.</li>
					<li>Klik API tersebut, lalu tekan tombol biru <strong>Enable</strong> (Aktifkan).</li>
				</ol>
			</div>

			<div class="card-inset p-6 flex flex-col gap-5 border border-themed">
				<div class="flex items-center gap-2">
					<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs font-mono">
						2
					</span>
					<h3 class="text-sm font-bold text-heading">Buat Service Account & Unduh Kunci JSON</h3>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Service Account bertindak sebagai akun robot server-to-server yang aman. Kunci privat tidak akan pernah kedaluwarsa, menjadikannya pilihan ideal untuk instalasi mandiri (self-hosted).
				</p>
				<ol class="list-decimal list-inside space-y-2 text-xs text-body pl-2">
					<li>Di Google Cloud Console, buka menu <strong>IAM &amp; Admin &gt; Service Accounts</strong>.</li>
					<li>Klik tombol <strong>+ Create Service Account</strong>.</li>
					<li>Beri nama akun layanan, misalnya <code>gravlytics-gsc-reader</code>, lalu klik <strong>Create and Continue</strong>.</li>
					<li>Pada tahap <em>Grant this service account access to project</em>, Anda dapat melewati langkah ini (klik <strong>Done</strong>), karena izin diberikan langsung pada properti Search Console.</li>
					<li>Klik akun layanan yang baru muncul dalam daftar, lalu buka tab <strong>Keys</strong>.</li>
					<li>Klik <strong>Add Key &gt; Create new key</strong>, pilih opsi <strong>JSON</strong>, lalu klik <strong>Create</strong>.</li>
					<li>File <code>.json</code> akan terunduh otomatis ke komputer Anda.</li>
				</ol>

				<!-- Example Key snippet -->
				<div class="flex flex-col gap-2 rounded-lg bg-input p-4 border border-themed mt-2">
					<div class="flex items-center justify-between text-xs">
						<span class="font-mono text-hint text-[11px]">Contoh format file JSON Service Account:</span>
						<button
							onclick={() => copyToClipboard(saJsonExample, 'sa_json')}
							class="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
						>
							{#if copiedSnippet === 'sa_json'}
								<Check size={12} class="text-emerald-400" />
								<span class="text-emerald-400">Tersalin</span>
							{:else}
								<Copy size={12} />
								<span>Salin Contoh</span>
							{/if}
						</button>
					</div>
					<pre class="font-mono text-[11px] text-body overflow-x-auto leading-relaxed bg-black/30 p-3 rounded">{saJsonExample}</pre>
				</div>
			</div>

			<div class="card-inset p-6 flex flex-col gap-5 border border-themed">
				<div class="flex items-center gap-2">
					<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs font-mono">
						3
					</span>
					<h3 class="text-sm font-bold text-heading">Berikan Izin Service Account di Google Search Console</h3>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Agar akun layanan dapat mengakses data performa pencarian, Anda harus menambahkannya sebagai pengguna pada properti situs Anda di Google Search Console.
				</p>
				<ol class="list-decimal list-inside space-y-2 text-xs text-body pl-2">
					<li>
						Buka <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" class="text-indigo-400 underline font-medium inline-flex items-center gap-0.5">Google Search Console <ExternalLink size={11} /></a>.
					</li>
					<li>Pilih properti situs Anda dari dropdown di pojok kiri atas (misal: <code>{suggestedProperty}</code>).</li>
					<li>Di bilah menu kiri, buka <strong>Settings</strong> (Setelan) &gt; <strong>Users and permissions</strong> (Pengguna dan izin).</li>
					<li>Klik tombol <strong>Add user</strong> (Tambahkan pengguna) di kanan atas.</li>
					<li>Masukkan alamat email akun layanan (dari properti <code>client_email</code> file JSON).</li>
					<li>Pilih izin <strong>Full</strong> (Penuh) atau <strong>Restricted</strong> (Dibatasi/Baca saja).</li>
					<li>Klik <strong>Add</strong>.</li>
				</ol>
			</div>

			<div class="card-inset p-6 flex flex-col gap-5 border border-themed">
				<div class="flex items-center gap-2">
					<span class="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 font-bold text-xs font-mono">
						4
					</span>
					<h3 class="text-sm font-bold text-heading">Hubungkan di Dashboard Gravlytics</h3>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Langkah terakhir adalah memasukkan kredensial ke Gravlytics:
				</p>
				<ol class="list-decimal list-inside space-y-2 text-xs text-body pl-2">
					<li>Buka menu <a href="/settings/integrations" class="text-cyan-400 underline font-semibold">Settings &gt; Integrations</a> di Gravlytics.</li>
					<li>Klik <strong>Upload .json file</strong> dan pilih file kunci yang baru diunduh (atau paste teks JSON langsung).</li>
					<li>Ketikkan atau pilih <strong>Search Console Property URL</strong> Anda (misal: <code>{suggestedProperty}</code>).</li>
					<li>Klik tombol <strong>Test &amp; Discover Properties</strong> untuk memverifikasi token dan mendeteksi properti yang dapat diakses.</li>
					<li>Klik <strong>Save &amp; Connect Search Console</strong>. Selesai!</li>
				</ol>

				<div class="pt-3">
					<a
						href="/settings/integrations"
						class="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
					>
						<span>Buka Halaman Settings Integrations</span>
						<ArrowRight size={13} />
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Section 2: OAuth2 Setup ── -->
	{#if activeSection === 'oauth'}
		<div class="card-inset p-6 flex flex-col gap-5 border border-themed">
			<div class="flex items-center gap-2">
				<Radio size={18} class="text-indigo-400" />
				<h3 class="text-sm font-bold text-heading">Koneksi via Google OAuth2 (Browser Login)</h3>
			</div>
			<p class="text-xs text-label leading-relaxed">
				Metode ini memungkinkan anggota tim untuk mengklik tombol "Authorize with Google" tanpa perlu mengunggah file kunci JSON. Metode ini membutuhkan konfigurasi OAuth Client ID di file <code>.env</code> server Gravlytics Anda.
			</p>

			<div class="space-y-4 text-xs text-body">
				<h4 class="font-semibold text-heading">1. Buat OAuth Client ID di Google Cloud Console</h4>
				<ul class="list-disc list-inside space-y-1.5 pl-2 text-label">
					<li>Di Google Cloud Console, buka <strong>APIs &amp; Services &gt; Credentials</strong>.</li>
					<li>Klik <strong>+ Create Credentials &gt; OAuth client ID</strong>.</li>
					<li>Pilih Application type: <strong>Web application</strong>.</li>
					<li>Beri nama, misalnya: <code>Gravlytics Web Client</code>.</li>
					<li>
						Pada bagian <strong>Authorized redirect URIs</strong>, tambahkan callback URL server Anda:
						<code class="block font-mono text-[11px] bg-input p-2 rounded border border-themed my-1 text-heading">
							http://localhost:5173/api/integrations/search-console/oauth/callback
						</code>
						<em>(Ganti host dan port sesuai URL domain produksi instalasi Gravlytics Anda).</em>
					</li>
				</ul>

				<h4 class="font-semibold text-heading pt-2">2. Tambahkan ke file .env</h4>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body leading-relaxed">
GSC_CLIENT_ID=your-client-id.apps.googleusercontent.com
GSC_CLIENT_SECRET=GOCSPX-your-secret-key
GSC_REDIRECT_URI=http://localhost:5173/api/integrations/search-console/oauth/callback</pre>

				<h4 class="font-semibold text-heading pt-2">3. Autentikasi di Dashboard</h4>
				<p class="text-label leading-relaxed">
					Buka <a href="/settings/integrations" class="text-indigo-400 underline font-medium">Settings &gt; Integrations</a>, pilih tab <strong>OAuth2 Login</strong>, lalu klik <strong>Authorize with Google Search Console</strong>.
				</p>
			</div>
		</div>
	{/if}

	<!-- ── Section 3: Fitur SEO, Discover & Sitemaps ── -->
	{#if activeSection === 'features'}
		<div class="flex flex-col gap-6">
			<!-- Feature 1: Status Indeks & Google News -->
			<div class="card-inset p-6 flex flex-col gap-5 border border-themed">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
						<CheckCircle2 size={18} />
					</div>
					<div>
						<h3 class="text-sm font-bold text-heading">1. Pelacakan Status Indeks, Google Search &amp; Google News</h3>
						<p class="text-xs text-hint">Ketahui secara pasti halaman mana saja yang sudah terindeks, muncul di Google Search, dan muncul di Google News.</p>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
					<div class="card-inset p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex flex-col gap-2">
						<span class="text-xs font-semibold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> Terindex di Google</span>
						<p class="text-xs text-label leading-relaxed">URL berstatus <em>Submitted and indexed</em> yang siap tampil di hasil pencarian global.</p>
					</div>

					<div class="card-inset p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 flex flex-col gap-2">
						<span class="text-xs font-semibold text-cyan-400 flex items-center gap-1.5"><Search size={14} /> Muncul di Pencarian</span>
						<p class="text-xs text-label leading-relaxed">Halaman yang aktif menerima tayangan dan klik di Google Web Search.</p>
					</div>

					<div class="card-inset p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 flex flex-col gap-2">
						<span class="text-xs font-semibold text-cyan-400 flex items-center gap-1.5"><Newspaper size={14} /> Muncul di Google News</span>
						<p class="text-xs text-label leading-relaxed">Artikel berita yang masuk ke dalam Google News tab, app, dan Top Stories carousel.</p>
					</div>
				</div>
			</div>

			<!-- Feature 2: Google Discover -->
			<div class="card-inset p-6 flex flex-col gap-4 border border-themed">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
						<Compass size={18} />
					</div>
					<div>
						<h3 class="text-sm font-bold text-heading">2. Analisis Google Discover (Feed Rekomendasi Mobile)</h3>
						<p class="text-xs text-hint">Pantau traffic dari feed rekomendasi Google Chrome dan Google App di ponsel.</p>
					</div>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Beralihlah ke tab <strong>Google Discover</strong> pada halaman Search Console untuk melihat artikel yang dipromosikan Google ke feed personal pengguna. Metrik mencakup total klik, impresi kartu Discover, rasio CTR feed, dan topik yang paling diminati.
				</p>
			</div>

			<!-- Feature 3: SEO Opportunities & Striking Distance -->
			<div class="card-inset p-6 flex flex-col gap-4 border border-themed">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
						<Target size={18} />
					</div>
					<div>
						<h3 class="text-sm font-bold text-heading">3. Peluang Kata Kunci &amp; Striking Distance (Posisi #4–#20)</h3>
						<p class="text-xs text-hint">Tingkatkan traffic organik secara signifikan tanpa harus membuat artikel baru.</p>
					</div>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
					<div class="card-inset p-4 rounded-xl border border-themed flex flex-col gap-1.5">
						<h4 class="text-xs font-bold text-heading">Striking Distance (#4–#20)</h4>
						<p class="text-xs text-label leading-relaxed">Mendeteksi query bervolume tayangan tinggi di peringkat 4–20 yang siap melonjak ke Top 3 dengan sedikit optimasi on-page.</p>
					</div>
					<div class="card-inset p-4 rounded-xl border border-themed flex flex-col gap-1.5">
						<h4 class="text-xs font-bold text-heading">Optimasi Low CTR (#1–#5)</h4>
						<p class="text-xs text-label leading-relaxed">Menyorot halaman berperingkat atas tetapi ber-CTR rendah, mengindikasikan meta title/description perlu dibuat lebih menarik.</p>
					</div>
					<div class="card-inset p-4 rounded-xl border border-themed flex flex-col gap-1.5">
						<h4 class="text-xs font-bold text-heading">Kanibalisasi Kata Kunci</h4>
						<p class="text-xs text-label leading-relaxed">Mendeteksi jika ada dua atau lebih halaman berbeda dari situs Anda yang saling berebut peringkat untuk query yang sama.</p>
					</div>
				</div>
			</div>

			<!-- Feature 4: XML Sitemaps API -->
			<div class="card-inset p-6 flex flex-col gap-4 border border-themed">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
						<GitMerge size={18} />
					</div>
					<div>
						<h3 class="text-sm font-bold text-heading">4. Kirim &amp; Pantau XML Sitemap (Google Sitemaps API v3)</h3>
						<p class="text-xs text-hint">Kelola file sitemap website Anda langsung dari dashboard Gravlytics.</p>
					</div>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Buka tab <strong>XML Sitemaps</strong> untuk memeriksa status perayapan sitemap terakhir oleh Googlebot, jumlah URL yang diserahkan (*submitted*) vs jumlah URL yang berhasil diindeks (*indexed*), serta tombol untuk menyerahkan URL sitemap baru secara instan.
				</p>
			</div>

			<!-- Feature 5: 1-Click CSV Export -->
			<div class="card-inset p-6 flex flex-col gap-4 border border-themed">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
						<Download size={18} />
					</div>
					<div>
						<h3 class="text-sm font-bold text-heading">5. 1-Click Export CSV Laporan SEO</h3>
						<p class="text-xs text-hint">Unduh data kata kunci, performa landing pages, status indeks, dan peluang SEO.</p>
					</div>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Gunakan tombol <strong>Export CSV</strong> di pojok kanan atas dashboard untuk mengekspor data yang sedang Anda analisis langsung ke format CSV spreadsheet yang rapi.
				</p>
			</div>
		</div>
	{/if}

	<!-- ── Section 4: Metrics & Dimensions ── -->
	{#if activeSection === 'metrics'}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="card-inset p-5 flex flex-col gap-2 rounded-xl border border-themed">
				<div class="flex items-center gap-2 text-xs font-semibold text-heading">
					<div class="flex h-7 w-7 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
						<MousePointerClick size={15} />
					</div>
					<span>Total Clicks (Klik Organik)</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Jumlah berapa kali pengguna mengklik link website Anda di halaman hasil pencarian Google. Metrik ini mengukur traffic riil yang berhasil diarahkan dari Google Search.
				</p>
			</div>

			<div class="card-inset p-5 flex flex-col gap-2 rounded-xl border border-themed">
				<div class="flex items-center gap-2 text-xs font-semibold text-heading">
					<div class="flex h-7 w-7 items-center justify-center rounded bg-cyan-500/10 text-cyan-400">
						<Eye size={15} />
					</div>
					<span>Impressions (Tayangan)</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Berapa kali link halaman website Anda dilihat oleh pengguna di Google Search, meskipun tidak diklik. Sangat berguna untuk mengetahui seberapa luas jangkauan kata kunci Anda.
				</p>
			</div>

			<div class="card-inset p-5 flex flex-col gap-2 rounded-xl border border-themed">
				<div class="flex items-center gap-2 text-xs font-semibold text-heading">
					<div class="flex h-7 w-7 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
						<Percent size={15} />
					</div>
					<span>Average CTR (Click-Through Rate)</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Persentase tayangan yang menghasilkan klik: <code class="font-mono text-emerald-400">(Clicks / Impressions) * 100%</code>. CTR tinggi menunjukkan meta title dan meta description Anda menarik bagi pencari.
				</p>
			</div>

			<div class="card-inset p-5 flex flex-col gap-2 rounded-xl border border-themed">
				<div class="flex items-center gap-2 text-xs font-semibold text-heading">
					<div class="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
						<Award size={15} />
					</div>
					<span>Average Position (Peringkat Google)</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Posisi rata-rata link Anda di halaman Google (peringkat #1 hingga #10 berada di halaman pertama). Gravlytics memberi kode warna: Peringkat 1–3 (Hijau), 4–10 (Cyan), dan &gt;10 (Abu-abu).
				</p>
			</div>
		</div>
	{/if}

	<!-- ── Section 4: Troubleshooting ── -->
	{#if activeSection === 'troubleshooting'}
		<div class="flex flex-col gap-4">
			<div class="card-inset p-5 rounded-xl border border-themed flex flex-col gap-2">
				<div class="flex items-center gap-2 text-xs font-semibold text-rose-400">
					<AlertCircle size={15} />
					<span>User does not have sufficient permission for site</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					<strong>Penyebab:</strong> Email Service Account belum ditambahkan ke daftar pengguna properti di Google Search Console, atau properti URL salah.
				</p>
				<p class="text-xs text-body leading-relaxed">
					<strong>Solusi:</strong> Masuk ke <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" class="text-indigo-400 underline">Google Search Console</a> &gt; <em>Settings</em> &gt; <em>Users and permissions</em> &gt; <em>Add user</em>. Masukkan alamat email akun layanan (<code>client_email</code>) dengan izin <strong>Full</strong> atau <strong>Restricted</strong>.
				</p>
			</div>

			<div class="card-inset p-5 rounded-xl border border-themed flex flex-col gap-2">
				<div class="flex items-center gap-2 text-xs font-semibold text-primary">
					<HelpCircle size={15} />
					<span>Format Property URL: sc-domain vs https://</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Di Google Search Console terdapat dua jenis properti:
				</p>
				<ul class="list-disc list-inside space-y-1 text-xs text-body pl-2">
					<li><strong>Domain Property:</strong> Format API-nya adalah <code class="font-mono text-cyan-400">sc-domain:namadomain.com</code> (tanpa https dan tanpa slash).</li>
					<li><strong>URL-prefix Property:</strong> Format API-nya adalah <code class="font-mono text-cyan-400">https://namadomain.com/</code> (harus menyertakan protokol dan garis miring penutup).</li>
				</ul>
				<p class="text-xs text-label leading-relaxed">
					Gunakan tombol <strong>Test &amp; Discover Properties</strong> di halaman Integrations untuk memilih dari properti yang terdeteksi otomatis.
				</p>
			</div>

			<div class="card-inset p-5 rounded-xl border border-themed flex flex-col gap-2">
				<div class="flex items-center gap-2 text-xs font-semibold text-cyan-400">
					<Sparkles size={15} />
					<span>Data hari ini belum muncul / data kosong</span>
				</div>
				<p class="text-xs text-label leading-relaxed">
					Google Search Console API memiliki jeda pemrosesan bawaan sekitar <strong>2 hingga 3 hari</strong> ke belakang. Data yang dikembalikan oleh API adalah data agregat terverifikasi resmi dari Google. Jika Anda memilih rentang waktu "Hari Ini", Gravlytics secara cerdas mengambil data dari tanggal terakhir yang tersedia.
				</p>
			</div>
		</div>
	{/if}

	<!-- ── Section 6: REST API Spec ── -->
	{#if activeSection === 'api'}
		<div class="flex flex-col gap-5">
			<!-- Data Endpoint -->
			<div class="card-inset p-5 flex flex-col gap-3 rounded-xl border border-themed">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-xs font-semibold text-heading font-mono">
						<span class="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 font-bold">GET</span>
						<span>/api/integrations/search-console/data</span>
					</div>
					<button
						onclick={() => copyToClipboard(apiCurlExample, 'curl_ex')}
						class="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
					>
						{#if copiedSnippet === 'curl_ex'}
							<Check size={12} class="text-emerald-400" />
							<span class="text-emerald-400">Tersalin</span>
						{:else}
							<Copy size={12} />
							<span>Salin cURL</span>
						{/if}
					</button>
				</div>
				<p class="text-xs text-label">
					Mengambil data kata kunci (queries), landing pages, negara, perangkat, dan time-series performa pencarian Google Web atau Google News (parameter <code>searchType=web|news</code>).
				</p>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body overflow-x-auto">{apiCurlExample}</pre>

				<span class="text-xs font-semibold text-heading pt-2">Contoh Response Payload:</span>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body overflow-x-auto">{apiResponseExample}</pre>
			</div>

			<!-- Indexation Overview Endpoint -->
			<div class="card-inset p-5 flex flex-col gap-3 rounded-xl border border-themed">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-xs font-semibold text-heading font-mono">
						<span class="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 font-bold">GET</span>
						<span>/api/integrations/search-console/indexation</span>
					</div>
				</div>
				<p class="text-xs text-label">
					Mengambil ikhtisar status indeks seluruh URL, jumlah halaman yang terindex, halaman yang muncul di Google Web Search, serta halaman/artikel yang muncul di Google News.
				</p>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body overflow-x-auto">curl -X GET "http://localhost:5173/api/integrations/search-console/indexation?siteId={activeSite?.id || 'SITE_UUID'}" \
  -H "Cookie: gravlytics_token=YOUR_JWT_TOKEN"</pre>
			</div>

			<!-- Inspect URL Endpoint -->
			<div class="card-inset p-5 flex flex-col gap-3 rounded-xl border border-themed">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-xs font-semibold text-heading font-mono">
						<span class="rounded bg-indigo-500/10 text-indigo-400 px-2 py-0.5 border border-indigo-500/20 font-bold">POST</span>
						<span>/api/integrations/search-console/inspect</span>
					</div>
				</div>
				<p class="text-xs text-label">
					Menjalankan Google URL Inspection API v1 secara live untuk satu URL tertentu dan mengembalikan verdict perayapan, status pengindeksan, kanonikal, robots.txt, dan rich results.
				</p>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body overflow-x-auto">curl -X POST "http://localhost:5173/api/integrations/search-console/inspect" \
  -H "Content-Type: application/json" \
  -H "Cookie: gravlytics_token=YOUR_JWT_TOKEN" \
  -d '&#123;"siteId": "{activeSite?.id || 'SITE_UUID'}", "inspectionUrl": "https://{targetDomain}/artikel-terbaru"&#125;'</pre>
			</div>

			<!-- SEO Opportunities Endpoint -->
			<div class="card-inset p-5 flex flex-col gap-3 rounded-xl border border-themed">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-xs font-semibold text-heading font-mono">
						<span class="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 border border-emerald-500/20 font-bold">GET</span>
						<span>/api/integrations/search-console/opportunities</span>
					</div>
				</div>
				<p class="text-xs text-label">
					Menghitung peluang kata kunci Striking Distance (#4–#20), optimasi Low CTR (#1–#5), dan deteksi kanibalisasi URL.
				</p>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body overflow-x-auto">curl -X GET "http://localhost:5173/api/integrations/search-console/opportunities?siteId={activeSite?.id || 'SITE_UUID'}" \
  -H "Cookie: gravlytics_token=YOUR_JWT_TOKEN"</pre>
			</div>

			<!-- Sitemaps Endpoint -->
			<div class="card-inset p-5 flex flex-col gap-3 rounded-xl border border-themed">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-xs font-semibold text-heading font-mono">
						<span class="rounded bg-cyan-500/10 text-cyan-400 px-2 py-0.5 border border-cyan-500/20 font-bold">GET / POST / DELETE</span>
						<span>/api/integrations/search-console/sitemaps</span>
					</div>
				</div>
				<p class="text-xs text-label">
					Mengelola XML sitemap via Google Sitemaps API v3: melihat daftar sitemap terdaftar, mengirim sitemap baru, atau menghapus sitemap lama.
				</p>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body overflow-x-auto">curl -X GET "http://localhost:5173/api/integrations/search-console/sitemaps?siteId={activeSite?.id || 'SITE_UUID'}" \
  -H "Cookie: gravlytics_token=YOUR_JWT_TOKEN"</pre>
			</div>

			<!-- Export Endpoint -->
			<div class="card-inset p-5 flex flex-col gap-3 rounded-xl border border-themed">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-xs font-semibold text-heading font-mono">
						<span class="rounded bg-primary/10 text-primary px-2 py-0.5 border border-primary/20 font-bold">GET</span>
						<span>/api/integrations/search-console/export</span>
					</div>
				</div>
				<p class="text-xs text-label">
					Mengekspor data laporan ke format file CSV (parameter <code>type=queries|pages|indexation|opportunities|sitemaps</code>).
				</p>
				<pre class="font-mono text-[11px] bg-black/30 p-3 rounded border border-themed text-body overflow-x-auto">curl -X GET "http://localhost:5173/api/integrations/search-console/export?siteId={activeSite?.id || 'SITE_UUID'}&type=queries" \
  -H "Cookie: gravlytics_token=YOUR_JWT_TOKEN" -o "gsc-report.csv"</pre>
			</div>
		</div>
	{/if}
</div>
