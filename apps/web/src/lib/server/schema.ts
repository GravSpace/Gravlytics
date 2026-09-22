import {
	pgTable,
	uuid,
	varchar,
	boolean,
	text,
	timestamp,
	date,
	integer,
	jsonb,
	pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Enums ──
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'editor', 'viewer']);
export const authProviderEnum = pgEnum('auth_provider', ['email', 'google', 'github']);
export const apiKeyScopeEnum = pgEnum('api_key_scope', ['ingestion', 'query', 'all']);

// ── Users ──
export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	passwordHash: varchar('password_hash', { length: 255 }),
	name: varchar('name', { length: 255 }).default('').notNull(),
	avatarUrl: text('avatar_url').default(''),
	authProvider: authProviderEnum('auth_provider').default('email').notNull(),
	providerId: varchar('provider_id', { length: 255 }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Organizations ──
export const organizations = pgTable('organizations', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	slug: varchar('slug', { length: 100 }).notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Memberships ──
export const memberships = pgTable('memberships', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	orgId: uuid('org_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	role: userRoleEnum('role').default('viewer').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Invitations ──
export const invitations = pgTable('invitations', {
	id: uuid('id').defaultRandom().primaryKey(),
	orgId: uuid('org_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	inviterId: uuid('inviter_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	email: varchar('email', { length: 255 }).notNull(),
	role: userRoleEnum('role').default('viewer').notNull(),
	token: varchar('token', { length: 255 }).notNull().unique(),
	status: varchar('status', { length: 50 }).default('pending').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

// ── Sites ──
export const sites = pgTable('sites', {
	id: uuid('id').defaultRandom().primaryKey(),
	orgId: uuid('org_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	domain: varchar('domain', { length: 255 }).notNull(),
	name: varchar('name', { length: 255 }).default('').notNull(),
	timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
	trackingId: varchar('tracking_id', { length: 20 }).notNull().unique(),
	salt: varchar('salt', { length: 64 }),
	saltRotatedAt: date('salt_rotated_at'),
	public: boolean('public').default(false).notNull(),
	sharePasswordHash: varchar('share_password_hash', { length: 255 }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ── API Keys ──
export const apiKeys = pgTable('api_keys', {
	id: uuid('id').defaultRandom().primaryKey(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).default('Default').notNull(),
	keyHash: varchar('key_hash', { length: 255 }).notNull(),
	keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),
	scope: apiKeyScopeEnum('scope').default('all').notNull(),
	rateLimit: integer('rate_limit').default(1000).notNull(),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Goals ──
export const goals = pgTable('goals', {
	id: uuid('id').defaultRandom().primaryKey(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	eventName: varchar('event_name', { length: 255 }),
	pagePath: varchar('page_path', { length: 500 }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Saved Reports ──
export const savedReports = pgTable('saved_reports', {
	id: uuid('id').defaultRandom().primaryKey(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	filters: jsonb('filters').default({}).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Refresh Tokens ──
export const refreshTokens = pgTable('refresh_tokens', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	tokenHash: varchar('token_hash', { length: 255 }).notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Alerts ──
export const alerts = pgTable('alerts', {
	id: uuid('id').defaultRandom().primaryKey(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 255 }).notNull(),
	metric: varchar('metric', { length: 50 }).notNull(), // 'visitors', 'pageviews', 'bounce_rate', 'goal'
	condition: varchar('condition', { length: 20 }).default('greater_than').notNull(), // 'greater_than', 'less_than'
	threshold: integer('threshold').notNull(),
	windowMinutes: integer('window_minutes').default(60).notNull(),
	webhookUrl: text('webhook_url').notNull(),
	enabled: boolean('enabled').default(true).notNull(),
	lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Audit Logs ──
export const auditLogs = pgTable('audit_logs', {
	id: uuid('id').defaultRandom().primaryKey(),
	orgId: uuid('org_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	action: varchar('action', { length: 100 }).notNull(),
	details: jsonb('details').default({}).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Site Annotations ──
export const siteAnnotations = pgTable('site_annotations', {
	id: uuid('id').defaultRandom().primaryKey(),
	siteId: uuid('site_id')
		.notNull()
		.references(() => sites.id, { onDelete: 'cascade' }),
	date: varchar('date', { length: 50 }).notNull(), // 'YYYY-MM-DD'
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	category: varchar('category', { length: 50 }).default('release').notNull(), // 'release', 'campaign', 'outage', 'press', 'milestone'
	color: varchar('color', { length: 30 }).default('indigo').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Relations ──

export const usersRelations = relations(users, ({ many }) => ({
	memberships: many(memberships),
	savedReports: many(savedReports),
	refreshTokens: many(refreshTokens),
	invitationsSent: many(invitations),
	auditLogs: many(auditLogs)
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
	memberships: many(memberships),
	sites: many(sites),
	invitations: many(invitations),
	auditLogs: many(auditLogs)
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
	user: one(users, {
		fields: [memberships.userId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [memberships.orgId],
		references: [organizations.id]
	})
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [sites.orgId],
		references: [organizations.id]
	}),
	apiKeys: many(apiKeys),
	goals: many(goals),
	savedReports: many(savedReports),
	alerts: many(alerts),
	annotations: many(siteAnnotations)
}));

export const siteAnnotationsRelations = relations(siteAnnotations, ({ one }) => ({
	site: one(sites, {
		fields: [siteAnnotations.siteId],
		references: [sites.id]
	})
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
	site: one(sites, {
		fields: [alerts.siteId],
		references: [sites.id]
	})
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	organization: one(organizations, {
		fields: [auditLogs.orgId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	})
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
	site: one(sites, {
		fields: [apiKeys.siteId],
		references: [sites.id]
	})
}));

export const goalsRelations = relations(goals, ({ one }) => ({
	site: one(sites, {
		fields: [goals.siteId],
		references: [sites.id]
	})
}));

export const savedReportsRelations = relations(savedReports, ({ one }) => ({
	site: one(sites, {
		fields: [savedReports.siteId],
		references: [sites.id]
	}),
	user: one(users, {
		fields: [savedReports.userId],
		references: [users.id]
	})
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
	organization: one(organizations, {
		fields: [invitations.orgId],
		references: [organizations.id]
	}),
	inviter: one(users, {
		fields: [invitations.inviterId],
		references: [users.id]
	})
}));

// ── Inferred Types ──
export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type OrganizationSelect = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;

export type MembershipSelect = typeof memberships.$inferSelect;
export type MembershipInsert = typeof memberships.$inferInsert;

export type SiteSelect = typeof sites.$inferSelect;
export type SiteInsert = typeof sites.$inferInsert;

export type ApiKeySelect = typeof apiKeys.$inferSelect;
export type ApiKeyInsert = typeof apiKeys.$inferInsert;

export type InvitationSelect = typeof invitations.$inferSelect;
export type InvitationInsert = typeof invitations.$inferInsert;

export type GoalSelect = typeof goals.$inferSelect;
export type GoalInsert = typeof goals.$inferInsert;

export type SavedReportSelect = typeof savedReports.$inferSelect;
export type SavedReportInsert = typeof savedReports.$inferInsert;

export type AlertSelect = typeof alerts.$inferSelect;
export type AlertInsert = typeof alerts.$inferInsert;

export type AuditLogSelect = typeof auditLogs.$inferSelect;
export type AuditLogInsert = typeof auditLogs.$inferInsert;

export type SiteAnnotationSelect = typeof siteAnnotations.$inferSelect;
export type SiteAnnotationInsert = typeof siteAnnotations.$inferInsert;
