import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchTimeSeries, fetchBreakdown, fetchOverview } from '$lib/api';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const siteId = url.searchParams.get('siteId');
	if (!siteId) {
		return json({ error: 'siteId is required' }, { status: 400 });
	}

	const format = (url.searchParams.get('format') || 'csv').toLowerCase();
	const from = url.searchParams.get('from') || undefined;
	const to = url.searchParams.get('to') || undefined;
	const range = url.searchParams.get('range') || '30d';

	try {
		const [overview, timeseries, pages, sources, countries, devices, campaigns] = await Promise.all([
			fetchOverview(siteId, from, to),
			fetchTimeSeries(siteId, from, to),
			fetchBreakdown(siteId, 'url_path', from, to, 50),
			fetchBreakdown(siteId, 'referrer_domain', from, to, 50),
			fetchBreakdown(siteId, 'country', from, to, 50),
			fetchBreakdown(siteId, 'device_type', from, to, 20),
			fetchBreakdown(siteId, 'utm_campaign', from, to, 30)
		]);

		const exportPayload = {
			siteId,
			exportedAt: new Date().toISOString(),
			range: `${from || ''} to ${to || ''}`.trim() || range,
			overview,
			timeseries,
			pages: pages.map((p) => ({ path: p.label, pageviews: p.value })),
			sources: sources.map((s) => ({ referrer: s.label, visitors: s.value })),
			countries: countries.map((c) => ({ country: c.label, visitors: c.value })),
			devices: devices.map((d) => ({ device: d.label, visitors: d.value })),
			campaigns: campaigns.map((cp) => ({ campaign: cp.label, visitors: cp.value }))
		};

		if (format === 'json') {
			const jsonStr = JSON.stringify(exportPayload, null, 2);
			return new Response(jsonStr, {
				headers: {
					'Content-Type': 'application/json',
					'Content-Disposition': `attachment; filename="gravlytics-${siteId}-${from || range}.json"`
				}
			});
		}

		if (format === 'xlsx' || format === 'excel') {
			// Generate Microsoft Excel 2003 XML Spreadsheet (opens natively in Excel, Numbers & Google Sheets)
			const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#1E1B4B" ss:Bold="1"/>
  </Style>
  <Style ss:ID="NumberStyle">
   <Alignment ss:Horizontal="Right"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
 </Styles>

 <!-- Overview Sheet -->
 <Worksheet ss:Name="Overview Summary">
  <Table>
   <Column ss:Width="180"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">Gravlytics Performance Report</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Site Tracking ID</Data></Cell>
    <Cell><Data ss:Type="String">${siteId}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Date Range</Data></Cell>
    <Cell><Data ss:Type="String">${from || ''} - ${to || ''}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Export Generated At</Data></Cell>
    <Cell><Data ss:Type="String">${new Date().toISOString()}</Data></Cell>
   </Row>
   <Row></Row>
   <Row>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Metric</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Value</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Unique Visitors</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${overview.visitors}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Pageviews</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${overview.pageviews}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Sessions</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${overview.sessions}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Bounce Rate (%)</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${overview.bounceRate.toFixed(1)}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Avg. Duration (Seconds)</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${overview.avgDurationSec}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- Daily Traffic Sheet -->
 <Worksheet ss:Name="Daily Traffic">
  <Table>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Pageviews</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Visitors</Data></Cell>
   </Row>
   ${timeseries
			.map(
				(pt) => `<Row>
    <Cell><Data ss:Type="String">${pt.label || pt.date || ''}</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${pt.pageviews}</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${pt.visitors}</Data></Cell>
   </Row>`
			)
			.join('\n   ')}
  </Table>
 </Worksheet>

 <!-- Top Pages Sheet -->
 <Worksheet ss:Name="Top Pages">
  <Table>
   <Column ss:Width="260"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">URL Path</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Pageviews</Data></Cell>
   </Row>
   ${pages
			.map(
				(p) => `<Row>
    <Cell><Data ss:Type="String">${p.label || '/'}</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${p.value}</Data></Cell>
   </Row>`
			)
			.join('\n   ')}
  </Table>
 </Worksheet>

 <!-- Sources Sheet -->
 <Worksheet ss:Name="Referral Sources">
  <Table>
   <Column ss:Width="220"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Source Domain</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Visitors</Data></Cell>
   </Row>
   ${sources
			.map(
				(s) => `<Row>
    <Cell><Data ss:Type="String">${s.label || 'Direct / None'}</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${s.value}</Data></Cell>
   </Row>`
			)
			.join('\n   ')}
  </Table>
 </Worksheet>

 <!-- Countries Sheet -->
 <Worksheet ss:Name="Countries">
  <Table>
   <Column ss:Width="180"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Country</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Visitors</Data></Cell>
   </Row>
   ${countries
			.map(
				(c) => `<Row>
    <Cell><Data ss:Type="String">${c.label || 'Unknown'}</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${c.value}</Data></Cell>
   </Row>`
			)
			.join('\n   ')}
  </Table>
 </Worksheet>

 <!-- Campaigns Sheet -->
 <Worksheet ss:Name="UTM Campaigns">
  <Table>
   <Column ss:Width="200"/>
   <Column ss:Width="120"/>
   <Row>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Campaign</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Visitors</Data></Cell>
   </Row>
   ${campaigns
			.map(
				(cp) => `<Row>
    <Cell><Data ss:Type="String">${cp.label || 'None'}</Data></Cell>
    <Cell ss:StyleID="NumberStyle"><Data ss:Type="Number">${cp.value}</Data></Cell>
   </Row>`
			)
			.join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;

			return new Response(xml, {
				headers: {
					'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
					'Content-Disposition': `attachment; filename="gravlytics-${siteId}-${from || range}.xls"`
				}
			});
		}

		// CSV formatting with UTF-8 BOM
		let csv = `\uFEFF`;
		csv += `# Gravlytics Analytics Report\n`;
		csv += `# Site ID: ${siteId}\n`;
		csv += `# Date Range: ${from || ''} to ${to || ''}\n`;
		csv += `# Exported: ${new Date().toISOString()}\n\n`;

		csv += `## Overview Summary\n`;
		csv += `Metric,Value\n`;
		csv += `Unique Visitors,${overview.visitors}\n`;
		csv += `Total Pageviews,${overview.pageviews}\n`;
		csv += `Total Sessions,${overview.sessions}\n`;
		csv += `Bounce Rate,${overview.bounceRate.toFixed(1)}%\n`;
		csv += `Avg. Duration (Seconds),${overview.avgDurationSec}s\n\n`;

		csv += `## Daily Timeseries\n`;
		csv += `Date,Pageviews,Visitors\n`;
		for (const pt of timeseries) {
			csv += `"${pt.label || pt.date || ''}",${pt.pageviews},${pt.visitors}\n`;
		}
		csv += `\n`;

		csv += `## Top Visited Pages\n`;
		csv += `Path,Pageviews\n`;
		for (const p of pages) {
			csv += `"${(p.label || '/').replace(/"/g, '""')}",${p.value}\n`;
		}
		csv += `\n`;

		csv += `## Referral Sources\n`;
		csv += `Source,Visitors\n`;
		for (const s of sources) {
			csv += `"${(s.label || 'Direct').replace(/"/g, '""')}",${s.value}\n`;
		}
		csv += `\n`;

		csv += `## Geographic Distribution\n`;
		csv += `Country,Visitors\n`;
		for (const c of countries) {
			csv += `"${(c.label || 'Unknown').replace(/"/g, '""')}",${c.value}\n`;
		}
		csv += `\n`;

		csv += `## UTM Campaigns\n`;
		csv += `Campaign,Visitors\n`;
		for (const cp of campaigns) {
			csv += `"${(cp.label || 'None').replace(/"/g, '""')}",${cp.value}\n`;
		}

		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="gravlytics-${siteId}-${from || range}.csv"`
			}
		});
	} catch (err: any) {
		console.error('Export error:', err);
		return json({ error: err.message || 'Export generation failed' }, { status: 500 });
	}
};
