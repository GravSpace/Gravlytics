// Gravlytics Customizable Dashboard Widgets Store
// Manages widget visibility, ordering, and localStorage persistence

export interface DashboardWidget {
	id: string;
	title: string;
	description: string;
	enabled: boolean;
	iconName: string;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
	{
		id: 'kpi_cards',
		title: 'Overview KPI Metrics',
		description: 'Unique visitors, pageviews, bounce rate, and average visit duration',
		enabled: true,
		iconName: 'Users'
	},
	{
		id: 'traffic_chart',
		title: 'Traffic Activity Chart',
		description: 'Daily / hourly pageview and visitor activity graph with annotations',
		enabled: true,
		iconName: 'BarChart3'
	},
	{
		id: 'top_pages',
		title: 'Top Visited Pages',
		description: 'Highest performing page URLs and visitor counts',
		enabled: true,
		iconName: 'FileText'
	},
	{
		id: 'top_sources',
		title: 'Traffic Acquisition Sources',
		description: 'Top referring domains and inbound traffic sources',
		enabled: true,
		iconName: 'Compass'
	},
	{
		id: 'geo_distribution',
		title: 'Geographic Distribution',
		description: 'Breakdown of visitors by country, region, or city',
		enabled: true,
		iconName: 'Globe'
	},
	{
		id: 'device_breakdown',
		title: 'Device & Screen Breakdown',
		description: 'Distribution of mobile, desktop, and tablet users',
		enabled: true,
		iconName: 'MonitorSmartphone'
	},
	{
		id: 'campaign_summary',
		title: 'UTM Campaign Performance',
		description: 'Inbound marketing campaign traffic and UTM attribution',
		enabled: true,
		iconName: 'Megaphone'
	}
];

class WidgetStore {
	widgets = $state<DashboardWidget[]>(JSON.parse(JSON.stringify(DEFAULT_WIDGETS)));
	isCustomizing = $state(false);

	init(siteId?: string) {
		if (typeof window === 'undefined') return;
		try {
			const key = siteId ? `gravlytics_widgets_${siteId}` : 'gravlytics_widgets_default';
			const saved = localStorage.getItem(key);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) {
					// Merge saved state with any newly added widgets in defaults
					const merged = parsed.map((w: any) => {
						const def = DEFAULT_WIDGETS.find((d) => d.id === w.id);
						return def ? { ...def, enabled: w.enabled } : w;
					});
					for (const def of DEFAULT_WIDGETS) {
						if (!merged.some((m) => m.id === def.id)) {
							merged.push({ ...def });
						}
					}
					this.widgets = merged;
					return;
				}
			}
		} catch {}
		this.widgets = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
	}

	save(siteId?: string) {
		if (typeof window === 'undefined') return;
		try {
			const key = siteId ? `gravlytics_widgets_${siteId}` : 'gravlytics_widgets_default';
			localStorage.setItem(key, JSON.stringify(this.widgets));
		} catch {}
	}

	toggleWidget(id: string, siteId?: string) {
		const widget = this.widgets.find((w) => w.id === id);
		if (widget) {
			widget.enabled = !widget.enabled;
			this.save(siteId);
		}
	}

	moveWidget(index: number, direction: 'up' | 'down', siteId?: string) {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= this.widgets.length) return;
		const temp = this.widgets[index];
		this.widgets[index] = this.widgets[targetIndex];
		this.widgets[targetIndex] = temp;
		this.save(siteId);
	}

	resetDefaults(siteId?: string) {
		this.widgets = JSON.parse(JSON.stringify(DEFAULT_WIDGETS));
		this.save(siteId);
	}

	isEnabled(id: string): boolean {
		const w = this.widgets.find((item) => item.id === id);
		return w ? w.enabled : true;
	}
}

export const widgetStore = new WidgetStore();
