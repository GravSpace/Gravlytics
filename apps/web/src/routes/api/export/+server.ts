import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { fetchTimeSeries, fetchBreakdown, fetchOverview } from '$lib/api';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const siteId = url.searchParams.get('siteId');
	if (!siteId) {
		return json({ error: 'siteId is required' }, { status: 400 });
	}

	const format = url.searchParams.get('format') || 'csv';
	const range = url.searchParams.get('range') || '30d';
	const dataset = url.searchParams.get('dataset') || 'all';

	try {
		const [overview, timeseries, pages, sources, countries] = await Promise.all([
			fetchOverview(siteId, range),
			fetchTimeSeries(siteId, range),
			fetchBreakdown(siteId, 'url_path', range, undefined, 50),
			fetchBreakdown(siteId, 'referrer', range, undefined, 50),
			fetchBreakdown(siteId, 'country', range, undefined, 50)
		]);

		const exportPayload = {
			siteId,
			exportedAt: new Date().toISOString(),
			range,
			overview,
			timeseries,
			pages: pages.map((p) => ({ path: p.label, pageviews: p.value })),
			sources: sources.map((s) => ({ referrer: s.label, visitors: s.value })),
			countries: countries.map((c) => ({ country: c.label, visitors: c.value }))
		};

		if (format === 'json') {
			const jsonStr = JSON.stringify(exportPayload, null, 2);
			return new Response(jsonStr, {
				headers: {
					'Content-Type': 'application/json',
					'Content-Disposition': `attachment; filename="gravlytics-${siteId}-${range}.json"`
				}
			});
		}

		// CSV formatting
		let csv = `sep=,\n`;
		csv += `# Gravlytics Telemetry Export\n`;
		csv += `# Site: ${siteId}\n`;
		csv += `# Date Range: ${range}\n`;
		csv += `# Exported At: ${new Date().toISOString()}\n\n`;

		csv += `## Overview Summary\n`;
		csv += `Metric,Value\n`;
		csv += `Unique Visitors,${overview.visitors}\n`;
		csv += `Total Pageviews,${overview.pageviews}\n`;
		csv += `Total Sessions,${overview.sessions}\n`;
		csv += `Bounce Rate,${overview.bounceRate}%\n`;
		csv += `Avg Duration Seconds,${overview.avgDurationSec}s\n\n`;

		csv += `## Daily Timeseries\n`;
		csv += `Date,Visitors,Pageviews\n`;
		for (const pt of timeseries) {
			csv += `"${pt.label || pt.timestamp}",${pt.visitors},${pt.pageviews}\n`;
		}
		csv += `\n`;

		csv += `## Top Pages\n`;
		csv += `Path,Pageviews\n`;
		for (const p of pages) {
			csv += `"${p.label}",${p.value}\n`;
		}
		csv += `\n`;

		csv += `## Top Sources\n`;
		csv += `Referrer Source,Visitors\n`;
		for (const s of sources) {
			csv += `"${s.label}",${s.value}\n`;
		}
		csv += `\n`;

		csv += `## Geographic Distribution\n`;
		csv += `Country,Visitors\n`;
		for (const c of countries) {
			csv += `"${c.label}",${c.value}\n`;
		}

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="gravlytics-${siteId}-${range}.csv"`
			}
		});
	} catch (err: any) {
		console.error('Export error:', err);
		return json({ error: err.message || 'Export generation failed' }, { status: 500 });
	}
};
