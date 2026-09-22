// Gravlytics Database Client
// Powered by Drizzle ORM over PostgreSQL

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
	isPublic?: boolean;
	sharePasswordHash?: string | null;
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

import { hashPassword, verifyPassword } from './crypto';
import {
	drizzleDb,
	users,
	organizations,
	memberships,
	invitations,
	sites,
	apiKeys,
	goals,
	savedReports,
	alerts,
	auditLogs,
	siteAnnotations,
	eq,
	and,
	or,
	desc,
	asc,
	sql,
	pgClient
} from './drizzle';

export { drizzleDb, pgClient, sql, eq, and, or, desc, asc };
export * from './schema';

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

export const db = {
	// ── Users ──

	async findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
		const user = await drizzleDb.query.users.findFirst({
			where: eq(sql`LOWER(${users.email})`, email.trim().toLowerCase())
		});
		if (!user) return null;
		return {
			id: user.id,
			email: user.email,
			passwordHash: user.passwordHash || '',
			name: user.name,
			avatarUrl: user.avatarUrl || '',
			createdAt: user.createdAt.toISOString()
		};
	},

	async findUserById(id: string): Promise<User | null> {
		if (!isUuid(id)) return null;
		const user = await drizzleDb.query.users.findFirst({
			where: eq(users.id, id),
			with: {
				memberships: {
					limit: 1
				}
			}
		});
		if (!user) return null;
		const role = user.memberships?.[0]?.role;
		return {
			id: user.id,
			email: user.email,
			name: user.name,
			avatarUrl: user.avatarUrl || '',
			createdAt: user.createdAt.toISOString(),
			role: formatRole(role)
		};
	},

	async createUser(email: string, passwordHash: string, name: string): Promise<User> {
		return await drizzleDb.transaction(async (tx) => {
			const [user] = await tx
				.insert(users)
				.values({
					email: email.trim().toLowerCase(),
					passwordHash,
					name: name.trim()
				})
				.returning();

			const slug = 'org-' + user.id.substring(0, 8);
			const [org] = await tx
				.insert(organizations)
				.values({
					name: `${name.trim()}'s Workspace`,
					slug
				})
				.returning();

			await tx.insert(memberships).values({
				userId: user.id,
				orgId: org.id,
				role: 'owner'
			});

			return {
				id: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatarUrl || '',
				createdAt: user.createdAt.toISOString(),
				role: 'Owner'
			};
		});
	},

	async updateUserProfile(userId: string, name: string, email: string): Promise<User | null> {
		if (!isUuid(userId)) return null;
		const [updated] = await drizzleDb
			.update(users)
			.set({
				name: name.trim(),
				email: email.trim().toLowerCase()
			})
			.where(eq(users.id, userId))
			.returning();

		if (!updated) return null;
		return {
			id: updated.id,
			email: updated.email,
			name: updated.name,
			avatarUrl: updated.avatarUrl || '',
			createdAt: updated.createdAt.toISOString()
		};
	},

	async updateUserPassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
		if (!isUuid(userId)) return { success: false, error: 'User not found' };
		const user = await drizzleDb.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { passwordHash: true }
		});
		if (!user || !user.passwordHash) return { success: false, error: 'User not found' };

		const isValid = verifyPassword(oldPassword, user.passwordHash);
		if (!isValid) return { success: false, error: 'Current password is incorrect' };

		const newHash = hashPassword(newPassword);
		await drizzleDb.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
		return { success: true };
	},

	// ── Organizations & Memberships ──

	async getUserOrganizations(userId: string): Promise<Organization[]> {
		if (!isUuid(userId)) return [];
		const rows = await drizzleDb
			.select({
				id: organizations.id,
				name: organizations.name,
				slug: organizations.slug
			})
			.from(organizations)
			.innerJoin(memberships, eq(memberships.orgId, organizations.id))
			.where(eq(memberships.userId, userId))
			.orderBy(asc(organizations.createdAt));
		return rows;
	},

	async getUserOrgs(userId: string): Promise<Organization[]> {
		return await this.getUserOrganizations(userId);
	},

	async getOrganizationForUser(userId: string, orgId?: string): Promise<{ organization: Organization; role: 'Owner' | 'Admin' | 'Editor' | 'Viewer' } | null> {
		if (!isUuid(userId)) return null;
		const conditions = [eq(memberships.userId, userId)];
		if (orgId && isUuid(orgId)) {
			conditions.push(eq(organizations.id, orgId));
		}
		const rows = await drizzleDb
			.select({
				id: organizations.id,
				name: organizations.name,
				slug: organizations.slug,
				role: memberships.role
			})
			.from(organizations)
			.innerJoin(memberships, eq(memberships.orgId, organizations.id))
			.where(and(...conditions))
			.orderBy(asc(organizations.createdAt))
			.limit(1);

		if (rows.length === 0) return null;
		return {
			organization: {
				id: rows[0].id,
				name: rows[0].name,
				slug: rows[0].slug
			},
			role: formatRole(rows[0].role)
		};
	},

	async updateOrganizationForUser(userId: string, orgId: string, name: string, slug?: string): Promise<Organization | null> {
		if (!isUuid(userId) || !isUuid(orgId)) return null;
		const mem = await drizzleDb.query.memberships.findFirst({
			where: and(eq(memberships.userId, userId), eq(memberships.orgId, orgId))
		});
		if (!mem || !['owner', 'admin'].includes(mem.role)) {
			throw new Error('Unauthorized to update organization');
		}

		const updateData: { name: string; slug?: string } = { name: name.trim() };
		if (slug) updateData.slug = slug.trim();

		const [updated] = await drizzleDb
			.update(organizations)
			.set(updateData)
			.where(eq(organizations.id, orgId))
			.returning();
		return updated || null;
	},

	async getOrganizationMembers(orgId: string): Promise<(OrganizationMember & { name: string; email: string; avatarUrl?: string })[]> {
		if (!isUuid(orgId)) return [];
		const rows = await drizzleDb
			.select({
				id: memberships.id,
				orgId: memberships.orgId,
				userId: memberships.userId,
				role: memberships.role,
				joinedAt: memberships.createdAt,
				name: users.name,
				email: users.email,
				avatarUrl: users.avatarUrl
			})
			.from(memberships)
			.innerJoin(users, eq(users.id, memberships.userId))
			.where(eq(memberships.orgId, orgId))
			.orderBy(asc(memberships.createdAt));

		return rows.map((r) => ({
			id: r.id,
			orgId: r.orgId,
			userId: r.userId,
			role: formatRole(r.role),
			joinedAt: r.joinedAt.toISOString(),
			name: r.name,
			email: r.email,
			avatarUrl: r.avatarUrl || ''
		}));
	},

	async getOrgMembers(orgId: string): Promise<(OrganizationMember & { name: string; email: string })[]> {
		return this.getOrganizationMembers(orgId);
	},

	async removeOrgMember(orgId: string, memberIdOrUserId: string): Promise<boolean> {
		if (!isUuid(orgId) || !isUuid(memberIdOrUserId)) return false;
		const mem = await drizzleDb.query.memberships.findFirst({
			where: and(
				eq(memberships.orgId, orgId),
				or(eq(memberships.id, memberIdOrUserId), eq(memberships.userId, memberIdOrUserId))
			)
		});
		if (!mem) return false;
		if (mem.role === 'owner') {
			throw new Error('Cannot remove the workspace Owner');
		}
		const [deleted] = await drizzleDb
			.delete(memberships)
			.where(eq(memberships.id, mem.id))
			.returning({ id: memberships.id });
		return Boolean(deleted);
	},

	// ── Invitations ──

	async createOrgInvitation(orgId: string, inviterId: string, email: string, role: 'Admin' | 'Editor' | 'Viewer'): Promise<Invitation> {
		if (!isUuid(orgId) || !isUuid(inviterId)) throw new Error('Invalid UUID');
		const token = 'inv_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		const pgRole = toPgRole(role);

		await drizzleDb
			.delete(invitations)
			.where(
				and(
					eq(invitations.orgId, orgId),
					eq(sql`LOWER(${invitations.email})`, email.trim().toLowerCase()),
					eq(invitations.status, 'pending')
				)
			);

		const [inv] = await drizzleDb
			.insert(invitations)
			.values({
				orgId,
				inviterId,
				email: email.trim().toLowerCase(),
				role: pgRole,
				token,
				status: 'pending',
				expiresAt
			})
			.returning();

		return {
			id: inv.id,
			orgId: inv.orgId,
			inviterId: inv.inviterId,
			email: inv.email,
			role: formatInviteRole(inv.role),
			token: inv.token,
			status: inv.status as 'pending' | 'accepted' | 'cancelled',
			createdAt: inv.createdAt.toISOString(),
			expiresAt: inv.expiresAt.toISOString()
		};
	},

	async getOrgInvitations(orgId: string): Promise<Invitation[]> {
		if (!isUuid(orgId)) return [];
		const rows = await drizzleDb.query.invitations.findMany({
			where: and(eq(invitations.orgId, orgId), eq(invitations.status, 'pending')),
			orderBy: [desc(invitations.createdAt)]
		});
		return rows.map((inv) => ({
			id: inv.id,
			orgId: inv.orgId,
			inviterId: inv.inviterId,
			email: inv.email,
			role: formatInviteRole(inv.role),
			token: inv.token,
			status: inv.status as 'pending' | 'accepted' | 'cancelled',
			createdAt: inv.createdAt.toISOString(),
			expiresAt: inv.expiresAt.toISOString()
		}));
	},

	async cancelOrgInvitation(orgId: string, inviteId: string): Promise<boolean> {
		if (!isUuid(orgId) || !isUuid(inviteId)) return false;
		const [deleted] = await drizzleDb
			.delete(invitations)
			.where(and(eq(invitations.id, inviteId), eq(invitations.orgId, orgId)))
			.returning({ id: invitations.id });
		return Boolean(deleted);
	},

	async getInvitationByToken(token: string): Promise<{ invitation: Invitation; organization: Organization; inviterName: string } | null> {
		const rows = await drizzleDb
			.select({
				inv: invitations,
				orgName: organizations.name,
				orgSlug: organizations.slug,
				inviterName: users.name
			})
			.from(invitations)
			.innerJoin(organizations, eq(organizations.id, invitations.orgId))
			.innerJoin(users, eq(users.id, invitations.inviterId))
			.where(and(eq(invitations.token, token.trim()), eq(invitations.status, 'pending')))
			.limit(1);

		if (rows.length === 0) return null;
		const r = rows[0];
		return {
			invitation: {
				id: r.inv.id,
				orgId: r.inv.orgId,
				inviterId: r.inv.inviterId,
				email: r.inv.email,
				role: formatInviteRole(r.inv.role),
				token: r.inv.token,
				status: r.inv.status as 'pending' | 'accepted' | 'cancelled',
				createdAt: r.inv.createdAt.toISOString(),
				expiresAt: r.inv.expiresAt.toISOString()
			},
			organization: {
				id: r.inv.orgId,
				name: r.orgName,
				slug: r.orgSlug
			},
			inviterName: r.inviterName
		};
	},

	async acceptInvitation(token: string, userId: string): Promise<{ success: boolean; orgId?: string; error?: string }> {
		if (!isUuid(userId)) return { success: false, error: 'Invalid user ID' };
		const inviteData = await this.getInvitationByToken(token);
		if (!inviteData) return { success: false, error: 'Invitation not found or has expired' };

		const { invitation, organization } = inviteData;
		if (new Date(invitation.expiresAt).getTime() < Date.now()) {
			return { success: false, error: 'Invitation has expired' };
		}

		const existing = await drizzleDb.query.memberships.findFirst({
			where: and(eq(memberships.orgId, organization.id), eq(memberships.userId, userId))
		});

		if (existing) {
			await drizzleDb.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));
			return { success: true, orgId: organization.id };
		}

		await drizzleDb.insert(memberships).values({
			userId,
			orgId: organization.id,
			role: toPgRole(invitation.role)
		});
		await drizzleDb.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id));
		return { success: true, orgId: organization.id };
	},

	async acceptOrgInvitation(token: string, userId: string): Promise<{ success: boolean; error?: string }> {
		return this.acceptInvitation(token, userId);
	},

	// ── Sites ──

	async getUserSites(userId: string): Promise<Site[]> {
		if (!isUuid(userId)) return [];
		const rows = await drizzleDb
			.select({
				id: sites.id,
				orgId: sites.orgId,
				domain: sites.domain,
				name: sites.name,
				timezone: sites.timezone,
				trackingId: sites.trackingId,
				public: sites.public,
				sharePasswordHash: sites.sharePasswordHash,
				createdAt: sites.createdAt
			})
			.from(sites)
			.innerJoin(organizations, eq(organizations.id, sites.orgId))
			.innerJoin(memberships, eq(memberships.orgId, organizations.id))
			.where(eq(memberships.userId, userId))
			.orderBy(desc(sites.createdAt));

		return rows.map((s) => ({
			id: s.id,
			orgId: s.orgId,
			domain: s.domain,
			name: s.name,
			timezone: s.timezone,
			trackingId: s.trackingId,
			public: s.public,
			isPublic: s.public,
			sharePasswordHash: s.sharePasswordHash,
			createdAt: s.createdAt.toISOString()
		}));
	},

	async createSiteForUser(userId: string, domain: string, name: string): Promise<Site> {
		if (!isUuid(userId)) throw new Error('Invalid user ID');
		const orgs = await this.getUserOrganizations(userId);
		const primaryOrg = orgs[0];
		if (!primaryOrg) throw new Error('Organization not found');

		const trackingId = 'gly_' + Math.random().toString(36).substring(2, 8);
		const [site] = await drizzleDb
			.insert(sites)
			.values({
				orgId: primaryOrg.id,
				domain: domain.trim(),
				name: name.trim() || domain.trim(),
				timezone: 'UTC',
				trackingId,
				public: false
			})
			.returning();

		return {
			id: site.id,
			orgId: site.orgId,
			domain: site.domain,
			name: site.name,
			timezone: site.timezone,
			trackingId: site.trackingId,
			public: site.public,
			createdAt: site.createdAt.toISOString()
		};
	},

	async deleteSiteForUser(userId: string, siteId: string): Promise<boolean> {
		if (!isUuid(userId) || !isUuid(siteId)) return false;
		const site = await drizzleDb.query.sites.findFirst({
			where: eq(sites.id, siteId)
		});
		if (!site) return false;

		const isMember = await drizzleDb.query.memberships.findFirst({
			where: and(eq(memberships.orgId, site.orgId), eq(memberships.userId, userId))
		});
		if (!isMember) return false;

		const [deleted] = await drizzleDb
			.delete(sites)
			.where(eq(sites.id, siteId))
			.returning({ id: sites.id });
		return Boolean(deleted);
	},

	async getSites(orgId?: string): Promise<Site[]> {
		const query = orgId && isUuid(orgId)
			? drizzleDb.select().from(sites).where(eq(sites.orgId, orgId)).orderBy(desc(sites.createdAt))
			: drizzleDb.select().from(sites).orderBy(desc(sites.createdAt));
		const rows = await query;
		return rows.map((s) => ({
			id: s.id,
			orgId: s.orgId,
			domain: s.domain,
			name: s.name,
			timezone: s.timezone,
			trackingId: s.trackingId,
			public: s.public,
			createdAt: s.createdAt.toISOString()
		}));
	},

	async getSiteByTrackingId(trackingId: string): Promise<Site | null> {
		const site = await drizzleDb.query.sites.findFirst({
			where: eq(sites.trackingId, trackingId.trim())
		});
		if (!site) return null;
		return {
			id: site.id,
			orgId: site.orgId,
			domain: site.domain,
			name: site.name,
			timezone: site.timezone,
			trackingId: site.trackingId,
			public: site.public,
			createdAt: site.createdAt.toISOString()
		};
	},

	async getSiteById(siteId: string): Promise<Site | null> {
		if (!siteId) return null;
		if (isUuid(siteId)) {
			const site = await drizzleDb.query.sites.findFirst({
				where: eq(sites.id, siteId)
			});
			if (site) {
				return {
					id: site.id,
					orgId: site.orgId,
					domain: site.domain,
					name: site.name,
					timezone: site.timezone,
					trackingId: site.trackingId,
					public: site.public,
					createdAt: site.createdAt.toISOString()
				};
			}
		}
		return this.getSiteByTrackingId(siteId);
	},

	async createSite(domain: string, name: string, orgId?: string): Promise<Site> {
		const trackingId = 'gly_' + Math.random().toString(36).substring(2, 8);
		let targetOrgId = orgId;
		if (!targetOrgId || !isUuid(targetOrgId)) {
			const firstOrg = await drizzleDb.query.organizations.findFirst();
			if (!firstOrg) throw new Error('No organization exists');
			targetOrgId = firstOrg.id;
		}

		const [site] = await drizzleDb
			.insert(sites)
			.values({
				orgId: targetOrgId,
				domain: domain.trim(),
				name: name.trim() || domain.trim(),
				timezone: 'UTC',
				trackingId,
				public: false
			})
			.returning();

		return {
			id: site.id,
			orgId: site.orgId,
			domain: site.domain,
			name: site.name,
			timezone: site.timezone,
			trackingId: site.trackingId,
			public: site.public,
			createdAt: site.createdAt.toISOString()
		};
	},

	async deleteSite(siteId: string): Promise<boolean> {
		if (!isUuid(siteId)) return false;
		const [deleted] = await drizzleDb
			.delete(sites)
			.where(eq(sites.id, siteId))
			.returning({ id: sites.id });
		return Boolean(deleted);
	},

	// ── API Keys ──

	async getApiKeys(siteId: string): Promise<ApiKey[]> {
		if (!isUuid(siteId)) return [];
		const rows = await drizzleDb.query.apiKeys.findMany({
			where: eq(apiKeys.siteId, siteId),
			orderBy: [desc(apiKeys.createdAt)]
		});
		return rows.map((k) => ({
			id: k.id,
			siteId: k.siteId,
			name: k.name,
			prefix: k.keyPrefix,
			scope: k.scope,
			createdAt: k.createdAt.toISOString(),
			lastUsedAt: k.lastUsedAt?.toISOString()
		}));
	},

	async createApiKey(siteId: string, name: string, prefix: string, scope = 'all'): Promise<ApiKey> {
		if (!isUuid(siteId)) throw new Error('Invalid site ID');
		const pgScope = (scope || 'all').toLowerCase() as 'ingestion' | 'query' | 'all';
		const [key] = await drizzleDb
			.insert(apiKeys)
			.values({
				siteId,
				name: name.trim(),
				keyHash: prefix,
				keyPrefix: prefix,
				scope: pgScope
			})
			.returning();
		return {
			id: key.id,
			siteId: key.siteId,
			name: key.name,
			prefix: key.keyPrefix,
			scope: key.scope,
			createdAt: key.createdAt.toISOString(),
			lastUsedAt: key.lastUsedAt?.toISOString()
		};
	},

	async revokeApiKey(keyId: string): Promise<boolean> {
		if (!isUuid(keyId)) return false;
		const [deleted] = await drizzleDb
			.delete(apiKeys)
			.where(eq(apiKeys.id, keyId))
			.returning({ id: apiKeys.id });
		return Boolean(deleted);
	},

	async getApiKeysForUser(userId: string): Promise<(ApiKey & { siteDomain?: string; siteName?: string })[]> {
		if (!isUuid(userId)) return [];
		const rows = await drizzleDb
			.select({
				id: apiKeys.id,
				siteId: apiKeys.siteId,
				name: apiKeys.name,
				prefix: apiKeys.keyPrefix,
				scope: apiKeys.scope,
				createdAt: apiKeys.createdAt,
				lastUsedAt: apiKeys.lastUsedAt,
				siteDomain: sites.domain,
				siteName: sites.name
			})
			.from(apiKeys)
			.innerJoin(sites, eq(sites.id, apiKeys.siteId))
			.innerJoin(memberships, eq(memberships.orgId, sites.orgId))
			.where(eq(memberships.userId, userId))
			.orderBy(desc(apiKeys.createdAt));

		return rows.map((k) => ({
			id: k.id,
			siteId: k.siteId,
			name: k.name,
			prefix: k.prefix,
			scope: k.scope,
			createdAt: k.createdAt.toISOString(),
			lastUsedAt: k.lastUsedAt?.toISOString(),
			siteDomain: k.siteDomain,
			siteName: k.siteName
		}));
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
		const pgScope = (scope || 'all').toLowerCase() as 'ingestion' | 'query' | 'all';
		const keyHash = hashPassword(rawKey);

		const [key] = await drizzleDb
			.insert(apiKeys)
			.values({
				siteId: targetSite.id,
				name: name.trim() || 'API Key',
				keyHash,
				keyPrefix: prefix,
				scope: pgScope
			})
			.returning();

		return {
			apiKey: {
				id: key.id,
				siteId: key.siteId,
				name: key.name,
				prefix: key.keyPrefix,
				scope: key.scope,
				createdAt: key.createdAt.toISOString(),
				lastUsedAt: key.lastUsedAt?.toISOString(),
				siteDomain: targetSite.domain,
				siteName: targetSite.name
			},
			rawKey
		};
	},

	async revokeApiKeyForUser(userId: string, keyId: string): Promise<boolean> {
		if (!isUuid(userId) || !isUuid(keyId)) return false;
		const key = await drizzleDb.query.apiKeys.findFirst({
			where: eq(apiKeys.id, keyId),
			with: {
				site: true
			}
		});
		if (!key || !key.site) return false;

		const isMember = await drizzleDb.query.memberships.findFirst({
			where: and(eq(memberships.orgId, key.site.orgId), eq(memberships.userId, userId))
		});
		if (!isMember) return false;

		const [deleted] = await drizzleDb
			.delete(apiKeys)
			.where(eq(apiKeys.id, keyId))
			.returning({ id: apiKeys.id });
		return Boolean(deleted);
	},

	async validateApiKey(rawKey: string): Promise<{ apiKey: ApiKey; site: Site } | null> {
		if (!rawKey) return null;
		const cleanKey = rawKey.trim().replace(/^Bearer\s+/i, '');
		if (!cleanKey) return null;

		const prefixPart = cleanKey.length >= 8 ? cleanKey.substring(0, 8) : cleanKey;
		const keys = await drizzleDb
			.select({
				key: apiKeys,
				site: sites
			})
			.from(apiKeys)
			.innerJoin(sites, eq(sites.id, apiKeys.siteId))
			.where(eq(apiKeys.keyPrefix, prefixPart));

		if (keys.length > 0) {
			for (const { key, site } of keys) {
				if (key.keyHash === cleanKey || verifyPassword(cleanKey, key.keyHash)) {
					drizzleDb
						.update(apiKeys)
						.set({ lastUsedAt: new Date() })
						.where(eq(apiKeys.id, key.id))
						.catch(() => {});
					return {
						apiKey: {
							id: key.id,
							siteId: key.siteId,
							name: key.name,
							prefix: key.keyPrefix,
							scope: key.scope,
							createdAt: key.createdAt.toISOString(),
							lastUsedAt: key.lastUsedAt?.toISOString()
						},
						site: {
							id: site.id,
							orgId: site.orgId,
							domain: site.domain,
							name: site.name,
							timezone: site.timezone,
							trackingId: site.trackingId,
							public: site.public,
							createdAt: site.createdAt.toISOString()
						}
					};
				}
			}
		}

		// Fallback: check if cleanKey matches site trackingId directly
		const site = await this.getSiteByTrackingId(cleanKey);
		if (site) {
			return {
				apiKey: {
					id: 'key-tracking-' + site.id,
					siteId: site.id,
					name: 'Site Tracking Key',
					prefix: site.trackingId,
					scope: 'all',
					createdAt: site.createdAt
				},
				site
			};
		}

		return null;
	},

	// ── Goals ──

	async getGoals(siteIdOrTrackingId: string): Promise<Goal[]> {
		let site = isUuid(siteIdOrTrackingId)
			? await this.getSiteById(siteIdOrTrackingId)
			: await this.getSiteByTrackingId(siteIdOrTrackingId);
		const targetSiteId = site?.id || siteIdOrTrackingId;
		if (!isUuid(targetSiteId)) return [];

		const rows = await drizzleDb.query.goals.findMany({
			where: eq(goals.siteId, targetSiteId),
			orderBy: [desc(goals.createdAt)]
		});

		return rows.map((g) => ({
			id: g.id,
			siteId: g.siteId,
			name: g.name,
			eventName: g.eventName || undefined,
			pagePath: g.pagePath || undefined,
			createdAt: g.createdAt.toISOString()
		}));
	},

	async createGoal(siteIdOrTrackingId: string, name: string, eventName?: string, pagePath?: string): Promise<Goal> {
		let site = isUuid(siteIdOrTrackingId)
			? await this.getSiteById(siteIdOrTrackingId)
			: await this.getSiteByTrackingId(siteIdOrTrackingId);
		const targetSiteId = site?.id || siteIdOrTrackingId;
		if (!isUuid(targetSiteId)) throw new Error('Invalid site ID');

		const [goal] = await drizzleDb
			.insert(goals)
			.values({
				siteId: targetSiteId,
				name: name.trim(),
				eventName: eventName || null,
				pagePath: pagePath || null
			})
			.returning();

		return {
			id: goal.id,
			siteId: goal.siteId,
			name: goal.name,
			eventName: goal.eventName || undefined,
			pagePath: goal.pagePath || undefined,
			createdAt: goal.createdAt.toISOString()
		};
	},

	async deleteGoal(id: string): Promise<boolean> {
		if (!isUuid(id)) return false;
		const [deleted] = await drizzleDb
			.delete(goals)
			.where(eq(goals.id, id))
			.returning({ id: goals.id });
		return Boolean(deleted);
	},

	// ── Site Public Sharing ──

	async updateSiteSharing(siteId: string, isPublic: boolean, password?: string): Promise<{ success: boolean; isPublic: boolean; hasPassword: boolean }> {
		if (!isUuid(siteId)) return { success: false, isPublic: false, hasPassword: false };
		const updateData: { public: boolean; sharePasswordHash?: string | null } = {
			public: isPublic
		};
		if (password !== undefined) {
			updateData.sharePasswordHash = password.trim() ? hashPassword(password.trim()) : null;
		}

		const [updated] = await drizzleDb
			.update(sites)
			.set(updateData)
			.where(eq(sites.id, siteId))
			.returning();

		if (!updated) return { success: false, isPublic: false, hasPassword: false };
		return {
			success: true,
			isPublic: updated.public,
			hasPassword: Boolean(updated.sharePasswordHash)
		};
	},

	async getSiteByTrackingIdForShare(trackingId: string): Promise<{ site: Site; hasPassword: boolean } | null> {
		const site = await drizzleDb.query.sites.findFirst({
			where: eq(sites.trackingId, trackingId.trim())
		});
		if (!site || !site.public) return null;
		return {
			site: {
				id: site.id,
				orgId: site.orgId,
				domain: site.domain,
				name: site.name,
				timezone: site.timezone,
				trackingId: site.trackingId,
				public: site.public,
				createdAt: site.createdAt.toISOString()
			},
			hasPassword: Boolean(site.sharePasswordHash)
		};
	},

	async verifySharePassword(trackingId: string, password: string): Promise<boolean> {
		const site = await drizzleDb.query.sites.findFirst({
			where: eq(sites.trackingId, trackingId.trim())
		});
		if (!site || !site.public) return false;
		if (!site.sharePasswordHash) return true;
		return verifyPassword(password, site.sharePasswordHash);
	},

	// ── Saved Reports ──

	async getSavedReports(userId: string, siteId?: string): Promise<any[]> {
		if (!isUuid(userId)) return [];
		const conditions = [eq(savedReports.userId, userId)];
		if (siteId && isUuid(siteId)) {
			conditions.push(eq(savedReports.siteId, siteId));
		}
		const rows = await drizzleDb.query.savedReports.findMany({
			where: and(...conditions),
			orderBy: [desc(savedReports.createdAt)]
		});
		return rows.map((r) => ({
			id: r.id,
			siteId: r.siteId,
			name: r.name,
			filters: r.filters,
			createdAt: r.createdAt.toISOString(),
			updatedAt: r.updatedAt.toISOString()
		}));
	},

	async createSavedReport(userId: string, siteId: string, name: string, filters: Record<string, any>): Promise<any> {
		if (!isUuid(userId) || !isUuid(siteId)) throw new Error('Invalid user or site ID');
		const [report] = await drizzleDb
			.insert(savedReports)
			.values({
				userId,
				siteId,
				name: name.trim() || 'Untitled Report',
				filters
			})
			.returning();
		return {
			id: report.id,
			siteId: report.siteId,
			name: report.name,
			filters: report.filters,
			createdAt: report.createdAt.toISOString(),
			updatedAt: report.updatedAt.toISOString()
		};
	},

	async deleteSavedReport(userId: string, reportId: string): Promise<boolean> {
		if (!isUuid(userId) || !isUuid(reportId)) return false;
		const [deleted] = await drizzleDb
			.delete(savedReports)
			.where(and(eq(savedReports.id, reportId), eq(savedReports.userId, userId)))
			.returning({ id: savedReports.id });
		return Boolean(deleted);
	},

	// ── Alerts ──

	async getAlerts(siteId: string): Promise<any[]> {
		if (!isUuid(siteId)) return [];
		const rows = await drizzleDb.query.alerts.findMany({
			where: eq(alerts.siteId, siteId),
			orderBy: [desc(alerts.createdAt)]
		});
		return rows.map((a) => ({
			id: a.id,
			siteId: a.siteId,
			name: a.name,
			metric: a.metric,
			condition: a.condition,
			threshold: a.threshold,
			windowMinutes: a.windowMinutes,
			webhookUrl: a.webhookUrl,
			enabled: a.enabled,
			lastTriggeredAt: a.lastTriggeredAt?.toISOString() || null,
			createdAt: a.createdAt.toISOString()
		}));
	},

	async createAlert(siteId: string, data: { name: string; metric: string; condition: string; threshold: number; windowMinutes: number; webhookUrl: string }): Promise<any> {
		if (!isUuid(siteId)) throw new Error('Invalid site ID');
		const [alert] = await drizzleDb
			.insert(alerts)
			.values({
				siteId,
				name: data.name.trim(),
				metric: data.metric,
				condition: data.condition,
				threshold: Number(data.threshold),
				windowMinutes: Number(data.windowMinutes || 60),
				webhookUrl: data.webhookUrl.trim(),
				enabled: true
			})
			.returning();
		return {
			id: alert.id,
			siteId: alert.siteId,
			name: alert.name,
			metric: alert.metric,
			condition: alert.condition,
			threshold: alert.threshold,
			windowMinutes: alert.windowMinutes,
			webhookUrl: alert.webhookUrl,
			enabled: alert.enabled,
			createdAt: alert.createdAt.toISOString()
		};
	},

	async toggleAlert(alertId: string, enabled: boolean): Promise<boolean> {
		if (!isUuid(alertId)) return false;
		const [updated] = await drizzleDb
			.update(alerts)
			.set({ enabled })
			.where(eq(alerts.id, alertId))
			.returning();
		return Boolean(updated);
	},

	async deleteAlert(alertId: string): Promise<boolean> {
		if (!isUuid(alertId)) return false;
		const [deleted] = await drizzleDb
			.delete(alerts)
			.where(eq(alerts.id, alertId))
			.returning({ id: alerts.id });
		return Boolean(deleted);
	},

	// ── Audit Logs ──

	async logAuditEvent(orgId: string, userId: string | null, action: string, details: Record<string, any> = {}): Promise<void> {
		if (!isUuid(orgId)) return;
		try {
			await drizzleDb.insert(auditLogs).values({
				orgId,
				userId: userId && isUuid(userId) ? userId : null,
				action: action.trim(),
				details
			});
		} catch (err) {
			console.error('[audit] Failed to log audit event:', err);
		}
	},

	async getAuditLogs(orgId: string, limit = 50): Promise<any[]> {
		if (!isUuid(orgId)) return [];
		const rows = await drizzleDb
			.select({
				id: auditLogs.id,
				action: auditLogs.action,
				details: auditLogs.details,
				createdAt: auditLogs.createdAt,
				userName: users.name,
				userEmail: users.email
			})
			.from(auditLogs)
			.leftJoin(users, eq(users.id, auditLogs.userId))
			.where(eq(auditLogs.orgId, orgId))
			.orderBy(desc(auditLogs.createdAt))
			.limit(limit);

		return rows.map((r) => ({
			id: r.id,
			action: r.action,
			details: r.details,
			createdAt: r.createdAt.toISOString(),
			user: r.userName ? { name: r.userName, email: r.userEmail } : null
		}));
	},

	// ── Site Annotations ──

	async getSiteAnnotations(siteId: string, from?: string, to?: string): Promise<any[]> {
		if (!isUuid(siteId)) return [];
		const conditions = [eq(siteAnnotations.siteId, siteId)];
		if (from) conditions.push(sql`${siteAnnotations.date} >= ${from}`);
		if (to) conditions.push(sql`${siteAnnotations.date} <= ${to}`);

		const rows = await drizzleDb.query.siteAnnotations.findMany({
			where: and(...conditions),
			orderBy: [desc(siteAnnotations.date), desc(siteAnnotations.createdAt)]
		});

		return rows.map((a) => ({
			id: a.id,
			siteId: a.siteId,
			date: a.date,
			title: a.title,
			description: a.description || '',
			category: a.category,
			color: a.color,
			createdAt: a.createdAt.toISOString()
		}));
	},

	async createSiteAnnotation(
		siteId: string,
		data: { date: string; title: string; description?: string; category?: string; color?: string }
	): Promise<any> {
		if (!isUuid(siteId)) throw new Error('Invalid site ID');
		const [created] = await drizzleDb
			.insert(siteAnnotations)
			.values({
				siteId,
				date: data.date.trim(),
				title: data.title.trim(),
				description: data.description?.trim() || '',
				category: data.category?.trim() || 'release',
				color: data.color?.trim() || 'indigo'
			})
			.returning();

		return {
			id: created.id,
			siteId: created.siteId,
			date: created.date,
			title: created.title,
			description: created.description || '',
			category: created.category,
			color: created.color,
			createdAt: created.createdAt.toISOString()
		};
	},

	async deleteSiteAnnotation(annotationId: string): Promise<boolean> {
		if (!isUuid(annotationId)) return false;
		const [deleted] = await drizzleDb
			.delete(siteAnnotations)
			.where(eq(siteAnnotations.id, annotationId))
			.returning({ id: siteAnnotations.id });
		return Boolean(deleted);
	},

	// ── Multi-Domain Portfolio Rollup ──

	async getPortfolioSites(userId: string): Promise<any[]> {
		if (!isUuid(userId)) return [];
		const orgs = await this.getUserOrganizations(userId);
		if (orgs.length === 0) return [];
		const sitesList = await this.getUserSites(userId);
		return sitesList;
	}
};
