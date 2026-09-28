import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	getAccessTokenFromServiceAccount,
	refreshOAuthToken,
	fetchFullSearchConsoleReport,
	fetchIndexationOverview,
	computeSeoOpportunities,
	listSitemaps
} from '$lib/server/search-console';

function escapeCsvField(val: string | number | null | undefined): string {
	if (val === null || val === undefined) return '""';
	const str = String(val);
	return `"${str.replace(/"/g, '""')}"`;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const siteId = url.searchParams.get('siteId');
	if (!siteId) {
		return new Response('siteId is required', { status: 400 });
	}

	const type = (url.searchParams.get('type') || 'queries') as 'queries' | 'pages' | 'indexation' | 'opportunities' | 'sitemaps';
	const searchType = (url.searchParams.get('searchType') || 'web') as 'web' | 'news' | 'discover';
	const from = url.searchParams.get('from') || '';
	const to = url.searchParams.get('to') || '';

	const site = await db.getSiteById(siteId);
	if (!site) {
		return new Response('Site not found', { status: 404 });
	}

	const connection = await db.getSearchConsoleConnection(site.id);
	const hasRealCreds = Boolean(connection && (connection.serviceAccountKey || connection.oauthAccessToken || connection.oauthRefreshToken));

	let csvContent = '';
	const timestamp = new Date().toISOString().split('T')[0];
	let filename = `${site.domain}-gsc-${type}-${timestamp}.csv`;

	if (!hasRealCreds) {
		return new Response('Google Search Console belum terhubung untuk properti ini. Hubungkan kredensial di Settings > Integrations untuk mengekspor data live.', {
			status: 400,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	}
		// Live data export
		try {
			let accessToken = '';
			if (connection!.authType === 'service_account') {
				const key = JSON.parse(connection!.serviceAccountKey!);
				const tokenRes = await getAccessTokenFromServiceAccount(key);
				accessToken = tokenRes.token;
			} else {
				if (connection!.oauthAccessToken) {
					accessToken = connection!.oauthAccessToken;
				} else {
					const refreshed = await refreshOAuthToken(connection!.oauthRefreshToken!);
					accessToken = refreshed.accessToken;
				}
			}

			if (type === 'queries') {
				const rep = await fetchFullSearchConsoleReport(accessToken, connection!.propertyUrl, from, to, searchType);
				csvContent = 'Query,Clicks,Impressions,CTR (%),Position\n';
				for (const q of rep.topQueries) {
					csvContent += [escapeCsvField(q.query), q.clicks, q.impressions, q.ctr, q.position].join(',') + '\n';
				}
			} else if (type === 'pages') {
				const rep = await fetchFullSearchConsoleReport(accessToken, connection!.propertyUrl, from, to, searchType);
				csvContent = 'Page URL,Clicks,Impressions,CTR (%),Position,In Google News\n';
				for (const p of rep.topPages) {
					csvContent += [escapeCsvField(p.page), p.clicks, p.impressions, p.ctr, p.position, p.inGoogleNews ? 'Yes' : 'No'].join(',') + '\n';
				}
			} else if (type === 'indexation') {
				const rep = await fetchIndexationOverview(accessToken, connection!.propertyUrl, site.domain, from, to);
				csvContent = 'URL,Path,Indexed,In Google Search,In Google News,Search Clicks,Search Impressions,News Clicks,News Impressions,Last Crawled,Coverage Status\n';
				for (const u of rep.urls) {
					csvContent += [
						escapeCsvField(u.url),
						escapeCsvField(u.path),
						u.indexed ? 'Yes' : 'No',
						u.inGoogleSearch ? 'Yes' : 'No',
						u.inGoogleNews ? 'Yes' : 'No',
						u.searchClicks,
						u.searchImpressions,
						u.newsClicks,
						u.newsImpressions,
						escapeCsvField(u.lastCrawledAt),
						escapeCsvField(u.coverageStatus)
					].join(',') + '\n';
				}
			} else if (type === 'opportunities') {
				const rep = await computeSeoOpportunities(accessToken, connection!.propertyUrl, site.domain, from, to);
				csvContent = 'Opportunity Type,Query,Page,Position,CTR (%),Impressions,Clicks,Potential Click Gain / Missed Clicks\n';
				for (const s of rep.strikingDistance) {
					csvContent += ['Striking Distance (#4-#20)', escapeCsvField(s.query), escapeCsvField(s.page), s.position, s.ctr, s.impressions, s.clicks, s.potentialClicksGain].join(',') + '\n';
				}
				for (const l of rep.lowCtrOpportunities) {
					csvContent += ['Low CTR (#1-#5)', escapeCsvField(l.query), escapeCsvField(l.page), l.position, l.ctr, l.impressions, l.clicks, l.missedClicks].join(',') + '\n';
				}
			} else if (type === 'sitemaps') {
				const sitemaps = await listSitemaps(accessToken, connection!.propertyUrl);
				csvContent = 'Sitemap URL,Last Submitted,Last Downloaded,Submitted URLs,Indexed URLs,Warnings,Errors\n';
				for (const s of sitemaps) {
					const submitted = s.contents.reduce((a, b) => a + b.submitted, 0);
					const indexed = s.contents.reduce((a, b) => a + b.indexed, 0);
					csvContent += [escapeCsvField(s.path), escapeCsvField(s.lastSubmitted), escapeCsvField(s.lastDownloaded), submitted, indexed, s.warnings, s.errors].join(',') + '\n';
				}
			}
		} catch (err: any) {
			console.error('[GSC Export Error]', err);
			return new Response(`Export failed: ${err.message}`, { status: 500 });
		}

	return new Response(csvContent, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
