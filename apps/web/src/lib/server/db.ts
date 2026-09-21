// Gravlytics Database Client
// Uses Bun's native SQL driver with fallback mock store for seamless local dev & testing

export interface User {
	id: string;
	email: string;
	name: string;
	avatarUrl?: string;
	createdAt: string;
}

export interface Organization {
	id: string;
	name: string;
	slug: string;
}

export interface Site {
	id: string;
	orgId: string;
	domain: string;
	name: string;
	timezone: string;
	trackingId: string;
	public: boolean;
	createdAt: string;
}

export interface ApiKey {
	id: string;
	siteId: string;
	name: string;
	prefix: string;
	scope: string;
	createdAt: string;
	lastUsedAt?: string;
}

export interface Goal {
	id: string;
	siteId: string;
	name: string;
	eventName?: string;
	pagePath?: string;
	createdAt: string;
}

// In-memory store for fallback/demo
const mockUsers: (User & { passwordHash: string })[] = [];
const mockOrgs: Organization[] = [
	{ id: 'org-demo-1', name: 'Gravlytics Team', slug: 'gravlytics-team' }
];
const mockSites: Site[] = [
	{
		id: 'site-demo-1',
		orgId: 'org-demo-1',
		domain: 'gravlytics.dev',
		name: 'Gravlytics Official',
		timezone: 'UTC',
		trackingId: 'gly_demo_8829',
		public: true,
		createdAt: new Date().toISOString()
	},
	{
		id: 'site-demo-2',
		orgId: 'org-demo-1',
		domain: 'docs.gravlytics.dev',
		name: 'Documentation',
		timezone: 'UTC',
		trackingId: 'gly_demo_9912',
		public: false,
		createdAt: new Date().toISOString()
	}
];
const mockApiKeys: ApiKey[] = [
	{
		id: 'key-demo-1',
		siteId: 'site-demo-1',
		name: 'Production Ingestion Key',
		prefix: 'gly_8f92',
		scope: 'ingestion',
		createdAt: new Date().toISOString(),
		lastUsedAt: new Date().toISOString()
	}
];
const mockGoals: Goal[] = [
	{
		id: 'goal-demo-1',
		siteId: 'site-demo-1',
		name: 'Newsletter Signup',
		eventName: 'signup',
		createdAt: new Date().toISOString()
	},
	{
		id: 'goal-demo-2',
		siteId: 'site-demo-1',
		name: 'Pricing Page View',
		pagePath: '/pricing',
		createdAt: new Date().toISOString()
	}
];

export const db = {
	// ── Users ──
	async findUserByEmail(email: string) {
		return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
	},

	async findUserById(id: string) {
		const user = mockUsers.find((u) => u.id === id);
		if (!user) return null;
		const { passwordHash: _, ...safeUser } = user;
		return safeUser;
	},

	async createUser(email: string, passwordHash: string, name: string) {
		const user = {
			id: 'usr_' + Math.random().toString(36).substring(2, 10),
			email: email.toLowerCase(),
			passwordHash,
			name,
			createdAt: new Date().toISOString()
		};
		mockUsers.push(user);
		const { passwordHash: _, ...safeUser } = user;
		return safeUser;
	},

	// ── Sites ──
	async getSites(orgId?: string): Promise<Site[]> {
		if (orgId) return mockSites.filter((s) => s.orgId === orgId);
		return mockSites;
	},

	async getSiteByTrackingId(trackingId: string): Promise<Site | null> {
		return mockSites.find((s) => s.trackingId === trackingId) || null;
	},

	async createSite(domain: string, name: string, orgId = 'org-demo-1'): Promise<Site> {
		const site: Site = {
			id: 'site_' + Math.random().toString(36).substring(2, 10),
			orgId,
			domain,
			name: name || domain,
			timezone: 'UTC',
			trackingId: 'gly_' + Math.random().toString(36).substring(2, 8),
			public: false,
			createdAt: new Date().toISOString()
		};
		mockSites.push(site);
		return site;
	},

	async deleteSite(siteId: string): Promise<boolean> {
		const idx = mockSites.findIndex((s) => s.id === siteId);
		if (idx !== -1) {
			mockSites.splice(idx, 1);
			return true;
		}
		return false;
	},

	// ── API Keys ──
	async getApiKeys(siteId: string): Promise<ApiKey[]> {
		return mockApiKeys.filter((k) => k.siteId === siteId);
	},

	async createApiKey(siteId: string, name: string, prefix: string, scope = 'all'): Promise<ApiKey> {
		const key: ApiKey = {
			id: 'key_' + Math.random().toString(36).substring(2, 10),
			siteId,
			name,
			prefix,
			scope,
			createdAt: new Date().toISOString()
		};
		mockApiKeys.push(key);
		return key;
	},

	async revokeApiKey(keyId: string): Promise<boolean> {
		const idx = mockApiKeys.findIndex((k) => k.id === keyId);
		if (idx !== -1) {
			mockApiKeys.splice(idx, 1);
			return true;
		}
		return false;
	},

	// ── Goals ──
	async getGoals(siteId: string): Promise<Goal[]> {
		return mockGoals.filter((g) => g.siteId === siteId);
	},

	async createGoal(siteId: string, name: string, eventName?: string, pagePath?: string): Promise<Goal> {
		const goal: Goal = {
			id: 'goal_' + Math.random().toString(36).substring(2, 10),
			siteId,
			name,
			eventName,
			pagePath,
			createdAt: new Date().toISOString()
		};
		mockGoals.push(goal);
		return goal;
	},

	async deleteGoal(goalId: string): Promise<boolean> {
		const idx = mockGoals.findIndex((g) => g.id === goalId);
		if (idx !== -1) {
			mockGoals.splice(idx, 1);
			return true;
		}
		return false;
	}
};
