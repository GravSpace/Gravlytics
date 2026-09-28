<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		Search,
		TrendingUp,
		MousePointerClick,
		Eye,
		Percent,
		Award,
		Globe,
		Monitor,
		Smartphone,
		Tablet,
		ArrowUpRight,
		ExternalLink,
		RefreshCw,
		AlertCircle,
		CheckCircle2,
		XCircle,
		Sparkles,
		KeyRound,
		ArrowUpDown,
		BookOpen,
		Newspaper,
		ShieldCheck,
		Filter,
		Zap,
		AlertTriangle,
		Check,
		Clock,
		Layers,
		FileText,
		Download,
		Compass,
		Target,
		GitMerge,
		FileSpreadsheet,
		Plus,
		Trash,
		ChevronDown
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';
	import { formatCountryName } from '$lib/api';

	interface GscQueryItem {
		query: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}

	interface GscPageItem {
		page: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
		inGoogleNews?: boolean;
	}

	interface GscCountryItem {
		country: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}

	interface GscDeviceItem {
		device: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}

	interface GscTimeSeriesItem {
		date: string;
		clicks: number;
		impressions: number;
		ctr: number;
		position: number;
	}

	interface GscDataResponse {
		totalClicks: number;
		totalImpressions: number;
		averageCtr: number;
		averagePosition: number;
		searchType: 'web' | 'news' | 'discover';
		topQueries: GscQueryItem[];
		topPages: GscPageItem[];
		countries: GscCountryItem[];
		devices: GscDeviceItem[];
		timeSeries: GscTimeSeriesItem[];
		connected: boolean;
		propertyUrl?: string;
		isDemoData?: boolean;
		lastSyncAt?: string;
		errorWarning?: string;
	}

	interface GscIndexationItem {
		url: string;
		path: string;
		indexed: boolean;
		inGoogleSearch: boolean;
		inGoogleNews: boolean;
		searchClicks: number;
		searchImpressions: number;
		searchPosition: number;
		newsClicks: number;
		newsImpressions: number;
		lastCrawledAt: string | null;
		coverageStatus: string;
	}

	interface GscIndexationData {
		totalUrlsIndexed: number;
		totalUrlsInGoogleSearch: number;
		totalUrlsInGoogleNews: number;
		totalExcludedOrPending: number;
		urls: GscIndexationItem[];
		connected: boolean;
		isDemoData?: boolean;
		propertyUrl?: string;
		errorWarning?: string;
	}

	interface GscInspectionResult {
		inspectionUrl: string;
		verdict: 'PASS' | 'FAIL' | 'NEUTRAL';
		coverageState: string;
		robotsTxtState: string;
		indexingState: string;
		lastCrawlTime: string | null;
		pageFetchState: string;
		googleCanonical?: string | null;
		userCanonical?: string | null;
		crawledAs?: string | null;
		mobileUsabilityVerdict?: string;
		richResults?: string[];
		isInGoogleSearch: boolean;
		isInGoogleNews: boolean;
		isDemoData?: boolean;
	}

	interface StrikingDistanceItem {
		query: string;
		page: string;
		impressions: number;
		clicks: number;
		ctr: number;
		position: number;
		potentialClicksGain: number;
	}

	interface LowCtrOpportunityItem {
		query: string;
		page: string;
		impressions: number;
		clicks: number;
		ctr: number;
		position: number;
		expectedCtr: number;
		missedClicks: number;
	}

	interface KeywordCannibalizationItem {
		query: string;
		pages: {
			page: string;
			clicks: number;
			impressions: number;
			position: number;
		}[];
		totalClicks: number;
		totalImpressions: number;
	}

	interface SeoAnomalyAlert {
		type: 'drop' | 'spike' | 'error';
		severity: 'high' | 'medium' | 'low';
		title: string;
		description: string;
		metric: string;
		changePercent: number;
	}

	interface GscOpportunitiesResponse {
		strikingDistance: StrikingDistanceItem[];
		lowCtrOpportunities: LowCtrOpportunityItem[];
		cannibalization: KeywordCannibalizationItem[];
		anomalies: SeoAnomalyAlert[];
		isDemoData?: boolean;
		errorWarning?: string;
	}

	interface GscSitemapItem {
		path: string;
		lastSubmitted: string | null;
		isPending: boolean;
		isSitemapsIndex: boolean;
		lastDownloaded: string | null;
		warnings: number;
		errors: number;
		contents: {
			type: string;
			submitted: number;
			indexed: number;
		}[];
	}

	interface GscSitemapsResponse {
		sitemaps: GscSitemapItem[];
		connected: boolean;
		propertyUrl?: string;
		isDemoData?: boolean;
		errorWarning?: string;
	}

	// Active Surface: 'web' | 'news' | 'discover' | 'indexation' | 'opportunities' | 'sitemaps'
	let activeSurface = $state<'web' | 'news' | 'discover' | 'indexation' | 'opportunities' | 'sitemaps'>('web');

	// Analytics state
	let data = $state<GscDataResponse | null>(null);
	let isLoading = $state(true);
	let activeTab = $state<'queries' | 'pages' | 'countries' | 'devices'>('queries');
	let searchQuery = $state('');
	let sortBy = $state<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');
	let sortOrder = $state<'asc' | 'desc'>('desc');

	// Indexation & URL status state
	let indexationData = $state<GscIndexationData | null>(null);
	let isLoadingIndexation = $state(false);
	let indexationFilter = $state<'all' | 'indexed' | 'search' | 'news' | 'excluded'>('all');
	let indexationSearch = $state('');

	// Live URL Inspection state
	let inspectUrlInput = $state('');
	let isInspecting = $state(false);
	let inspectionResult = $state<GscInspectionResult | null>(null);
	let inspectError = $state<string | null>(null);

	// Opportunities state
	let opportunitiesData = $state<GscOpportunitiesResponse | null>(null);
	let isLoadingOpportunities = $state(false);
	let oppSubTab = $state<'striking' | 'low_ctr' | 'cannibalization' | 'anomalies'>('striking');

	// Sitemaps state
	let sitemapsData = $state<GscSitemapsResponse | null>(null);
	let isLoadingSitemaps = $state(false);
	let newSitemapUrl = $state('');
	let isSubmittingSitemap = $state(false);
	let sitemapFeedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	// Export dropdown state
	let showExportDropdown = $state(false);

	const activeSite = $derived(siteStore.currentSite);

	async function loadSearchConsoleData() {
		if (!activeSite?.id) return;
		isLoading = true;

		try {
			const from = dateStore.from;
			const to = dateStore.to;
			const searchType = activeSurface === 'news' ? 'news' : activeSurface === 'discover' ? 'discover' : 'web';
			const params = new URLSearchParams({
				siteId: activeSite.id,
				searchType
			});
			if (from) params.set('from', from);
			if (to) params.set('to', to);

			const res = await fetch(`/api/integrations/search-console/data?${params.toString()}`);
			if (res.ok) {
				const json: GscDataResponse = await res.json();
				data = json;
			}
		} catch (err) {
			console.error('Failed to load Search Console data', err);
		} finally {
			isLoading = false;
		}
	}

	async function loadIndexationData() {
		if (!activeSite?.id) return;
		isLoadingIndexation = true;

		try {
			const params = new URLSearchParams({ siteId: activeSite.id });
			const res = await fetch(`/api/integrations/search-console/indexation?${params.toString()}`);
			if (res.ok) {
				const json: GscIndexationData = await res.json();
				indexationData = json;
			}
		} catch (err) {
			console.error('Failed to load GSC Indexation data', err);
		} finally {
			isLoadingIndexation = false;
		}
	}

	async function loadOpportunitiesData() {
		if (!activeSite?.id) return;
		isLoadingOpportunities = true;

		try {
			const params = new URLSearchParams({ siteId: activeSite.id });
			const res = await fetch(`/api/integrations/search-console/opportunities?${params.toString()}`);
			if (res.ok) {
				const json: GscOpportunitiesResponse = await res.json();
				opportunitiesData = json;
			}
		} catch (err) {
			console.error('Failed to load SEO opportunities', err);
		} finally {
			isLoadingOpportunities = false;
		}
	}

	async function loadSitemapsData() {
		if (!activeSite?.id) return;
		isLoadingSitemaps = true;

		try {
			const params = new URLSearchParams({ siteId: activeSite.id });
			const res = await fetch(`/api/integrations/search-console/sitemaps?${params.toString()}`);
			if (res.ok) {
				const json: GscSitemapsResponse = await res.json();
				sitemapsData = json;
			}
		} catch (err) {
			console.error('Failed to load Sitemaps data', err);
		} finally {
			isLoadingSitemaps = false;
		}
	}

	async function handleSitemapSubmit() {
		if (!newSitemapUrl.trim() || !activeSite?.id) return;
		isSubmittingSitemap = true;
		sitemapFeedback = null;

		try {
			const res = await fetch('/api/integrations/search-console/sitemaps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: activeSite.id,
					feedpath: newSitemapUrl.trim()
				})
			});
			if (res.ok) {
				sitemapFeedback = { type: 'success', message: 'Sitemap berhasil diserahkan ke Googlebot!' };
				newSitemapUrl = '';
				await loadSitemapsData();
			} else {
				const err = await res.json();
				sitemapFeedback = { type: 'error', message: err.error || 'Gagal menyerahkan sitemap' };
			}
		} catch (err: any) {
			sitemapFeedback = { type: 'error', message: err.message || 'Gagal menyerahkan sitemap' };
		} finally {
			isSubmittingSitemap = false;
		}
	}

	async function handleSitemapDelete(feedpath: string) {
		if (!activeSite?.id || !confirm(`Hapus sitemap ${feedpath} dari Google Search Console?`)) return;

		try {
			const res = await fetch('/api/integrations/search-console/sitemaps', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: activeSite.id,
					feedpath
				})
			});
			if (res.ok) {
				await loadSitemapsData();
			}
		} catch (err) {
			console.error('Failed to delete sitemap', err);
		}
	}

	async function runInspectUrl(targetUrl?: string) {
		const target = targetUrl || inspectUrlInput;
		if (!target.trim() || !activeSite?.id) return;

		inspectUrlInput = target.trim();
		isInspecting = true;
		inspectError = null;
		inspectionResult = null;

		try {
			const res = await fetch('/api/integrations/search-console/inspect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteId: activeSite.id,
					inspectionUrl: target.trim()
				})
			});

			if (res.ok) {
				const json: GscInspectionResult = await res.json();
				inspectionResult = json;
			} else {
				const errJson = await res.json();
				inspectError = errJson.error || 'Gagal menginspeksi URL';
			}
		} catch (err: any) {
			inspectError = err.message || 'Kesalahan jaringan inspeksi';
		} finally {
			isInspecting = false;
		}
	}

	function handleSurfaceChange(surface: 'web' | 'news' | 'discover' | 'indexation' | 'opportunities' | 'sitemaps') {
		activeSurface = surface;
		if (surface === 'indexation') {
			if (!indexationData) loadIndexationData();
		} else if (surface === 'opportunities') {
			if (!opportunitiesData) loadOpportunitiesData();
		} else if (surface === 'sitemaps') {
			if (!sitemapsData) loadSitemapsData();
		} else {
			loadSearchConsoleData();
		}
	}

	function handleRefresh() {
		if (activeSurface === 'indexation') {
			loadIndexationData();
		} else if (activeSurface === 'opportunities') {
			loadOpportunitiesData();
		} else if (activeSurface === 'sitemaps') {
			loadSitemapsData();
		} else {
			loadSearchConsoleData();
		}
	}

	function triggerExportCsv(type: 'queries' | 'pages' | 'indexation' | 'opportunities' | 'sitemaps') {
		if (!activeSite?.id) return;
		showExportDropdown = false;
		const searchType = activeSurface === 'news' ? 'news' : activeSurface === 'discover' ? 'discover' : 'web';
		const from = dateStore.from || '';
		const to = dateStore.to || '';
		const url = `/api/integrations/search-console/export?siteId=${encodeURIComponent(activeSite.id)}&type=${type}&searchType=${searchType}&from=${from}&to=${to}`;
		window.open(url, '_blank');
	}

	let lastSiteId = '';
	let lastDateVersion = -1;

	$effect(() => {
		const current = siteStore.activeSiteId;
		const ver = dateStore.version;
		if (current && (current !== lastSiteId || ver !== lastDateVersion)) {
			lastSiteId = current;
			lastDateVersion = ver;
			untrack(() => {
				if (activeSurface === 'indexation') {
					loadIndexationData();
				} else if (activeSurface === 'opportunities') {
					loadOpportunitiesData();
				} else if (activeSurface === 'sitemaps') {
					loadSitemapsData();
				} else {
					loadSearchConsoleData();
				}
			});
		}
	});

	onMount(() => {
		loadSearchConsoleData();
	});

	const maxClicks = $derived(
		data?.timeSeries && data.timeSeries.length > 0
			? Math.max(...data.timeSeries.map((t) => t.clicks), 1)
			: 1
	);

	// Filter & Sort Queries
	const filteredQueries = $derived.by(() => {
		if (!data?.topQueries) return [];
		let list = data.topQueries.filter((q) =>
			q.query.toLowerCase().includes(searchQuery.toLowerCase().trim())
		);

		return list.sort((a, b) => {
			let valA = a[sortBy];
			let valB = b[sortBy];
			if (sortOrder === 'asc') return valA > valB ? 1 : -1;
			return valA < valB ? 1 : -1;
		});
	});

	// Filter & Sort Pages
	const filteredPages = $derived.by(() => {
		if (!data?.topPages) return [];
		let list = data.topPages.filter((p) =>
			p.page.toLowerCase().includes(searchQuery.toLowerCase().trim())
		);

		return list.sort((a, b) => {
			let valA = a[sortBy];
			let valB = b[sortBy];
			if (sortOrder === 'asc') return valA > valB ? 1 : -1;
			return valA < valB ? 1 : -1;
		});
	});

	// Filter Indexation URLs
	const filteredIndexationUrls = $derived.by(() => {
		if (!indexationData?.urls) return [];
		let list = indexationData.urls;

		if (indexationFilter === 'indexed') {
			list = list.filter((u) => u.indexed);
		} else if (indexationFilter === 'search') {
			list = list.filter((u) => u.inGoogleSearch);
		} else if (indexationFilter === 'news') {
			list = list.filter((u) => u.inGoogleNews);
		} else if (indexationFilter === 'excluded') {
			list = list.filter((u) => !u.indexed);
		}

		if (indexationSearch.trim()) {
			const query = indexationSearch.toLowerCase().trim();
			list = list.filter((u) => u.url.toLowerCase().includes(query) || u.path.toLowerCase().includes(query));
		}

		return list;
	});

	function toggleSort(field: 'clicks' | 'impressions' | 'ctr' | 'position') {
		if (sortBy === field) {
			sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		} else {
			sortBy = field;
			sortOrder = field === 'position' ? 'asc' : 'desc';
		}
	}

	function getPositionBadgeClass(pos: number): string {
		if (pos <= 3) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
		if (pos <= 10) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
		return 'bg-slate-500/10 text-label border-themed';
	}

	function formatNum(n: number): string {
		return (n || 0).toLocaleString();
	}
</script>

<svelte:head>
	<title>Google Search Console & SEO Intelligence — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<!-- Page Title & Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-2.5">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
					{#if activeSurface === 'web'}
						<Search size={16} strokeWidth={2.25} />
					{:else if activeSurface === 'news'}
						<Newspaper size={16} strokeWidth={2.25} class="text-cyan-400" />
					{:else if activeSurface === 'discover'}
						<Compass size={16} strokeWidth={2.25} class="text-rose-400" />
					{:else if activeSurface === 'opportunities'}
						<Target size={16} strokeWidth={2.25} class="text-indigo-400" />
					{:else if activeSurface === 'sitemaps'}
						<GitMerge size={16} strokeWidth={2.25} class="text-cyan-400" />
					{:else}
						<Layers size={16} strokeWidth={2.25} class="text-emerald-400" />
					{/if}
				</div>
				<h1 class="text-lg font-bold tracking-tight text-heading">
					Google Search Console & SEO Intelligence
				</h1>
				{#if data?.connected || indexationData?.connected || sitemapsData?.connected}
					<span class="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
						<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
						Live GSC Connected
					</span>
				{:else}
					<span class="rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-hint border border-themed flex items-center gap-1.5">
						<span class="h-1.5 w-1.5 rounded-full bg-zinc-400"></span>
						Belum Terhubung
					</span>
				{/if}
			</div>
			<p class="text-xs text-label">
				Analisis kata kunci organik, Google News, Discover, peluang Striking Distance, status indeks Googlebot, dan XML Sitemap.
			</p>
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			<!-- Export CSV Dropdown -->
			<div class="relative">
				<button
					onclick={() => (showExportDropdown = !showExportDropdown)}
					class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-3 py-1.5 text-xs font-medium text-body hover:text-heading hover:bg-card-hover transition-colors cursor-pointer"
					title="Ekspor Laporan SEO (.csv)"
				>
					<Download size={13} class="text-cyan-400" />
					<span>Export CSV</span>
					<ChevronDown size={12} class="text-hint" />
				</button>

				{#if showExportDropdown}
					<!-- Dropdown menu -->
					<div class="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-themed bg-card p-1.5 shadow-xl z-30 flex flex-col gap-0.5 font-mono text-xs">
						<button
							onclick={() => triggerExportCsv('queries')}
							class="flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-body hover:text-heading hover:bg-card-hover transition-colors"
						>
							<FileSpreadsheet size={13} class="text-indigo-400" />
							<span>Kata Kunci (Queries)</span>
						</button>
						<button
							onclick={() => triggerExportCsv('pages')}
							class="flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-body hover:text-heading hover:bg-card-hover transition-colors"
						>
							<FileSpreadsheet size={13} class="text-emerald-400" />
							<span>Landing Pages</span>
						</button>
						<button
							onclick={() => triggerExportCsv('indexation')}
							class="flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-body hover:text-heading hover:bg-card-hover transition-colors"
						>
							<FileSpreadsheet size={13} class="text-cyan-400" />
							<span>Status Indeks URL</span>
						</button>
						<button
							onclick={() => triggerExportCsv('opportunities')}
							class="flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-body hover:text-heading hover:bg-card-hover transition-colors"
						>
							<FileSpreadsheet size={13} class="text-rose-400" />
							<span>Peluang SEO & Striking</span>
						</button>
						<button
							onclick={() => triggerExportCsv('sitemaps')}
							class="flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-body hover:text-heading hover:bg-card-hover transition-colors"
						>
							<FileSpreadsheet size={13} class="text-cyan-400" />
							<span>Daftar Sitemap XML</span>
						</button>
					</div>
				{/if}
			</div>

			<a
				href="/docs/google-search-console"
				class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-3 py-1.5 text-xs font-medium text-body hover:text-heading hover:bg-card-hover transition-colors"
			>
				<BookOpen size={12} class="text-primary" />
				<span>Panduan GSC</span>
			</a>

			{#if data?.propertyUrl}
				<a
					href="https://search.google.com/search-console/performance/search-analytics?resource_id={encodeURIComponent(data.propertyUrl)}"
					target="_blank"
					rel="noreferrer"
					class="hidden md:flex items-center gap-1.5 rounded-md border border-themed bg-input px-3 py-1.5 text-xs font-medium text-body hover:text-heading hover:bg-card-hover transition-colors"
				>
					<span>Open Search Console</span>
					<ExternalLink size={12} />
				</a>
			{/if}

			<button
				onclick={handleRefresh}
				disabled={isLoading || isLoadingIndexation || isLoadingOpportunities || isLoadingSitemaps}
				class="flex items-center gap-1.5 rounded-md border border-themed bg-input px-3 py-1.5 text-xs font-medium text-body hover:text-heading hover:bg-card-hover transition-colors cursor-pointer"
				title="Refresh data"
			>
				<RefreshCw size={13} class={isLoading || isLoadingIndexation || isLoadingOpportunities || isLoadingSitemaps ? 'animate-spin text-primary' : ''} />
				<span>Refresh</span>
			</button>
		</div>
	</div>

	<!-- Segmented Surface Tabs: Web Search vs News vs Discover vs Status Indeks vs Peluang SEO vs Sitemaps -->
	<div class="flex items-center gap-1.5 p-1 rounded-xl bg-input/80 border border-themed w-full sm:w-fit overflow-x-auto no-scrollbar">
		<button
			onclick={() => handleSurfaceChange('web')}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all {activeSurface === 'web'
				? 'bg-indigo-600 text-white shadow-sm'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<Search size={13} />
			<span>Web Search</span>
		</button>

		<button
			onclick={() => handleSurfaceChange('news')}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all {activeSurface === 'news'
				? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<Newspaper size={13} />
			<span>Google News</span>
		</button>

		<button
			onclick={() => handleSurfaceChange('discover')}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all {activeSurface === 'discover'
				? 'bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-sm'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<Compass size={13} />
			<span>Google Discover</span>
		</button>

		<button
			onclick={() => handleSurfaceChange('indexation')}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all {activeSurface === 'indexation'
				? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<ShieldCheck size={13} />
			<span>Status Indeks & URL</span>
			{#if indexationData?.totalUrlsIndexed}
				<span class="rounded bg-black/25 px-1.5 py-0.2 text-[9px] font-mono">{indexationData.totalUrlsIndexed}</span>
			{/if}
		</button>

		<button
			onclick={() => handleSurfaceChange('opportunities')}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all {activeSurface === 'opportunities'
				? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-sm'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<Target size={13} />
			<span>Peluang SEO & Anomali</span>
			{#if opportunitiesData?.strikingDistance?.length}
				<span class="rounded bg-black/25 px-1.5 py-0.2 text-[9px] font-mono">+{opportunitiesData.strikingDistance.length}</span>
			{/if}
		</button>

		<button
			onclick={() => handleSurfaceChange('sitemaps')}
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all {activeSurface === 'sitemaps'
				? 'bg-gradient-to-r from-cyan-600 to-blue-500 text-white shadow-sm'
				: 'text-label hover:text-heading hover:bg-card-hover'}"
		>
			<GitMerge size={13} />
			<span>XML Sitemaps</span>
		</button>
	</div>

	<!-- Dedicated View When Search Console is Not Connected -->
	{#if !data?.connected}
		<div class="card-inset p-8 sm:p-10 rounded-2xl border border-indigo-500/25 bg-gradient-to-b from-indigo-950/20 via-card to-card flex flex-col items-center text-center gap-6 my-2">
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg">
				<Search size={32} />
			</div>

			<div class="flex flex-col items-center gap-2 max-w-xl">
				<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
					<KeyRound size={12} />
					<span>Integrasi Google Search Console Resmi</span>
				</div>
				<h2 class="text-xl sm:text-2xl font-bold tracking-tight text-heading">
					Google Search Console Belum Terhubung
				</h2>
				<p class="text-xs sm:text-sm text-label leading-relaxed">
					Website <strong class="font-mono text-heading">{activeSite?.domain || 'properti ini'}</strong> belum terhubung ke Google Search Console API. Tidak ada data dummy yang ditampilkan. Hubungkan Service Account atau OAuth untuk menampilkan metrik klik, impresi, CTR, peringkat kata kunci, dan status indeks langsung dari Googlebot.
				</p>
			</div>

			<div class="flex flex-wrap items-center justify-center gap-3">
				<a
					href="/settings/integrations"
					class="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer"
				>
					<KeyRound size={15} />
					<span>Hubungkan Search Console</span>
				</a>
				<a
					href="/docs/google-search-console"
					class="flex items-center gap-2 rounded-lg border border-themed bg-input px-4 py-2.5 text-xs sm:text-sm font-medium text-body hover:text-heading hover:bg-card-hover transition-all"
				>
					<BookOpen size={15} class="text-primary" />
					<span>Panduan Integrasi GSC</span>
				</a>
			</div>

			<!-- Feature Highlights Bento -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-4xl text-left mt-2">
				<div class="card-inset p-4 rounded-xl border border-themed flex flex-col gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
						<Search size={16} />
					</div>
					<h4 class="text-xs font-semibold text-heading">Kata Kunci &amp; Ranking SERP</h4>
					<p class="text-[11px] text-label leading-relaxed">
						Lacak query pencarian nyata yang diketik audiens di Google, total klik, impresi tayangan, CTR, dan posisi rata-rata halaman.
					</p>
				</div>

				<div class="card-inset p-4 rounded-xl border border-themed flex flex-col gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
						<Newspaper size={16} />
					</div>
					<h4 class="text-xs font-semibold text-heading">Google News &amp; Discover</h4>
					<p class="text-[11px] text-label leading-relaxed">
						Pantau performa khusus artikel berita pada tab Google News dan feed personal Google Discover langsung dari data Google.
					</p>
				</div>

				<div class="card-inset p-4 rounded-xl border border-themed flex flex-col gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
						<ShieldCheck size={16} />
					</div>
					<h4 class="text-xs font-semibold text-heading">Status Indeks &amp; Sitemaps</h4>
					<p class="text-[11px] text-label leading-relaxed">
						Cek status pengindeksan Googlebot secara live, lakukan URL inspection langsung, dan kirim file XML Sitemap secara otomatis.
					</p>
				</div>
			</div>
		</div>
	{:else}

	{#if data?.errorWarning}
		<div class="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-body">
			<AlertCircle size={15} class="shrink-0 text-primary" />
			<span>{data.errorWarning}</span>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- SURFACE 1, 2, 3: WEB SEARCH, GOOGLE NEWS, GOOGLE DISCOVER -->
	<!-- ========================================================================= -->
	{#if activeSurface === 'web' || activeSurface === 'news' || activeSurface === 'discover'}
		<!-- KPI Metric Cards Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
			<!-- Total Clicks -->
			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-themed">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium">
						{activeSurface === 'news' ? 'Google News Clicks' : activeSurface === 'discover' ? 'Google Discover Clicks' : 'Total Search Clicks'}
					</span>
					<div class="flex h-6 w-6 items-center justify-center rounded {activeSurface === 'news' ? 'bg-cyan-500/10 text-cyan-400' : activeSurface === 'discover' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'}">
						<MousePointerClick size={14} />
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-2xl font-bold tracking-tight text-heading">
						{formatNum(data?.totalClicks || 0)}
					</span>
					<span class="text-[11px] font-mono {activeSurface === 'news' ? 'text-cyan-400' : activeSurface === 'discover' ? 'text-rose-400' : 'text-emerald-400'} font-medium flex items-center">
						<TrendingUp size={11} class="mr-0.5" />
						{activeSurface === 'news' ? 'News Feed' : activeSurface === 'discover' ? 'Discover Feed' : 'Organic'}
					</span>
				</div>
				<span class="text-[11px] text-hint">
					{activeSurface === 'news' ? 'Klik dari tab & feed Google News' : activeSurface === 'discover' ? 'Klik dari feed Google Discover' : 'Klik dari hasil pencarian organik Google'}
				</span>
			</div>

			<!-- Total Impressions -->
			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-themed">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium">
						{activeSurface === 'news' ? 'News Impressions' : activeSurface === 'discover' ? 'Discover Impressions' : 'Search Impressions'}
					</span>
					<div class="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/10 text-cyan-400">
						<Eye size={14} />
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-2xl font-bold tracking-tight text-heading">
						{formatNum(data?.totalImpressions || 0)}
					</span>
					<span class="text-[11px] font-mono text-label">Tayangan</span>
				</div>
				<span class="text-[11px] text-hint">
					{activeSurface === 'news' ? 'Berapa kali artikel tampil di Google News' : activeSurface === 'discover' ? 'Tayangan kartu artikel di feed Discover' : 'Berapa kali situs muncul di hasil pencarian'}
				</span>
			</div>

			<!-- Average CTR -->
			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-themed">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium">Rata-rata CTR</span>
					<div class="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
						<Percent size={14} />
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-2xl font-bold tracking-tight text-heading">
						{data?.averageCtr || 0}%
					</span>
					<span class="text-[11px] font-mono text-label">Click-through rate</span>
				</div>
				<span class="text-[11px] text-hint">Rasio pengunjung yang mengeklik hasil tayangan</span>
			</div>

			<!-- Average Position or Dominant Device -->
			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-themed">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium">{activeSurface === 'discover' ? 'Platform Utama' : 'Rata-rata Posisi'}</span>
					<div class="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
						{#if activeSurface === 'discover'}
							<Smartphone size={14} />
						{:else}
							<Award size={14} />
						{/if}
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					{#if activeSurface === 'discover'}
						<span class="font-mono text-xl font-bold tracking-tight text-heading">Mobile Feed</span>
						<span class="rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
							Chrome &amp; App
						</span>
					{:else}
						<span class="font-mono text-2xl font-bold tracking-tight text-heading">
							#{data?.averagePosition || 0}
						</span>
						<span class="rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold {getPositionBadgeClass(data?.averagePosition || 10)}">
							{(data?.averagePosition || 0) <= 3 ? 'Top 3 Tier' : (data?.averagePosition || 0) <= 10 ? 'Halaman 1' : 'Deep Rank'}
						</span>
					{/if}
				</div>
				<span class="text-[11px] text-hint">
					{activeSurface === 'discover' ? 'Peringkat tidak berlaku di Discover (berbasis AI feed)' : 'Peringkat rata-rata di kata kunci pencarian'}
				</span>
			</div>
		</div>

		<!-- Time Series Performance Chart -->
		{#if data?.timeSeries && data.timeSeries.length > 0}
			<div class="card-inset flex flex-col gap-3 p-5 border border-themed">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<TrendingUp size={14} class={activeSurface === 'news' ? 'text-cyan-400' : activeSurface === 'discover' ? 'text-rose-400' : 'text-indigo-400'} />
						<h3 class="text-xs font-semibold uppercase tracking-wider text-body">
							{activeSurface === 'news' ? 'Tren Google News (Clicks & Impressions)' : activeSurface === 'discover' ? 'Tren Google Discover (Clicks & Impressions)' : 'Tren Pencarian Google (Clicks & Impressions)'}
						</h3>
					</div>
					<div class="flex items-center gap-3 text-[11px] font-mono">
						<span class="flex items-center gap-1.5 text-label">
							<span class="h-2 w-2 rounded-full {activeSurface === 'news' ? 'bg-cyan-500' : activeSurface === 'discover' ? 'bg-rose-500' : 'bg-indigo-500'}"></span> Clicks
						</span>
						<span class="flex items-center gap-1.5 text-label">
							<span class="h-2 w-2 rounded-full bg-cyan-400/50"></span> Impressions
						</span>
					</div>
				</div>

				<!-- Mini Bar Chart -->
				<div class="h-28 w-full flex items-end gap-1.5 pt-4">
					{#each data.timeSeries as point}
						{@const heightPercent = Math.max((point.clicks / maxClicks) * 100, 4)}
						<div
							class="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
							title="{point.date}: {point.clicks} clicks, {point.impressions} impressions, CTR: {point.ctr}%"
						>
							<div
								class="w-full rounded-t transition-all duration-300 opacity-75 group-hover:opacity-100 {activeSurface === 'news'
									? 'bg-gradient-to-t from-blue-600 to-cyan-400 group-hover:from-blue-500 group-hover:to-cyan-300'
									: activeSurface === 'discover'
										? 'bg-gradient-to-t from-rose-600 to-pink-400 group-hover:from-rose-500 group-hover:to-pink-300'
										: 'bg-gradient-to-t from-indigo-600 to-cyan-400 group-hover:from-indigo-500 group-hover:to-cyan-300'}"
								style="height: {heightPercent}%;"
							></div>

							<div class="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20">
								<div class="rounded bg-slate-900 px-2 py-1 text-[10px] font-mono text-white shadow-lg whitespace-nowrap border border-themed">
									{point.date}: {point.clicks} clicks ({point.impressions} impr)
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="flex items-center justify-between text-[10px] font-mono text-hint pt-1 border-t border-themed">
					<span>{data.timeSeries[0]?.date}</span>
					<span>{data.timeSeries[Math.floor(data.timeSeries.length / 2)]?.date}</span>
					<span>{data.timeSeries[data.timeSeries.length - 1]?.date}</span>
				</div>
			</div>
		{/if}

		<!-- Analytics Tabs & Table -->
		<div class="card-inset flex flex-col gap-4 p-5 border border-themed">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-themed pb-4">
				<div class="flex items-center gap-1 flex-wrap">
					<button
						onclick={() => (activeTab = 'queries')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {activeTab === 'queries'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<Search size={13} />
						<span>{activeSurface === 'discover' ? 'Topik Rekomendasi' : 'Kata Kunci'} ({data?.topQueries?.length || 0})</span>
					</button>

					<button
						onclick={() => (activeTab = 'pages')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {activeTab === 'pages'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<ArrowUpRight size={13} />
						<span>{activeSurface === 'discover' ? 'Artikel Discover' : activeSurface === 'news' ? 'Artikel Google News' : 'Halaman Pendaratan'} ({data?.topPages?.length || 0})</span>
					</button>

					<button
						onclick={() => (activeTab = 'countries')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {activeTab === 'countries'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<Globe size={13} />
						<span>Negara ({data?.countries?.length || 0})</span>
					</button>

					<button
						onclick={() => (activeTab = 'devices')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {activeTab === 'devices'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<Monitor size={13} />
						<span>Perangkat</span>
					</button>
				</div>

				{#if activeTab === 'queries' || activeTab === 'pages'}
					<div class="relative w-full sm:w-64">
						<Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-hint" />
						<input
							type="text"
							bind:value={searchQuery}
							placeholder={activeTab === 'queries' ? 'Filter kata kunci...' : 'Filter URL artikel...'}
							class="w-full rounded-md border border-themed bg-input pl-8 pr-3 py-1.5 text-xs text-heading placeholder:text-hint focus:border-indigo-500 focus:outline-none"
						/>
					</div>
				{/if}
			</div>

			<!-- Table: Queries -->
			{#if activeTab === 'queries'}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="border-b border-themed text-[11px] font-mono text-hint">
								<th class="py-2.5 px-3 font-medium">{activeSurface === 'discover' ? 'Topik Rekomendasi' : 'Kata Kunci Pencarian'}</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('clicks')}>
									<span class="inline-flex items-center gap-1">Clicks <ArrowUpDown size={11} /></span>
								</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('impressions')}>
									<span class="inline-flex items-center gap-1">Impressions <ArrowUpDown size={11} /></span>
								</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('ctr')}>
									<span class="inline-flex items-center gap-1">CTR <ArrowUpDown size={11} /></span>
								</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('position')}>
									<span class="inline-flex items-center gap-1">Posisi <ArrowUpDown size={11} /></span>
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-themed font-mono">
							{#if filteredQueries.length === 0}
								<tr>
									<td colspan="5" class="py-8 text-center text-xs text-hint">
										Tidak ada kata kunci yang cocok dengan filter
									</td>
								</tr>
							{:else}
								{#each filteredQueries as item}
									<tr class="hover:bg-card-hover transition-colors group">
										<td class="py-2.5 px-3 font-sans font-medium text-heading">
											<div class="flex items-center gap-2">
												<span class="text-body group-hover:text-heading transition-colors">{item.query}</span>
												<a
													href="https://www.google.com/search?q={encodeURIComponent(item.query)}"
													target="_blank"
													rel="noreferrer"
													class="opacity-0 group-hover:opacity-100 text-hint hover:text-cyan-400 transition-opacity"
													title="Cari di Google"
												>
													<ExternalLink size={11} />
												</a>
											</div>
										</td>
										<td class="py-2.5 px-3 text-right font-semibold text-heading">{formatNum(item.clicks)}</td>
										<td class="py-2.5 px-3 text-right text-label">{formatNum(item.impressions)}</td>
										<td class="py-2.5 px-3 text-right">
											<div class="flex items-center justify-end gap-1.5">
												<span class="text-body font-medium">{item.ctr.toFixed(1)}%</span>
												<div class="w-12 h-1 rounded-full bg-input overflow-hidden">
													<div class="h-full bg-emerald-400 rounded-full" style="width: {Math.min(item.ctr * 4, 100)}%;"></div>
												</div>
											</div>
										</td>
										<td class="py-2.5 px-3 text-right">
											<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border {getPositionBadgeClass(item.position)}">
												#{item.position.toFixed(1)}
											</span>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Table: Landing Pages -->
			{#if activeTab === 'pages'}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead>
							<tr class="border-b border-themed text-[11px] font-mono text-hint">
								<th class="py-2.5 px-3 font-medium">URL Halaman / Artikel</th>
								<th class="py-2.5 px-3 font-medium text-center">Fitur Tampil</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('clicks')}>
									<span class="inline-flex items-center gap-1">Clicks <ArrowUpDown size={11} /></span>
								</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('impressions')}>
									<span class="inline-flex items-center gap-1">Impressions <ArrowUpDown size={11} /></span>
								</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('ctr')}>
									<span class="inline-flex items-center gap-1">CTR <ArrowUpDown size={11} /></span>
								</th>
								<th class="py-2.5 px-3 font-medium cursor-pointer text-right" onclick={() => toggleSort('position')}>
									<span class="inline-flex items-center gap-1">Posisi <ArrowUpDown size={11} /></span>
								</th>
								<th class="py-2.5 px-3 font-medium text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-themed font-mono">
							{#if filteredPages.length === 0}
								<tr>
									<td colspan="7" class="py-8 text-center text-xs text-hint">
										Tidak ada URL yang cocok dengan filter
									</td>
								</tr>
							{:else}
								{#each filteredPages as item}
									<tr class="hover:bg-card-hover transition-colors group">
										<td class="py-2.5 px-3 text-body group-hover:text-heading truncate max-w-sm">
											<a href={item.page} target="_blank" rel="noreferrer" class="hover:underline flex items-center gap-1.5 truncate">
												<span class="truncate">{item.page}</span>
												<ExternalLink size={10} class="shrink-0 text-hint" />
											</a>
										</td>
										<td class="py-2.5 px-3 text-center">
											<div class="flex items-center justify-center gap-1">
												<span class="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-400 border border-indigo-500/20">
													<Search size={9} /> Web
												</span>
												{#if item.inGoogleNews || activeSurface === 'news'}
													<span class="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">
														<Newspaper size={9} /> News
													</span>
												{/if}
												{#if activeSurface === 'discover'}
													<span class="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-400 border border-rose-500/20">
														<Compass size={9} /> Discover
													</span>
												{/if}
											</div>
										</td>
										<td class="py-2.5 px-3 text-right font-semibold text-heading">{formatNum(item.clicks)}</td>
										<td class="py-2.5 px-3 text-right text-label">{formatNum(item.impressions)}</td>
										<td class="py-2.5 px-3 text-right font-medium text-body">{item.ctr.toFixed(1)}%</td>
										<td class="py-2.5 px-3 text-right">
											<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border {getPositionBadgeClass(item.position)}">
												#{item.position.toFixed(1)}
											</span>
										</td>
										<td class="py-2.5 px-3 text-right">
											<button
												onclick={() => {
													activeSurface = 'indexation';
													runInspectUrl(item.page);
												}}
												class="inline-flex items-center gap-1 rounded border border-themed bg-input px-2 py-0.5 text-[10px] font-medium text-body hover:text-heading hover:bg-card-hover cursor-pointer"
											>
												<ShieldCheck size={10} class="text-emerald-400" />
												<span>Cek Indeks</span>
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Table: Countries -->
			{#if activeTab === 'countries'}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs font-mono">
						<thead>
							<tr class="border-b border-themed text-[11px] text-hint">
								<th class="py-2.5 px-3 font-medium">Negara</th>
								<th class="py-2.5 px-3 font-medium text-right">Clicks</th>
								<th class="py-2.5 px-3 font-medium text-right">Impressions</th>
								<th class="py-2.5 px-3 font-medium text-right">CTR</th>
								<th class="py-2.5 px-3 font-medium text-right">Rata-rata Posisi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-themed">
							{#each data?.countries || [] as item}
								<tr class="hover:bg-card-hover transition-colors">
									<td class="py-2.5 px-3 font-sans font-medium text-heading">{formatCountryName(item.country)}</td>
									<td class="py-2.5 px-3 text-right font-semibold text-heading">{formatNum(item.clicks)}</td>
									<td class="py-2.5 px-3 text-right text-label">{formatNum(item.impressions)}</td>
									<td class="py-2.5 px-3 text-right text-body">{item.ctr.toFixed(1)}%</td>
									<td class="py-2.5 px-3 text-right">
										<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border {getPositionBadgeClass(item.position)}">
											#{item.position.toFixed(1)}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Cards: Devices -->
			{#if activeTab === 'devices'}
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
					{#each data?.devices || [] as dev}
						{@const isDesktop = dev.device.toUpperCase().includes('DESKTOP')}
						{@const isMobile = dev.device.toUpperCase().includes('MOBILE')}
						<div class="card-inset p-4 rounded-lg border border-themed flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="flex h-7 w-7 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
										{#if isDesktop}
											<Monitor size={15} />
										{:else if isMobile}
											<Smartphone size={15} />
										{:else}
											<Tablet size={15} />
										{/if}
									</div>
									<span class="text-xs font-semibold text-heading uppercase font-mono">{dev.device}</span>
								</div>
								<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border {getPositionBadgeClass(dev.position)}">
									Pos: #{dev.position.toFixed(1)}
								</span>
							</div>

							<div class="grid grid-cols-3 gap-2 border-t border-themed pt-3 font-mono text-center">
								<div class="flex flex-col">
									<span class="text-[10px] text-hint">Clicks</span>
									<span class="text-sm font-bold text-heading">{formatNum(dev.clicks)}</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[10px] text-hint">Impressions</span>
									<span class="text-sm font-medium text-label">{formatNum(dev.impressions)}</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[10px] text-hint">CTR</span>
									<span class="text-sm font-semibold text-emerald-400">{dev.ctr.toFixed(1)}%</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- SURFACE 4: STATUS INDEKS GOOGLE & DETEKSI URL -->
	<!-- ========================================================================= -->
	{#if activeSurface === 'indexation'}
		<!-- KPI Summary Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-emerald-500/20 bg-emerald-950/10">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium text-emerald-400">Sudah Terindex di Google</span>
					<div class="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
						<CheckCircle2 size={14} />
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-2xl font-bold tracking-tight text-heading">
						{indexationData?.totalUrlsIndexed || 0}
					</span>
					<span class="text-[11px] font-mono text-emerald-400 font-medium">Halaman Aktif</span>
				</div>
				<span class="text-[11px] text-hint">URL berhasil dirayapi dan tersimpan di indeks Google</span>
			</div>

			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-cyan-500/20 bg-cyan-950/10">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium text-cyan-400">Muncul di Google Pencarian</span>
					<div class="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/10 text-cyan-400">
						<Search size={14} />
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-2xl font-bold tracking-tight text-heading">
						{indexationData?.totalUrlsInGoogleSearch || 0}
					</span>
					<span class="text-[11px] font-mono text-cyan-400 font-medium">Menerima Tayangan</span>
				</div>
				<span class="text-[11px] text-hint">Halaman aktif mendapatkan impresi organik di Google Search</span>
			</div>

			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-cyan-500/20 bg-cyan-950/10">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium text-cyan-400">Muncul di Google News</span>
					<div class="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/10 text-cyan-400">
						<Newspaper size={14} />
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-2xl font-bold tracking-tight text-heading">
						{indexationData?.totalUrlsInGoogleNews || 0}
					</span>
					<span class="text-[11px] font-mono text-cyan-400 font-medium">Artikel News</span>
				</div>
				<span class="text-[11px] text-hint">Artikel yang lolos dan muncul pada tab Google News &amp; Top Stories</span>
			</div>

			<div class="card-inset flex flex-col gap-2 p-4 transition-all border border-rose-500/20 bg-rose-950/10">
				<div class="flex items-center justify-between text-xs text-label">
					<span class="font-medium text-rose-400">Belum Terindex / Dikecualikan</span>
					<div class="flex h-6 w-6 items-center justify-center rounded bg-rose-500/10 text-rose-400">
						<AlertTriangle size={14} />
					</div>
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-mono text-2xl font-bold tracking-tight text-heading">
						{indexationData?.totalExcludedOrPending || 0}
					</span>
					<span class="text-[11px] font-mono text-rose-400 font-medium">Perlu Tinjauan</span>
				</div>
				<span class="text-[11px] text-hint">URL ditemukan namun belum diindeks atau diblokir robots.txt</span>
			</div>
		</div>

		<!-- Interactive Googlebot URL Inspection Tool -->
		<div class="card-inset p-5 rounded-xl border border-indigo-500/25 bg-card flex flex-col gap-4">
			<div class="flex items-center justify-between flex-wrap gap-2">
				<div class="flex items-center gap-2">
					<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
						<Zap size={15} />
					</div>
					<div>
						<h3 class="text-xs font-semibold text-heading uppercase tracking-wider">
							Inspeksi URL Googlebot Real-Time
						</h3>
						<p class="text-[11px] text-hint">
							Cek langsung status pengindeksan, kanonikal, dan kelayakan perayapan Googlebot untuk URL apapun.
						</p>
					</div>
				</div>
				<div class="text-[11px] text-hint font-mono">
					API: Google URL Inspection API v1
				</div>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					runInspectUrl();
				}}
				class="flex flex-col sm:flex-row items-center gap-2"
			>
				<div class="relative flex-1 w-full">
					<ShieldCheck size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-hint" />
					<input
						type="url"
						bind:value={inspectUrlInput}
						placeholder="https://{activeSite?.domain || 'contoh.com'}/artikel-terbaru"
						class="w-full rounded-lg border border-themed bg-input pl-9 pr-3 py-2 text-xs font-mono text-heading placeholder:text-hint focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={isInspecting || !inspectUrlInput.trim()}
					class="w-full sm:w-auto flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-indigo-400 transition-all disabled:opacity-50 cursor-pointer"
				>
					{#if isInspecting}
						<RefreshCw size={13} class="animate-spin text-white" />
						<span>Memeriksa Googlebot...</span>
					{:else}
						<Zap size={13} />
						<span>Inspeksi Googlebot</span>
					{/if}
				</button>
			</form>

			{#if inspectError}
				<div class="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
					<XCircle size={15} class="shrink-0 text-rose-400" />
					<span>{inspectError}</span>
				</div>
			{/if}

			{#if inspectionResult}
				<div class="card-inset p-4 rounded-xl border border-themed bg-input/40 flex flex-col gap-3.5 transition-all">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-themed pb-3">
						<div class="flex items-center gap-2 flex-wrap">
							{#if inspectionResult.verdict === 'PASS'}
								<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/25">
									<CheckCircle2 size={13} /> URL Ada di Google (Terindex)
								</span>
							{:else}
								<span class="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/25">
									<AlertTriangle size={13} /> URL Belum Terindex di Google
								</span>
							{/if}

							{#if inspectionResult.isInGoogleSearch}
								<span class="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
									<Search size={11} /> Muncul di Pencarian
								</span>
							{/if}

							{#if inspectionResult.isInGoogleNews}
								<span class="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
									<Newspaper size={11} /> Muncul di Google News
								</span>
							{/if}
						</div>

						<a
							href={inspectionResult.inspectionUrl}
							target="_blank"
							rel="noreferrer"
							class="text-xs font-mono text-hint hover:text-heading flex items-center gap-1 truncate max-w-sm"
						>
							<span class="truncate">{inspectionResult.inspectionUrl}</span>
							<ExternalLink size={11} class="shrink-0" />
						</a>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] text-hint uppercase tracking-wider font-sans">Cakupan Indeks</span>
							<span class="font-semibold text-heading">{inspectionResult.coverageState || 'Submitted and indexed'}</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] text-hint uppercase tracking-wider font-sans">Status Pengindeksan</span>
							<span class="font-semibold {inspectionResult.indexingState === 'INDEXING_ALLOWED' ? 'text-emerald-400' : 'text-rose-400'}">
								{inspectionResult.indexingState === 'INDEXING_ALLOWED' ? 'Diizinkan (Allowed)' : inspectionResult.indexingState}
							</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] text-hint uppercase tracking-wider font-sans">Perayapan Terakhir</span>
							<span class="text-body">{inspectionResult.lastCrawlTime ? new Date(inspectionResult.lastCrawlTime).toLocaleString('id-ID') : 'Belum pernah dirayapi'}</span>
						</div>
						<div class="flex flex-col gap-0.5">
							<span class="text-[10px] text-hint uppercase tracking-wider font-sans">Agen Perayap</span>
							<span class="text-body">{inspectionResult.crawledAs || 'Googlebot Smartphone'}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- URL Table -->
		<div class="card-inset flex flex-col gap-4 p-5 border border-themed">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-themed pb-4">
				<div class="flex items-center gap-1.5 flex-wrap">
					<button
						onclick={() => (indexationFilter = 'all')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {indexationFilter === 'all'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<span>Semua URL ({indexationData?.urls?.length || 0})</span>
					</button>

					<button
						onclick={() => (indexationFilter = 'indexed')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {indexationFilter === 'indexed'
							? 'bg-emerald-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<CheckCircle2 size={13} />
						<span>Sudah Terindex ({indexationData?.totalUrlsIndexed || 0})</span>
					</button>

					<button
						onclick={() => (indexationFilter = 'search')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {indexationFilter === 'search'
							? 'bg-cyan-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<Search size={13} />
						<span>Muncul di Pencarian ({indexationData?.totalUrlsInGoogleSearch || 0})</span>
					</button>

					<button
						onclick={() => (indexationFilter = 'news')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {indexationFilter === 'news'
							? 'bg-blue-600 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<Newspaper size={13} />
						<span>Muncul di Google News ({indexationData?.totalUrlsInGoogleNews || 0})</span>
					</button>

					<button
						onclick={() => (indexationFilter = 'excluded')}
						class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {indexationFilter === 'excluded'
							? 'bg-slate-700 text-white shadow-xs'
							: 'text-label hover:text-heading hover:bg-card-hover'}"
					>
						<AlertTriangle size={13} />
						<span>Belum Terindex ({indexationData?.totalExcludedOrPending || 0})</span>
					</button>
				</div>

				<div class="relative w-full sm:w-64">
					<Search size={13} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-hint" />
					<input
						type="text"
						bind:value={indexationSearch}
						placeholder="Cari URL / path..."
						class="w-full rounded-md border border-themed bg-input pl-8 pr-3 py-1.5 text-xs text-heading placeholder:text-hint focus:border-indigo-500 focus:outline-none"
					/>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs font-mono">
					<thead>
						<tr class="border-b border-themed text-[11px] text-hint">
							<th class="py-2.5 px-3 font-medium">Halaman / URL</th>
							<th class="py-2.5 px-3 font-medium">Status Indeks</th>
							<th class="py-2.5 px-3 font-medium">Google Pencarian</th>
							<th class="py-2.5 px-3 font-medium">Google News</th>
							<th class="py-2.5 px-3 font-medium">Perayapan Terakhir</th>
							<th class="py-2.5 px-3 font-medium text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-themed">
						{#if filteredIndexationUrls.length === 0}
							<tr>
								<td colspan="6" class="py-8 text-center text-xs text-hint">
									Tidak ada URL yang cocok dengan filter
								</td>
							</tr>
						{:else}
							{#each filteredIndexationUrls as item}
								<tr class="hover:bg-card-hover transition-colors group">
									<td class="py-2.5 px-3 text-body group-hover:text-heading truncate max-w-sm">
										<div class="flex flex-col">
											<a href={item.url} target="_blank" rel="noreferrer" class="hover:underline flex items-center gap-1.5 truncate">
												<span class="truncate font-sans font-medium text-heading">{item.path}</span>
												<ExternalLink size={10} class="shrink-0 text-hint" />
											</a>
											<span class="text-[10px] text-hint truncate">{item.url}</span>
										</div>
									</td>
									<td class="py-2.5 px-3">
										{#if item.indexed}
											<div class="flex flex-col gap-0.5">
												<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
													<CheckCircle2 size={12} /> Terindex
												</span>
												<span class="text-[10px] text-hint">{item.coverageStatus}</span>
											</div>
										{:else}
											<div class="flex flex-col gap-0.5">
												<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
													<AlertTriangle size={12} /> Dikecualikan
												</span>
												<span class="text-[10px] text-hint">{item.coverageStatus}</span>
											</div>
										{/if}
									</td>
									<td class="py-2.5 px-3">
										{#if item.inGoogleSearch}
											<div class="flex flex-col gap-0.5">
												<span class="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20 w-fit">
													<Check size={10} /> Muncul 🔍
												</span>
												<span class="text-[10px] text-label">{formatNum(item.searchClicks)} clicks · {formatNum(item.searchImpressions)} impr</span>
											</div>
										{:else}
											<span class="text-[11px] text-hint">—</span>
										{/if}
									</td>
									<td class="py-2.5 px-3">
										{#if item.inGoogleNews}
											<div class="flex flex-col gap-0.5">
												<span class="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20 w-fit">
													<Check size={10} /> Muncul 📰
												</span>
												<span class="text-[10px] text-label">{formatNum(item.newsClicks)} clicks · {formatNum(item.newsImpressions)} impr</span>
											</div>
										{:else}
											<span class="text-[11px] text-hint">—</span>
										{/if}
									</td>
									<td class="py-2.5 px-3 text-label">
										{#if item.lastCrawledAt}
											<div class="flex items-center gap-1 text-[11px]">
												<Clock size={11} class="text-hint" />
												<span>{new Date(item.lastCrawledAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
											</div>
										{:else}
											<span class="text-hint text-[11px]">Belum dirayapi</span>
										{/if}
									</td>
									<td class="py-2.5 px-3 text-right">
										<button
											onclick={() => runInspectUrl(item.url)}
											class="inline-flex items-center gap-1 rounded-md border border-themed bg-input px-2.5 py-1 text-xs font-medium text-body hover:text-heading hover:bg-card-hover transition-colors cursor-pointer"
										>
											<ShieldCheck size={12} class="text-indigo-400" />
											<span>Inspeksi</span>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- SURFACE 5: PELUANG SEO, STRIKING DISTANCE, LOW CTR & ANOMALI -->
	<!-- ========================================================================= -->
	{#if activeSurface === 'opportunities'}
		<!-- Anomaly Alert Cards -->
		{#if opportunitiesData?.anomalies && opportunitiesData.anomalies.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
				{#each opportunitiesData.anomalies as anomaly}
					<div class="card-inset p-4 rounded-xl border {anomaly.type === 'spike' ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-rose-500/30 bg-rose-950/15'} flex items-start gap-3">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {anomaly.type === 'spike' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} mt-0.5">
							{#if anomaly.type === 'spike'}
								<TrendingUp size={16} />
							{:else}
								<AlertTriangle size={16} />
							{/if}
						</div>
						<div class="flex flex-col gap-1 flex-1">
							<div class="flex items-center justify-between">
								<h4 class="text-xs font-bold text-heading">{anomaly.title}</h4>
								<span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded {anomaly.type === 'spike' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
									{anomaly.metric}
								</span>
							</div>
							<p class="text-xs text-label leading-relaxed">{anomaly.description}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Subtabs: Striking Distance vs Low CTR vs Cannibalization -->
		<div class="card-inset flex flex-col gap-4 p-5 border border-themed">
			<div class="flex items-center gap-1.5 border-b border-themed pb-3 flex-wrap">
				<button
					onclick={() => (oppSubTab = 'striking')}
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {oppSubTab === 'striking'
						? 'bg-indigo-600 text-white shadow-xs'
						: 'text-label hover:text-heading hover:bg-card-hover'}"
				>
					<Target size={13} />
					<span>Striking Distance: Peluang Top 3 ({opportunitiesData?.strikingDistance?.length || 0})</span>
				</button>

				<button
					onclick={() => (oppSubTab = 'low_ctr')}
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {oppSubTab === 'low_ctr'
						? 'bg-indigo-600 text-white shadow-xs'
						: 'text-label hover:text-heading hover:bg-card-hover'}"
				>
					<Percent size={13} />
					<span>Optimasi CTR (#1–#5) ({opportunitiesData?.lowCtrOpportunities?.length || 0})</span>
				</button>

				<button
					onclick={() => (oppSubTab = 'cannibalization')}
					class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all {oppSubTab === 'cannibalization'
						? 'bg-indigo-600 text-white shadow-xs'
						: 'text-label hover:text-heading hover:bg-card-hover'}"
				>
					<GitMerge size={13} />
					<span>Kanibalisasi Kata Kunci ({opportunitiesData?.cannibalization?.length || 0})</span>
				</button>
			</div>

			<!-- Tab 1: Striking Distance -->
			{#if oppSubTab === 'striking'}
				<div class="flex flex-col gap-2">
					<p class="text-xs text-hint">
						Kata kunci yang sudah berada di peringkat <strong>#4 hingga #20</strong> dengan volume tayangan tinggi. Dengan sedikit penguatan konten atau internal link, kata kunci ini berpotensi melonjak ke Top 3 dan memberikan lonjakan klik yang signifikan.
					</p>
					<div class="overflow-x-auto pt-2">
						<table class="w-full text-left text-xs font-mono">
							<thead>
								<tr class="border-b border-themed text-[11px] text-hint">
									<th class="py-2.5 px-3 font-medium">Kata Kunci Target</th>
									<th class="py-2.5 px-3 font-medium">Halaman Utama</th>
									<th class="py-2.5 px-3 font-medium text-right">Posisi</th>
									<th class="py-2.5 px-3 font-medium text-right">Tayangan</th>
									<th class="py-2.5 px-3 font-medium text-right">Klik Saat Ini</th>
									<th class="py-2.5 px-3 font-medium text-right text-emerald-400">Potensi Kenaikan Klik</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-themed">
								{#each opportunitiesData?.strikingDistance || [] as item}
									<tr class="hover:bg-card-hover transition-colors">
										<td class="py-2.5 px-3 font-sans font-semibold text-heading">{item.query}</td>
										<td class="py-2.5 px-3 text-body truncate max-w-xs">{item.page}</td>
										<td class="py-2.5 px-3 text-right">
											<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border {getPositionBadgeClass(item.position)}">
												#{item.position.toFixed(1)}
											</span>
										</td>
										<td class="py-2.5 px-3 text-right text-label">{formatNum(item.impressions)}</td>
										<td class="py-2.5 px-3 text-right text-body">{formatNum(item.clicks)}</td>
										<td class="py-2.5 px-3 text-right font-bold text-emerald-400">
											+{formatNum(item.potentialClicksGain)} klik/bln
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Tab 2: Low CTR Opportunities -->
			{#if oppSubTab === 'low_ctr'}
				<div class="flex flex-col gap-2">
					<p class="text-xs text-hint">
						Kata kunci yang sudah berada di peringkat <strong>Top 5</strong> di Google tetapi memiliki CTR di bawah standar industri. Memperbaiki <em>Meta Title</em> dan <em>Meta Description</em> agar lebih menarik akan langsung mendongkrak traffic Anda.
					</p>
					<div class="overflow-x-auto pt-2">
						<table class="w-full text-left text-xs font-mono">
							<thead>
								<tr class="border-b border-themed text-[11px] text-hint">
									<th class="py-2.5 px-3 font-medium">Kata Kunci</th>
									<th class="py-2.5 px-3 font-medium">Halaman</th>
									<th class="py-2.5 px-3 font-medium text-right">Posisi</th>
									<th class="py-2.5 px-3 font-medium text-right">CTR Aktual</th>
									<th class="py-2.5 px-3 font-medium text-right">Target CTR</th>
									<th class="py-2.5 px-3 font-medium text-right text-primary">Estimasi Klik Terlewat</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-themed">
								{#each opportunitiesData?.lowCtrOpportunities || [] as item}
									<tr class="hover:bg-card-hover transition-colors">
										<td class="py-2.5 px-3 font-sans font-semibold text-heading">{item.query}</td>
										<td class="py-2.5 px-3 text-body truncate max-w-xs">{item.page}</td>
										<td class="py-2.5 px-3 text-right">
											<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border {getPositionBadgeClass(item.position)}">
												#{item.position.toFixed(1)}
											</span>
										</td>
										<td class="py-2.5 px-3 text-right text-rose-400 font-semibold">{item.ctr.toFixed(1)}%</td>
										<td class="py-2.5 px-3 text-right text-label">{item.expectedCtr.toFixed(1)}%</td>
										<td class="py-2.5 px-3 text-right font-bold text-primary">
											+{formatNum(item.missedClicks)} klik terlewat
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Tab 3: Cannibalization -->
			{#if oppSubTab === 'cannibalization'}
				<div class="flex flex-col gap-2">
					<p class="text-xs text-hint">
						Dua atau lebih halaman dari website Anda saling bersaing untuk memperebutkan peringkat pada kueri yang sama. Tentukan halaman kanonikal utama atau gabungkan konten agar otoritas Google terpusat.
					</p>
					<div class="flex flex-col gap-3 pt-2">
						{#each opportunitiesData?.cannibalization || [] as item}
							<div class="card-inset p-3.5 rounded-lg border border-themed flex flex-col gap-2 font-mono">
								<div class="flex items-center justify-between border-b border-themed pb-2">
									<div class="flex items-center gap-2">
										<GitMerge size={14} class="text-indigo-400" />
										<span class="font-sans font-bold text-heading text-xs">{item.query}</span>
									</div>
									<div class="text-[11px] text-label">
										Total: {formatNum(item.totalClicks)} clicks · {formatNum(item.totalImpressions)} impresi
									</div>
								</div>
								<div class="flex flex-col gap-1.5">
									{#each item.pages as p}
										<div class="flex items-center justify-between text-xs py-1 px-2 rounded bg-input/50">
											<span class="text-body truncate max-w-md">{p.page}</span>
											<div class="flex items-center gap-3 shrink-0">
												<span class="text-heading font-semibold">{formatNum(p.clicks)} klik</span>
												<span class="text-label">{formatNum(p.impressions)} impr</span>
												<span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border {getPositionBadgeClass(p.position)}">
													#{p.position.toFixed(1)}
												</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- SURFACE 6: XML SITEMAPS MONITOR & SUBMIT -->
	<!-- ========================================================================= -->
	{#if activeSurface === 'sitemaps'}
		<!-- Submit Sitemap Toolbar -->
		<div class="card-inset p-5 rounded-xl border border-cyan-500/25 bg-card flex flex-col gap-4">
			<div class="flex items-center justify-between flex-wrap gap-2">
				<div class="flex items-center gap-2">
					<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
						<GitMerge size={15} />
					</div>
					<div>
						<h3 class="text-xs font-semibold text-heading uppercase tracking-wider">
							Kirim &amp; Pantau XML Sitemap
						</h3>
						<p class="text-[11px] text-hint">
							Beri tahu Googlebot mengenai struktur URL terbaru situs Anda via Google Search Console Sitemaps API.
						</p>
					</div>
				</div>
				<div class="text-[11px] text-hint font-mono">API: Google Sitemaps API v3</div>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSitemapSubmit();
				}}
				class="flex flex-col sm:flex-row items-center gap-2"
			>
				<div class="relative flex-1 w-full">
					<GitMerge size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-hint" />
					<input
						type="url"
						bind:value={newSitemapUrl}
						placeholder="https://{activeSite?.domain || 'contoh.com'}/sitemap.xml"
						class="w-full rounded-lg border border-themed bg-input pl-9 pr-3 py-2 text-xs font-mono text-heading placeholder:text-hint focus:border-cyan-500 focus:outline-none"
					/>
				</div>

				<button
					type="submit"
					disabled={isSubmittingSitemap || !newSitemapUrl.trim()}
					class="w-full sm:w-auto flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-cyan-500 hover:to-blue-400 transition-all disabled:opacity-50 cursor-pointer"
				>
					{#if isSubmittingSitemap}
						<RefreshCw size={13} class="animate-spin text-white" />
						<span>Menyerahkan Sitemap...</span>
					{:else}
						<Plus size={13} />
						<span>Kirim Sitemap</span>
					{/if}
				</button>
			</form>

			{#if sitemapFeedback}
				<div class="flex items-center gap-2 rounded-lg p-3 text-xs {sitemapFeedback.type === 'success' ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'}">
					{#if sitemapFeedback.type === 'success'}
						<CheckCircle2 size={15} class="shrink-0 text-emerald-400" />
					{:else}
						<XCircle size={15} class="shrink-0 text-rose-400" />
					{/if}
					<span>{sitemapFeedback.message}</span>
				</div>
			{/if}
		</div>

		<!-- Sitemaps List Table -->
		<div class="card-inset flex flex-col gap-4 p-5 border border-themed">
			<div class="flex items-center justify-between border-b border-themed pb-3">
				<h3 class="text-xs font-semibold uppercase tracking-wider text-body">
					Daftar Sitemap Terdaftar ({sitemapsData?.sitemaps?.length || 0})
				</h3>
				<span class="text-[11px] font-mono text-hint">Properti: {sitemapsData?.propertyUrl || `sc-domain:${activeSite?.domain}`}</span>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs font-mono">
					<thead>
						<tr class="border-b border-themed text-[11px] text-hint">
							<th class="py-2.5 px-3 font-medium">Sitemap URL</th>
							<th class="py-2.5 px-3 font-medium">Jenis</th>
							<th class="py-2.5 px-3 font-medium">Terakhir Dikirim</th>
							<th class="py-2.5 px-3 font-medium">Terakhir Diunduh</th>
							<th class="py-2.5 px-3 font-medium text-right">Diserahkan</th>
							<th class="py-2.5 px-3 font-medium text-right">Diindeks</th>
							<th class="py-2.5 px-3 font-medium text-center">Status</th>
							<th class="py-2.5 px-3 font-medium text-right">Aksi</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-themed">
						{#if !sitemapsData?.sitemaps || sitemapsData.sitemaps.length === 0}
							<tr>
								<td colspan="8" class="py-8 text-center text-xs text-hint">
									Belum ada sitemap yang dikirim ke Google Search Console
								</td>
							</tr>
						{:else}
							{#each sitemapsData.sitemaps as item}
								{@const submitted = item.contents.reduce((a, b) => a + b.submitted, 0)}
								{@const indexed = item.contents.reduce((a, b) => a + b.indexed, 0)}
								<tr class="hover:bg-card-hover transition-colors">
									<td class="py-2.5 px-3 text-body truncate max-w-sm">
										<a href={item.path} target="_blank" rel="noreferrer" class="hover:underline flex items-center gap-1.5 truncate">
											<span class="truncate font-sans font-medium text-heading">{item.path}</span>
											<ExternalLink size={10} class="shrink-0 text-hint" />
										</a>
									</td>
									<td class="py-2.5 px-3">
										<span class="rounded bg-input px-1.5 py-0.5 text-[10px] text-label border border-themed">
											{item.isSitemapsIndex ? 'Sitemap Index' : 'Sitemap'}
										</span>
									</td>
									<td class="py-2.5 px-3 text-label">
										{item.lastSubmitted ? new Date(item.lastSubmitted).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
									</td>
									<td class="py-2.5 px-3 text-label">
										{item.lastDownloaded ? new Date(item.lastDownloaded).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
									</td>
									<td class="py-2.5 px-3 text-right font-semibold text-heading">{formatNum(submitted)}</td>
									<td class="py-2.5 px-3 text-right font-semibold text-emerald-400">{formatNum(indexed)}</td>
									<td class="py-2.5 px-3 text-center">
										{#if item.errors > 0}
											<span class="rounded bg-rose-500/10 text-rose-400 px-1.5 py-0.5 text-[10px] border border-rose-500/20 font-semibold">
												{item.errors} Error
											</span>
										{:else if item.warnings > 0}
											<span class="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] border border-primary/20 font-semibold">
												{item.warnings} Warning
											</span>
										{:else}
											<span class="rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 text-[10px] border border-emerald-500/20 font-semibold">
												Sukses
											</span>
										{/if}
									</td>
									<td class="py-2.5 px-3 text-right">
										<button
											onclick={() => handleSitemapDelete(item.path)}
											class="p-1 rounded text-hint hover:text-rose-400 hover:bg-card-hover transition-colors cursor-pointer"
											title="Hapus Sitemap"
										>
											<Trash size={13} />
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
{/if}
</div>
