<script lang="ts">
	import BreakdownTable from '$lib/components/BreakdownTable.svelte';

	const referrers = [
		{ label: 'google.com', value: 8940, percentage: 100 },
		{ label: 'github.com', value: 4210, percentage: 47.1 },
		{ label: 'twitter.com / x.com', value: 3180, percentage: 35.6 },
		{ label: 'news.ycombinator.com', value: 2450, percentage: 27.4 },
		{ label: 'reddit.com', value: 1890, percentage: 21.1 },
		{ label: 'linkedin.com', value: 920, percentage: 10.3 },
		{ label: '(direct / bookmark)', value: 1240, percentage: 13.9 }
	];

	const utmCampaigns = [
		{ label: 'launch_producthunt_v2', value: 3820, percentage: 100 },
		{ label: 'spring_developer_newsletter', value: 2190, percentage: 57.3 },
		{ label: 'twitter_privacy_thread', value: 1450, percentage: 37.9 },
		{ label: 'oss_sponsorship_promo', value: 890, percentage: 23.3 }
	];

	const utmMediums = [
		{ label: 'organic', value: 9420, percentage: 100 },
		{ label: 'social', value: 5070, percentage: 53.8 },
		{ label: 'referral', value: 4320, percentage: 45.8 },
		{ label: 'email', value: 2190, percentage: 23.2 },
		{ label: 'cpc', value: 450, percentage: 4.8 }
	];
</script>

<svelte:head>
	<title>Acquisition Sources — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold tracking-tight text-white">Acquisition & Traffic Sources</h1>
		<p class="text-sm text-muted-light">Understand where your audience is discovering your site</p>
	</div>

	<!-- Breakdown Grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<BreakdownTable title="🔗 Referring Domains" items={referrers} />
		<BreakdownTable title="📣 UTM Mediums" items={utmMediums} />
	</div>

	<div class="grid grid-cols-1 gap-6">
		<BreakdownTable title="🎯 Active UTM Campaigns" items={utmCampaigns} />
	</div>
</div>
