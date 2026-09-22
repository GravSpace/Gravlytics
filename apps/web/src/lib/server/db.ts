// Gravlytics Database Client
// Uses Bun's native SQL driver with fallback persistent store for seamless local dev & testing

export interface User {
	id: string;
	email: string;
	name: string;
	avatarUrl?: string;
	createdAt: string;
	role?: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
}

export interface Organization {
	id: string;
	name: string;
	slug: string;
}

export interface OrganizationMember {
	id: string;
	orgId: string;
	userId: string;
	role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
	joinedAt: string;
}

export interface Invitation {
	id: string;
	orgId: string;
	inviterId: string;
	email: string;
	role: 'Admin' | 'Editor' | 'Viewer';
	token: string;
	status: 'pending' | 'accepted' | 'cancelled';
	createdAt: string;
	expiresAt: string;
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

import fs from 'node:fs';
import path from 'node:path';
import { hashPassword, verifyPassword } from './crypto';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');

function initUsers(): (User & { passwordHash: string })[] {
	try {
		if (fs.existsSync(USERS_FILE)) {
			const content = fs.readFileSync(USERS_FILE, 'utf-8');
			const parsed = JSON.parse(content);
			if (Array.isArray(parsed) && parsed.length > 0) {
				return parsed;
			}
		}
	} catch {}

	const defaultAdmin = {
		id: 'usr_admin_default',
		email: 'admin@gravlytics.dev',
		name: 'Admin Gravlytics',
		passwordHash: hashPassword('password123'),
		createdAt: '2026-01-15T00:00:00.000Z'
	};
	const defaultDemo = {
		id: 'usr_demo_default',
		email: 'demo@gravlytics.com',
		name: 'Demo Analyst',
		passwordHash: hashPassword('password123'),
		createdAt: '2026-02-01T00:00:00.000Z'
	};
	const initial = [defaultAdmin, defaultDemo];
	saveUsers(initial);
	return initial;
}

function saveUsers(users: (User & { passwordHash: string })[]) {
	try {
		if (!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true });
		}
		fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
	} catch {}
}

interface WorkspaceStore {
	orgs: Organization[];
	members: OrganizationMember[];
	sites: Site[];
	apiKeys: ApiKey[];
	invitations: Invitation[];
}

function initWorkspace(): WorkspaceStore {
	try {
		if (fs.existsSync(WORKSPACE_FILE)) {
			const content = fs.readFileSync(WORKSPACE_FILE, 'utf-8');
			const parsed = JSON.parse(content);
			if (parsed && Array.isArray(parsed.orgs) && Array.isArray(parsed.sites)) {
				return parsed;
			}
		}
	} catch {}

	const defaultStore: WorkspaceStore = {
		orgs: [
			{ id: 'org-admin-1', name: 'Gravlytics Official Team', slug: 'gravlytics-official' },
			{ id: 'org-demo-1', name: 'Demo Workspace', slug: 'demo-workspace' }
		],
		members: [
			{
				id: 'mem-admin-1',
				orgId: 'org-admin-1',
				userId: 'usr_admin_default',
				role: 'Owner',
				joinedAt: '2026-01-15'
			},
			{
				id: 'mem-demo-1',
				orgId: 'org-demo-1',
				userId: 'usr_demo_default',
				role: 'Owner',
				joinedAt: '2026-02-01'
			}
		],
		sites: [
			{
				id: 'site-demo-1',
				orgId: 'org-admin-1',
				domain: 'gravlytics.dev',
				name: 'Gravlytics Official',
				timezone: 'UTC',
				trackingId: 'gly_demo_8829',
				public: true,
				createdAt: '2026-01-15T00:00:00.000Z'
			},
			{
				id: 'site-demo-2',
				orgId: 'org-admin-1',
				domain: 'docs.gravlytics.dev',
				name: 'Documentation',
				timezone: 'UTC',
				trackingId: 'gly_demo_9912',
				public: false,
				createdAt: '2026-01-20T00:00:00.000Z'
			},
			{
				id: 'site-demo-3',
				orgId: 'org-demo-1',
				domain: 'my-store.example.com',
				name: 'My Demo Store',
				timezone: 'UTC',
				trackingId: 'gly_demo_4412',
				public: true,
				createdAt: '2026-02-01T00:00:00.000Z'
			}
		],
		apiKeys: [
			{
				id: 'key-demo-1',
				siteId: 'site-demo-1',
				name: 'Production Ingestion Key',
				prefix: 'gly_demo',
				scope: 'all',
				createdAt: new Date().toISOString(),
				lastUsedAt: new Date().toISOString()
			}
		],
		invitations: []
	};

	saveWorkspace(defaultStore);
	return defaultStore;
}

function saveWorkspace(store: WorkspaceStore) {
	try {
		if (!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true });
		}
		fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(store, null, 2), 'utf-8');
	} catch {}
}

const mockUsers: (User & { passwordHash: string })[] = initUsers();
const workspace: WorkspaceStore = initWorkspace();
const mockOrgs: Organization[] = workspace.orgs;
const mockMembers: OrganizationMember[] = workspace.members;
const mockSites: Site[] = workspace.sites;
const mockApiKeys: ApiKey[] = workspace.apiKeys;
const mockInvitations: Invitation[] = workspace.invitations;
const mockGoals: Goal[] = [];

// Helper functions for role mapping and UUID validation
function formatRole(role: string | null | undefined): 'Owner' | 'Admin' | 'Editor' | 'Viewer' {
	if (!role) return 'Viewer';
	const lower = role.toLowerCase();
	if (lower === 'owner') return 'Owner';
	if (lower === 'admin') return 'Admin';
	if (lower === 'editor') return 'Editor';
	return 'Viewer';
}

function formatInviteRole(role: string | null | undefined): 'Admin' | 'Editor' | 'Viewer' {
	if (!role) return 'Viewer';
	const lower = role.toLowerCase();
	if (lower === 'admin') return 'Admin';
	if (lower === 'editor') return 'Editor';
	return 'Viewer';
}

function toPgRole(role: string | null | undefined): 'owner' | 'admin' | 'editor' | 'viewer' {
	if (!role) return 'viewer';
	const lower = role.toLowerCase();
	if (lower === 'owner') return 'owner';
	if (lower === 'admin') return 'admin';
	if (lower === 'editor') return 'editor';
	return 'viewer';
}

function isUuid(val: string | null | undefined): boolean {
	if (!val) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Initialize Bun SQL instance if available at runtime
const dbUrl =
	process.env.DATABASE_URL ||
	`postgres://${process.env.POSTGRES_USER || 'gravlytics'}:${process.env.POSTGRES_PASSWORD || 'gravlytics_dev'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'gravlytics'}`;

const BunSQL = (globalThis as any).Bun?.SQL;
let sql: any = null;
if (BunSQL) {
	try {
		sql = new BunSQL(dbUrl);
		// Asynchronously verify table additions
		(async () => {
			try {
				await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';`;
			} catch {}
			try {
				await sql`
					CREATE TABLE IF NOT EXISTS invitations (
						id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
						org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
						inviter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
						email           VARCHAR(255) NOT NULL,
						role            user_role NOT NULL DEFAULT 'viewer',
						token           VARCHAR(255) NOT NULL UNIQUE,
						status          VARCHAR(50) NOT NULL DEFAULT 'pending',
						created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
						expires_at      TIMESTAMPTZ NOT NULL
					)
				`;
				await sql`CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id)`;
				await sql`CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)`;
			} catch {}
		})().catch(() => {});
	} catch {
		sql = null;
	}
}

export const db = {
	// ── Users ──
	async findUserByEmail(email: string) {
		if (sql) {
			try {
				const rows = await sql`
					SELECT id, email, password_hash as "passwordHash", name, avatar_url as "avatarUrl", created_at as "createdAt"
					FROM users
					WHERE LOWER(email) = LOWER(${email.trim()})
					LIMIT 1
				`;
				if (rows && rows.length > 0) return rows[0] as (User & { passwordHash: string });
			} catch (err) {
				console.error('[db:findUserByEmail] PostgreSQL error:', err);
			}
		}
		return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
	},

	async findUserById(id: string) {
		if (sql) {
			try {
				if (isUuid(id)) {
					const rows = await sql`
						SELECT u.id, u.email, u.name, u.avatar_url as "avatarUrl", u.created_at as "createdAt", m.role
						FROM users u
						LEFT JOIN memberships m ON m.user_id = u.id
						WHERE u.id = ${id}::uuid
						LIMIT 1
					`;
					if (rows && rows.length > 0) {
						const r = rows[0];
						return {
							id: r.id,
							email: r.email,
							name: r.name,
							avatarUrl: r.avatarUrl,
							createdAt: r.createdAt,
							role: formatRole(r.role)
						} as User;
					}
				}
			} catch (err) {
				console.error('[db:findUserById] PostgreSQL error:', err);
			}
		}
		const user = mockUsers.find((u) => u.id === id);
		if (!user) return null;
		const { passwordHash: _, ...safeUser } = user;
		const membership = mockMembers.find((m) => m.userId === safeUser.id);
		return { ...safeUser, role: membership ? membership.role : ('Owner' as const) };
	},

	async createUser(email: string, passwordHash: string, name: string) {
		if (sql) {
			try {
				const [user] = await sql`
					INSERT INTO users (email, password_hash, name)
					VALUES (${email.trim().toLowerCase()}, ${passwordHash}, ${name.trim()})
					RETURNING id, email, name, avatar_url as "avatarUrl", created_at as "createdAt"
				`;

				const slug = 'org-' + user.id.substring(0, 8);
				const [org] = await sql`
					INSERT INTO organizations (name, slug)
					VALUES (${`${name}'s Workspace`}, ${slug})
					RETURNING id, name, slug
				`;

				await sql`
					INSERT INTO memberships (user_id, org_id, role)
					VALUES (${user.id}::uuid, ${org.id}::uuid, 'owner'::user_role)
				`;

				const trackingId = 'gly_' + Math.random().toString(36).substring(2, 8);
				await sql`
					INSERT INTO sites (org_id, domain, name, timezone, tracking_id, public)
					VALUES (${org.id}::uuid, 'my-website.com', ${`${name}'s Site`}, 'UTC', ${trackingId}, true)
				`;

				return { ...user, role: 'Owner' } as User;
			} catch (err) {
				console.error('[db:createUser] PostgreSQL error, falling back to local store:', err);
			}
		}

		const user = {
			id: 'usr_' + Math.random().toString(36).substring(2, 10),
			email: email.toLowerCase(),
			passwordHash,
			name,
			createdAt: new Date().toISOString()
		};
		mockUsers.push(user);
		saveUsers(mockUsers);

		const orgId = 'org_' + user.id.substring(4);
		const org: Organization = {
			id: orgId,
			name: `${name}'s Workspace`,
			slug: 'org-' + user.id.substring(4)
		};
		mockOrgs.push(org);

		mockMembers.push({
			id: 'mem_' + Math.random().toString(36).substring(2, 8),
			orgId,
			userId: user.id,
			role: 'Owner',
			joinedAt: new Date().toISOString().split('T')[0]
		});

		const initialSite: Site = {
			id: 'site_' + Math.random().toString(36).substring(2, 10),
			orgId,
			domain: 'my-website.com',
			name: `${name}'s Site`,
			timezone: 'UTC',
			trackingId: 'gly_' + Math.random().toString(36).substring(2, 8),
			public: true,
			createdAt: new Date().toISOString()
		};
		mockSites.push(initialSite);
		saveWorkspace(workspace);

		const { passwordHash: _, ...safeUser } = user;
		return safeUser;
	},

	async updateUserProfile(userId: string, name: string, email: string): Promise<User | null> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const rows = await sql`
						UPDATE users
						SET name = ${name.trim()}, email = ${email.trim().toLowerCase()}
						WHERE id = ${userId}::uuid
						RETURNING id, email, name, avatar_url as "avatarUrl", created_at as "createdAt"
					`;
					if (rows && rows.length > 0) return rows[0] as User;
				}
			} catch (err) {
				console.error('[db:updateUserProfile] PostgreSQL error:', err);
			}
		}

		const user = mockUsers.find((u) => u.id === userId);
		if (!user) return null;

		user.name = name.trim();
		user.email = email.trim().toLowerCase();
		saveUsers(mockUsers);

		const { passwordHash: _, ...safeUser } = user;
		return safeUser;
	},

	async updateUserPassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const [user] = await sql`
						SELECT id, password_hash as "passwordHash"
						FROM users
						WHERE id = ${userId}::uuid
						LIMIT 1
					`;
					if (!user) return { success: false, error: 'User not found' };

					if (!verifyPassword(oldPassword, user.passwordHash)) {
						return { success: false, error: 'Current password is incorrect' };
					}

					await sql`
						UPDATE users
						SET password_hash = ${hashPassword(newPassword)}
						WHERE id = ${userId}::uuid
					`;
					return { success: true };
				}
			} catch (err) {
				console.error('[db:updateUserPassword] PostgreSQL error:', err);
			}
		}

		const user = mockUsers.find((u) => u.id === userId);
		if (!user) return { success: false, error: 'User not found' };

		if (!verifyPassword(oldPassword, user.passwordHash)) {
			return { success: false, error: 'Current password is incorrect' };
		}

		user.passwordHash = hashPassword(newPassword);
		saveUsers(mockUsers);
		return { success: true };
	},

	// ── Multi-Tenant Organizations & Memberships ──

	async getUserOrganizations(userId: string): Promise<Organization[]> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const orgs = await sql`
						SELECT o.id, o.name, o.slug
						FROM organizations o
						JOIN memberships m ON m.org_id = o.id
						WHERE m.user_id = ${userId}::uuid
						ORDER BY m.created_at ASC
					`;
					if (orgs && orgs.length > 0) return orgs as Organization[];

					const [user] = await sql`SELECT id, name FROM users WHERE id = ${userId}::uuid LIMIT 1`;
					if (user) {
						const slug = 'org-' + user.id.substring(0, 8);
						const [newOrg] = await sql`
							INSERT INTO organizations (name, slug)
							VALUES (${`${user.name}'s Workspace`}, ${slug})
							RETURNING id, name, slug
						`;
						await sql`
							INSERT INTO memberships (user_id, org_id, role)
							VALUES (${user.id}::uuid, ${newOrg.id}::uuid, 'owner'::user_role)
						`;
						return [newOrg] as Organization[];
					}
				}
			} catch (err) {
				console.error('[db:getUserOrganizations] PostgreSQL error:', err);
			}
		}

		let userMemberships = mockMembers.filter((m) => m.userId === userId);
		if (userMemberships.length === 0) {
			const user = mockUsers.find((u) => u.id === userId);
			const name = user ? user.name : 'Personal';
			const orgId = 'org_' + userId.substring(4);
			const newOrg: Organization = {
				id: orgId,
				name: `${name}'s Workspace`,
				slug: 'org-' + userId.substring(4)
			};
			mockOrgs.push(newOrg);
			mockMembers.push({
				id: 'mem_' + Math.random().toString(36).substring(2, 8),
				orgId,
				userId,
				role: 'Owner',
				joinedAt: new Date().toISOString().split('T')[0]
			});
			saveWorkspace(workspace);
			userMemberships = [mockMembers[mockMembers.length - 1]];
		}

		const orgIds = new Set(userMemberships.map((m) => m.orgId));
		return mockOrgs.filter((o) => orgIds.has(o.id));
	},

	async getOrganizationForUser(userId: string): Promise<{ organization: Organization; role: 'Owner' | 'Admin' | 'Editor' | 'Viewer' } | null> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const rows = await sql`
						SELECT o.id, o.name, o.slug, m.role
						FROM organizations o
						JOIN memberships m ON m.org_id = o.id
						WHERE m.user_id = ${userId}::uuid
						ORDER BY m.created_at ASC
						LIMIT 1
					`;
					if (rows && rows.length > 0) {
						const r = rows[0];
						return {
							organization: { id: r.id, name: r.name, slug: r.slug },
							role: formatRole(r.role)
						};
					}
				}
			} catch (err) {
				console.error('[db:getOrganizationForUser] PostgreSQL error:', err);
			}
		}

		const orgs = await this.getUserOrganizations(userId);
		const org = orgs[0];
		if (!org) return null;

		const membership = mockMembers.find((m) => m.orgId === org.id && m.userId === userId);
		return {
			organization: org,
			role: membership ? membership.role : 'Owner'
		};
	},

	async updateOrganizationForUser(userId: string, orgId: string, name: string, slug: string): Promise<Organization | null> {
		if (sql) {
			try {
				if (isUuid(orgId) && isUuid(userId)) {
					const [m] = await sql`
						SELECT role FROM memberships
						WHERE org_id = ${orgId}::uuid AND user_id = ${userId}::uuid
						LIMIT 1
					`;
					if (!m || (m.role !== 'owner' && m.role !== 'admin')) {
						throw new Error('Insufficient permissions to update organization settings');
					}

					const cleanSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : undefined;
					let updated;
					if (cleanSlug) {
						[updated] = await sql`
							UPDATE organizations
							SET name = ${name.trim()}, slug = ${cleanSlug}
							WHERE id = ${orgId}::uuid
							RETURNING id, name, slug
						`;
					} else {
						[updated] = await sql`
							UPDATE organizations
							SET name = ${name.trim()}
							WHERE id = ${orgId}::uuid
							RETURNING id, name, slug
						`;
					}
					if (updated) return updated as Organization;
				}
			} catch (err: any) {
				if (err.message?.includes('Insufficient permissions')) throw err;
				console.error('[db:updateOrganizationForUser] PostgreSQL error:', err);
			}
		}

		const org = mockOrgs.find((o) => o.id === orgId);
		if (!org) return null;

		const membership = mockMembers.find((m) => m.orgId === orgId && m.userId === userId);
		if (!membership || (membership.role !== 'Owner' && membership.role !== 'Admin')) {
			throw new Error('Insufficient permissions to update organization settings');
		}

		org.name = name.trim();
		if (slug) {
			org.slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
		}
		saveWorkspace(workspace);
		return org;
	},

	async getUserSites(userId: string): Promise<Site[]> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const sites = await sql`
						SELECT s.id, s.org_id as "orgId", s.domain, s.name, s.timezone, s.tracking_id as "trackingId", s.public, s.created_at as "createdAt"
						FROM sites s
						JOIN organizations o ON o.id = s.org_id
						JOIN memberships m ON m.org_id = o.id
						WHERE m.user_id = ${userId}::uuid
						ORDER BY s.created_at DESC
					`;
					if (sites) return sites as Site[];
				}
			} catch (err) {
				console.error('[db:getUserSites] PostgreSQL error:', err);
			}
		}

		const orgs = await this.getUserOrganizations(userId);
		const orgIds = new Set(orgs.map((o) => o.id));
		return mockSites.filter((s) => orgIds.has(s.orgId));
	},

	async createSiteForUser(userId: string, domain: string, name: string): Promise<Site> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const orgs = await this.getUserOrganizations(userId);
					const primaryOrg = orgs[0];
					if (!primaryOrg) throw new Error('Organization not found');

					const trackingId = 'gly_' + Math.random().toString(36).substring(2, 8);
					const [site] = await sql`
						INSERT INTO sites (org_id, domain, name, timezone, tracking_id, public)
						VALUES (${primaryOrg.id}::uuid, ${domain.trim()}, ${name.trim() || domain.trim()}, 'UTC', ${trackingId}, false)
						RETURNING id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
					`;
					if (site) return site as Site;
				}
			} catch (err) {
				console.error('[db:createSiteForUser] PostgreSQL error:', err);
			}
		}

		const orgs = await this.getUserOrganizations(userId);
		const primaryOrg = orgs[0];
		const trackingId = 'gly_' + Math.random().toString(36).substring(2, 8);

		const site: Site = {
			id: 'site_' + Math.random().toString(36).substring(2, 10),
			orgId: primaryOrg.id,
			domain,
			name: name || domain,
			timezone: 'UTC',
			trackingId,
			public: false,
			createdAt: new Date().toISOString()
		};

		mockSites.push(site);
		saveWorkspace(workspace);
		return site;
	},

	async deleteSiteForUser(userId: string, siteId: string): Promise<boolean> {
		if (sql) {
			try {
				if (isUuid(userId) && isUuid(siteId)) {
					const res = await sql`
						DELETE FROM sites s
						USING memberships m
						WHERE s.id = ${siteId}::uuid
						  AND s.org_id = m.org_id
						  AND m.user_id = ${userId}::uuid
						RETURNING s.id
					`;
					if (res && res.length > 0) return true;
				}
			} catch (err) {
				console.error('[db:deleteSiteForUser] PostgreSQL error:', err);
			}
		}

		const userSites = await this.getUserSites(userId);
		const allowed = userSites.some((s) => s.id === siteId);
		if (!allowed) return false;

		const idx = mockSites.findIndex((s) => s.id === siteId);
		if (idx !== -1) {
			mockSites.splice(idx, 1);
			saveWorkspace(workspace);
			return true;
		}
		return false;
	},

	// ── Team Members & Invitations ──

	async getOrgMembers(orgId: string): Promise<(OrganizationMember & { name: string; email: string })[]> {
		if (sql) {
			try {
				if (isUuid(orgId)) {
					const members = await sql`
						SELECT m.id, m.org_id as "orgId", m.user_id as "userId", m.role, m.created_at as "joinedAt", u.name, u.email
						FROM memberships m
						JOIN users u ON u.id = m.user_id
						WHERE m.org_id = ${orgId}::uuid
						ORDER BY m.created_at ASC
					`;
					if (members) {
						return members.map((m: any) => ({
							id: m.id,
							orgId: m.orgId,
							userId: m.userId,
							role: formatRole(m.role),
							joinedAt: m.joinedAt,
							name: m.name,
							email: m.email
						}));
					}
				}
			} catch (err) {
				console.error('[db:getOrgMembers] PostgreSQL error:', err);
			}
		}

		const members = mockMembers.filter((m) => m.orgId === orgId);
		return members.map((m) => {
			const u = mockUsers.find((user) => user.id === m.userId);
			return {
				...m,
				name: u ? u.name : 'Unknown User',
				email: u ? u.email : 'unknown@example.com'
			};
		});
	},

	async createOrgInvitation(
		orgId: string,
		inviterId: string,
		email: string,
		role: 'Admin' | 'Editor' | 'Viewer' = 'Viewer'
	): Promise<Invitation> {
		const token = 'inv_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
		const pgRole = toPgRole(role);

		if (sql) {
			try {
				if (isUuid(orgId) && isUuid(inviterId)) {
					await sql`
						DELETE FROM invitations
						WHERE org_id = ${orgId}::uuid AND LOWER(email) = LOWER(${email.trim()}) AND status = 'pending'
					`;

					const [inv] = await sql`
						INSERT INTO invitations (org_id, inviter_id, email, role, token, status, expires_at)
						VALUES (${orgId}::uuid, ${inviterId}::uuid, ${email.trim().toLowerCase()}, ${pgRole}::user_role, ${token}, 'pending', ${expiresAt}::timestamptz)
						RETURNING id, org_id as "orgId", inviter_id as "inviterId", email, role, token, status, created_at as "createdAt", expires_at as "expiresAt"
					`;
					if (inv) {
						return {
							...inv,
							role: formatInviteRole(inv.role)
						};
					}
				}
			} catch (err) {
				console.error('[db:createOrgInvitation] PostgreSQL error:', err);
			}
		}

		const existingIdx = mockInvitations.findIndex((inv) => inv.orgId === orgId && inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending');
		if (existingIdx !== -1) {
			mockInvitations.splice(existingIdx, 1);
		}

		const invitation: Invitation = {
			id: 'inv_' + Math.random().toString(36).substring(2, 10),
			orgId,
			inviterId,
			email: email.trim().toLowerCase(),
			role,
			token,
			status: 'pending',
			createdAt: new Date().toISOString(),
			expiresAt
		};

		mockInvitations.push(invitation);
		saveWorkspace(workspace);
		return invitation;
	},

	async getOrgInvitations(orgId: string): Promise<Invitation[]> {
		if (sql) {
			try {
				if (isUuid(orgId)) {
					const invs = await sql`
						SELECT id, org_id as "orgId", inviter_id as "inviterId", email, role, token, status, created_at as "createdAt", expires_at as "expiresAt"
						FROM invitations
						WHERE org_id = ${orgId}::uuid AND status = 'pending'
						ORDER BY created_at DESC
					`;
					if (invs) {
						return invs.map((i: any) => ({
							...i,
							role: formatInviteRole(i.role)
						}));
					}
				}
			} catch (err) {
				console.error('[db:getOrgInvitations] PostgreSQL error:', err);
			}
		}

		return mockInvitations.filter((inv) => inv.orgId === orgId && inv.status === 'pending');
	},

	async cancelOrgInvitation(orgId: string, inviteId: string): Promise<boolean> {
		if (sql) {
			try {
				if (isUuid(inviteId)) {
					const res = await sql`
						DELETE FROM invitations
						WHERE id = ${inviteId}::uuid
						RETURNING id
					`;
					if (res && res.length > 0) return true;
				}
			} catch (err) {
				console.error('[db:cancelOrgInvitation] PostgreSQL error:', err);
			}
		}

		const idx = mockInvitations.findIndex((inv) => inv.id === inviteId && inv.orgId === orgId);
		if (idx !== -1) {
			mockInvitations[idx].status = 'cancelled';
			mockInvitations.splice(idx, 1);
			saveWorkspace(workspace);
			return true;
		}
		return false;
	},

	async removeOrgMember(orgId: string, memberIdOrUserId: string): Promise<boolean> {
		if (sql) {
			try {
				if (isUuid(orgId) && isUuid(memberIdOrUserId)) {
					const [m] = await sql`
						SELECT role FROM memberships
						WHERE (id = ${memberIdOrUserId}::uuid OR user_id = ${memberIdOrUserId}::uuid) AND org_id = ${orgId}::uuid
						LIMIT 1
					`;
					if (m && m.role === 'owner') return false;

					const res = await sql`
						DELETE FROM memberships
						WHERE (id = ${memberIdOrUserId}::uuid OR user_id = ${memberIdOrUserId}::uuid) AND org_id = ${orgId}::uuid
						RETURNING id
					`;
					if (res && res.length > 0) return true;
				}
			} catch (err) {
				console.error('[db:removeOrgMember] PostgreSQL error:', err);
			}
		}

		const idx = mockMembers.findIndex((m) => (m.id === memberIdOrUserId || m.userId === memberIdOrUserId) && m.orgId === orgId);
		if (idx !== -1) {
			if (mockMembers[idx].role === 'Owner') {
				return false;
			}
			mockMembers.splice(idx, 1);
			saveWorkspace(workspace);
			return true;
		}
		return false;
	},

	async getInvitationByToken(token: string): Promise<(Invitation & { orgName: string; inviterName: string }) | null> {
		if (sql) {
			try {
				const rows = await sql`
					SELECT i.id, i.org_id as "orgId", i.inviter_id as "inviterId", i.email, i.role, i.token, i.status, i.created_at as "createdAt", i.expires_at as "expiresAt",
					       o.name as "orgName", u.name as "inviterName"
					FROM invitations i
					JOIN organizations o ON o.id = i.org_id
					JOIN users u ON u.id = i.inviter_id
					WHERE i.token = ${token} AND i.status = 'pending'
					LIMIT 1
				`;
				if (rows && rows.length > 0) {
					const r = rows[0];
					return {
						id: r.id,
						orgId: r.orgId,
						inviterId: r.inviterId,
						email: r.email,
						role: formatInviteRole(r.role),
						token: r.token,
						status: r.status,
						createdAt: r.createdAt,
						expiresAt: r.expiresAt,
						orgName: r.orgName,
						inviterName: r.inviterName
					};
				}
			} catch (err) {
				console.error('[db:getInvitationByToken] PostgreSQL error:', err);
			}
		}

		const invite = mockInvitations.find((i) => i.token === token && i.status === 'pending');
		if (!invite) return null;

		const org = mockOrgs.find((o) => o.id === invite.orgId);
		const inviter = mockUsers.find((u) => u.id === invite.inviterId);

		return {
			...invite,
			orgName: org ? org.name : 'Gravlytics Workspace',
			inviterName: inviter ? inviter.name : 'Team Administrator'
		};
	},

	async acceptInvitation(token: string, userId: string): Promise<{ success: boolean; orgId?: string; error?: string }> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const [invite] = await sql`
						SELECT id, org_id as "orgId", role, expires_at as "expiresAt", status
						FROM invitations
						WHERE token = ${token} AND status = 'pending'
						LIMIT 1
					`;
					if (!invite) {
						return { success: false, error: 'Invitation link is invalid or has already been used.' };
					}

					if (new Date(invite.expiresAt) < new Date()) {
						return { success: false, error: 'This invitation has expired.' };
					}

					await sql`
						INSERT INTO memberships (org_id, user_id, role)
						VALUES (${invite.orgId}::uuid, ${userId}::uuid, ${invite.role}::user_role)
						ON CONFLICT (user_id, org_id) DO NOTHING
					`;

					await sql`
						UPDATE invitations
						SET status = 'accepted'
						WHERE id = ${invite.id}::uuid
					`;

					return { success: true, orgId: invite.orgId };
				}
			} catch (err: any) {
				console.error('[db:acceptInvitation] PostgreSQL error:', err);
			}
		}

		const invite = mockInvitations.find((i) => i.token === token && i.status === 'pending');
		if (!invite) {
			return { success: false, error: 'Invitation link is invalid or has already been used.' };
		}

		if (new Date(invite.expiresAt) < new Date()) {
			return { success: false, error: 'This invitation has expired.' };
		}

		const alreadyMember = mockMembers.some((m) => m.orgId === invite.orgId && m.userId === userId);
		if (!alreadyMember) {
			mockMembers.push({
				id: 'mem_' + Math.random().toString(36).substring(2, 8),
				orgId: invite.orgId,
				userId,
				role: invite.role,
				joinedAt: new Date().toISOString().split('T')[0]
			});
		}

		invite.status = 'accepted';
		saveWorkspace(workspace);
		return { success: true, orgId: invite.orgId };
	},

	// ── Sites (General) ──

	async getSites(orgId?: string): Promise<Site[]> {
		if (sql) {
			try {
				if (orgId && isUuid(orgId)) {
					const sites = await sql`
						SELECT id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
						FROM sites
						WHERE org_id = ${orgId}::uuid
						ORDER BY created_at DESC
					`;
					if (sites) return sites as Site[];
				} else {
					const sites = await sql`
						SELECT id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
						FROM sites
						ORDER BY created_at DESC
					`;
					if (sites) return sites as Site[];
				}
			} catch (err) {
				console.error('[db:getSites] PostgreSQL error:', err);
			}
		}

		if (orgId) return mockSites.filter((s) => s.orgId === orgId);
		return mockSites;
	},

	async getSiteByTrackingId(trackingId: string): Promise<Site | null> {
		if (sql) {
			try {
				const rows = await sql`
					SELECT id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
					FROM sites
					WHERE tracking_id = ${trackingId}
					LIMIT 1
				`;
				if (rows && rows.length > 0) return rows[0] as Site;
			} catch (err) {
				console.error('[db:getSiteByTrackingId] PostgreSQL error:', err);
			}
		}

		return mockSites.find((s) => s.trackingId === trackingId) || null;
	},

	async getSiteById(siteId: string): Promise<Site | null> {
		if (sql) {
			try {
				const isSiteUuid = isUuid(siteId);
				const rows = isSiteUuid
					? await sql`
						SELECT id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
						FROM sites
						WHERE id = ${siteId}::uuid OR tracking_id = ${siteId}
						LIMIT 1
					`
					: await sql`
						SELECT id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
						FROM sites
						WHERE tracking_id = ${siteId}
						LIMIT 1
					`;
				if (rows && rows.length > 0) return rows[0] as Site;
			} catch (err) {
				console.error('[db:getSiteById] PostgreSQL error:', err);
			}
		}

		return mockSites.find((s) => s.id === siteId || s.trackingId === siteId) || null;
	},

	async createSite(domain: string, name: string, orgId?: string): Promise<Site> {
		const trackingId = 'gly_' + Math.random().toString(36).substring(2, 8);

		if (sql) {
			try {
				let targetOrgId = orgId;
				if (!targetOrgId || !isUuid(targetOrgId)) {
					const [firstOrg] = await sql`SELECT id FROM organizations LIMIT 1`;
					if (firstOrg) targetOrgId = firstOrg.id;
				}

				if (targetOrgId) {
					const [site] = await sql`
						INSERT INTO sites (org_id, domain, name, timezone, tracking_id, public)
						VALUES (${targetOrgId}::uuid, ${domain.trim()}, ${name.trim() || domain.trim()}, 'UTC', ${trackingId}, false)
						RETURNING id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
					`;
					if (site) return site as Site;
				}
			} catch (err) {
				console.error('[db:createSite] PostgreSQL error:', err);
			}
		}

		const site: Site = {
			id: 'site_' + Math.random().toString(36).substring(2, 10),
			orgId: orgId || 'org-admin-1',
			domain,
			name: name || domain,
			timezone: 'UTC',
			trackingId,
			public: false,
			createdAt: new Date().toISOString()
		};
		mockSites.push(site);
		saveWorkspace(workspace);
		return site;
	},

	async deleteSite(siteId: string): Promise<boolean> {
		if (sql) {
			try {
				if (isUuid(siteId)) {
					const res = await sql`
						DELETE FROM sites
						WHERE id = ${siteId}::uuid
						RETURNING id
					`;
					if (res && res.length > 0) return true;
				}
			} catch (err) {
				console.error('[db:deleteSite] PostgreSQL error:', err);
			}
		}

		const idx = mockSites.findIndex((s) => s.id === siteId);
		if (idx !== -1) {
			mockSites.splice(idx, 1);
			saveWorkspace(workspace);
			return true;
		}
		return false;
	},

	// ── API Keys ──

	async getApiKeys(siteId: string): Promise<ApiKey[]> {
		if (sql) {
			try {
				if (isUuid(siteId)) {
					const keys = await sql`
						SELECT id, site_id as "siteId", name, key_prefix as "prefix", scope, created_at as "createdAt", last_used_at as "lastUsedAt"
						FROM api_keys
						WHERE site_id = ${siteId}::uuid
						ORDER BY created_at DESC
					`;
					if (keys) return keys as ApiKey[];
				}
			} catch (err) {
				console.error('[db:getApiKeys] PostgreSQL error:', err);
			}
		}

		return mockApiKeys.filter((k) => k.siteId === siteId);
	},

	async createApiKey(siteId: string, name: string, prefix: string, scope = 'all'): Promise<ApiKey> {
		if (sql) {
			try {
				if (isUuid(siteId)) {
					const pgScope = (scope || 'all').toLowerCase();
					const [key] = await sql`
						INSERT INTO api_keys (site_id, name, key_hash, key_prefix, scope)
						VALUES (${siteId}::uuid, ${name.trim()}, ${prefix}, ${prefix}, ${pgScope}::api_key_scope)
						RETURNING id, site_id as "siteId", name, key_prefix as "prefix", scope, created_at as "createdAt", last_used_at as "lastUsedAt"
					`;
					if (key) return key as ApiKey;
				}
			} catch (err) {
				console.error('[db:createApiKey] PostgreSQL error:', err);
			}
		}

		const key: ApiKey = {
			id: 'key_' + Math.random().toString(36).substring(2, 10),
			siteId,
			name,
			prefix,
			scope,
			createdAt: new Date().toISOString()
		};
		mockApiKeys.push(key);
		saveWorkspace(workspace);
		return key;
	},

	async revokeApiKey(keyId: string): Promise<boolean> {
		if (sql) {
			try {
				if (isUuid(keyId)) {
					const res = await sql`
						DELETE FROM api_keys
						WHERE id = ${keyId}::uuid
						RETURNING id
					`;
					if (res && res.length > 0) return true;
				}
			} catch (err) {
				console.error('[db:revokeApiKey] PostgreSQL error:', err);
			}
		}

		const idx = mockApiKeys.findIndex((k) => k.id === keyId);
		if (idx !== -1) {
			mockApiKeys.splice(idx, 1);
			saveWorkspace(workspace);
			return true;
		}
		return false;
	},

	async getApiKeysForUser(userId: string): Promise<(ApiKey & { siteDomain?: string; siteName?: string })[]> {
		if (sql) {
			try {
				if (isUuid(userId)) {
					const keys = await sql`
						SELECT k.id, k.site_id as "siteId", k.name, k.key_prefix as "prefix", k.scope, k.created_at as "createdAt", k.last_used_at as "lastUsedAt",
						       s.domain as "siteDomain", s.name as "siteName"
						FROM api_keys k
						JOIN sites s ON s.id = k.site_id
						JOIN memberships m ON m.org_id = s.org_id
						WHERE m.user_id = ${userId}::uuid
						ORDER BY k.created_at DESC
					`;
					if (keys) return keys as any;
				}
			} catch (err) {
				console.error('[db:getApiKeysForUser] PostgreSQL error:', err);
			}
		}

		const userSites = await this.getUserSites(userId);
		const siteIds = new Set(userSites.map((s) => s.id));
		const siteTrackingIds = new Set(userSites.map((s) => s.trackingId));

		const keys = mockApiKeys.filter((k) => siteIds.has(k.siteId) || siteTrackingIds.has(k.siteId));
		return keys.map((k) => {
			const site = userSites.find((s) => s.id === k.siteId || s.trackingId === k.siteId);
			return {
				...k,
				siteDomain: site ? site.domain : undefined,
				siteName: site ? site.name : undefined
			};
		});
	},

	async createApiKeyForUser(
		userId: string,
		name: string,
		scope = 'all',
		siteId?: string
	): Promise<{ apiKey: ApiKey & { siteDomain?: string; siteName?: string }; rawKey: string }> {
		const userSites = await this.getUserSites(userId);
		if (userSites.length === 0) {
			throw new Error('No sites found. Please add a site before generating an API key.');
		}

		let targetSite = userSites[0];
		if (siteId) {
			const matched = userSites.find((s) => s.id === siteId || s.trackingId === siteId);
			if (matched) targetSite = matched;
		}

		const prefix = 'gly_' + Math.random().toString(36).substring(2, 6);
		const secret = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
		const rawKey = `${prefix}_${secret}`;
		const pgScope = (scope || 'all').toLowerCase();

		if (sql) {
			try {
				if (isUuid(userId) && isUuid(targetSite.id)) {
					const [key] = await sql`
						INSERT INTO api_keys (site_id, name, key_hash, key_prefix, scope)
						VALUES (${targetSite.id}::uuid, ${name.trim() || 'API Key'}, ${rawKey}, ${prefix}, ${pgScope}::api_key_scope)
						RETURNING id, site_id as "siteId", name, key_prefix as "prefix", scope, created_at as "createdAt", last_used_at as "lastUsedAt"
					`;
					if (key) {
						return {
							apiKey: {
								...key,
								siteDomain: targetSite.domain,
								siteName: targetSite.name
							},
							rawKey
						};
					}
				}
			} catch (err) {
				console.error('[db:createApiKeyForUser] PostgreSQL error, falling back:', err);
			}
		}

		const key: ApiKey = {
			id: 'key_' + Math.random().toString(36).substring(2, 10),
			siteId: targetSite.id,
			name: name.trim() || 'API Key',
			prefix,
			scope,
			createdAt: new Date().toISOString(),
			lastUsedAt: undefined
		};

		mockApiKeys.push(key);
		saveWorkspace(workspace);

		return {
			apiKey: {
				...key,
				siteDomain: targetSite.domain,
				siteName: targetSite.name
			},
			rawKey
		};
	},

	async revokeApiKeyForUser(userId: string, keyId: string): Promise<boolean> {
		if (sql) {
			try {
				if (isUuid(userId) && isUuid(keyId)) {
					const res = await sql`
						DELETE FROM api_keys k
						USING sites s, memberships m
						WHERE k.id = ${keyId}::uuid
						  AND k.site_id = s.id
						  AND s.org_id = m.org_id
						  AND m.user_id = ${userId}::uuid
						RETURNING k.id
					`;
					if (res && res.length > 0) return true;
				}
			} catch (err) {
				console.error('[db:revokeApiKeyForUser] PostgreSQL error:', err);
			}
		}

		const userSites = await this.getUserSites(userId);
		const siteIds = new Set(userSites.map((s) => s.id));
		const siteTrackingIds = new Set(userSites.map((s) => s.trackingId));

		const idx = mockApiKeys.findIndex((k) => k.id === keyId && (siteIds.has(k.siteId) || siteTrackingIds.has(k.siteId)));
		if (idx !== -1) {
			mockApiKeys.splice(idx, 1);
			saveWorkspace(workspace);
			return true;
		}
		return false;
	},

	async validateApiKey(rawKey: string): Promise<{ apiKey: ApiKey; site: Site } | null> {
		if (!rawKey) return null;
		const cleanKey = rawKey.trim().replace(/^Bearer\s+/i, '');
		if (!cleanKey) return null;

		if (sql) {
			try {
				const prefixPart = cleanKey.length >= 8 ? cleanKey.substring(0, 8) : cleanKey;
				const rows = await sql`
					SELECT k.id, k.site_id as "siteId", k.name, k.key_prefix as "prefix", k.scope, k.created_at as "createdAt", k.last_used_at as "lastUsedAt",
					       s.id as "s_id", s.org_id as "s_orgId", s.domain as "s_domain", s.name as "s_name", s.timezone as "s_timezone", s.tracking_id as "s_trackingId", s.public as "s_public", s.created_at as "s_createdAt"
					FROM api_keys k
					JOIN sites s ON s.id = k.site_id
					WHERE (k.key_prefix = ${prefixPart} OR ${cleanKey} LIKE k.key_prefix || '%' OR k.key_hash = ${cleanKey})
					LIMIT 1
				`;
				if (rows && rows.length > 0) {
					const r = rows[0];
					sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${r.id}::uuid`.catch(() => {});
					return {
						apiKey: {
							id: r.id,
							siteId: r.siteId,
							name: r.name,
							prefix: r.prefix,
							scope: r.scope,
							createdAt: r.createdAt,
							lastUsedAt: r.lastUsedAt
						},
						site: {
							id: r.s_id,
							orgId: r.s_orgId,
							domain: r.s_domain,
							name: r.s_name,
							timezone: r.s_timezone,
							trackingId: r.s_trackingId,
							public: r.s_public,
							createdAt: r.s_createdAt
						}
					};
				}

				// Fallback: check if cleanKey matches site trackingId
				const siteRows = await sql`
					SELECT id, org_id as "orgId", domain, name, timezone, tracking_id as "trackingId", public, created_at as "createdAt"
					FROM sites
					WHERE tracking_id = ${cleanKey}
					LIMIT 1
				`;
				if (siteRows && siteRows.length > 0) {
					const s = siteRows[0] as Site;
					return {
						apiKey: {
							id: 'key-tracking-' + s.trackingId,
							siteId: s.id,
							name: 'Site Tracking Key',
							prefix: s.trackingId,
							scope: 'all',
							createdAt: new Date().toISOString()
						},
						site: s
					};
				}
			} catch (err) {
				console.error('[db:validateApiKey] PostgreSQL error:', err);
			}
		}

		const key = mockApiKeys.find(
			(k) => cleanKey === k.id || cleanKey.startsWith(k.prefix) || cleanKey === k.prefix
		);
		if (key) {
			const site = (await db.getSiteById(key.siteId)) || mockSites.find((s) => s.id === key.siteId);
			if (site) return { apiKey: key, site };
		}

		// Demo key or tracking ID fallback
		const demoSite = mockSites.find(
			(s) => s.trackingId === cleanKey || cleanKey.includes(s.trackingId) || cleanKey === 'demo-api-key' || cleanKey === 'gravlytics_demo_key'
		);
		if (demoSite) {
			return {
				apiKey: {
					id: 'key-demo-default',
					siteId: demoSite.id,
					name: 'Demo External Key',
					prefix: demoSite.trackingId,
					scope: 'all',
					createdAt: new Date().toISOString()
				},
				site: demoSite
			};
		}

		return null;
	},

	// ── Goals ──

	async getGoals(siteId: string): Promise<Goal[]> {
		const site = await db.getSiteByTrackingId(siteId);
		return mockGoals.filter((g) => g.siteId === siteId || (site && g.siteId === site.id) || (site && g.siteId === site.trackingId));
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
