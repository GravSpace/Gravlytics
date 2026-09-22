// Reactive site store using Svelte 5 runes

export interface SiteInfo {
	id: string;
	domain: string;
	name: string;
	trackingId: string;
	timezone?: string;
}

class SiteStore {
	activeSiteId = $state<string>('');
	sites = $state<SiteInfo[]>([]);

	activeSite = $derived(
		this.sites.find((s) => s.trackingId === this.activeSiteId || s.id === this.activeSiteId) ||
			this.sites[0] || {
				id: '',
				domain: '',
				name: 'No Site Selected',
				trackingId: ''
			}
	);

	get currentSite() {
		return this.activeSite;
	}

	setSite(siteId: string) {
		this.activeSiteId = siteId;
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem('gravlytics_active_site', siteId);
			} catch {}
		}
	}

	setSites(sites: SiteInfo[]) {
		if (Array.isArray(sites)) {
			this.sites = sites;
			if (sites.length > 0) {
				const saved = typeof window !== 'undefined' ? localStorage.getItem('gravlytics_active_site') : null;
				if (saved && sites.some((s) => s.trackingId === saved || s.id === saved)) {
					this.activeSiteId = saved;
				} else {
					this.activeSiteId = sites[0].trackingId || sites[0].id;
				}
			} else {
				this.activeSiteId = '';
			}
		}
	}

	async loadSites() {
		if (typeof window === 'undefined') return;
		try {
			const res = await fetch('/api/sites');
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					this.setSites(data);
				}
			}
		} catch {
			// keep current
		}
	}
}

export const siteStore = new SiteStore();
