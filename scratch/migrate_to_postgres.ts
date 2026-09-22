import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dbUrl = process.env.DATABASE_URL || 'postgres://gravlytics:gravlytics_dev@localhost:5432/gravlytics';
const BunSQL = (globalThis as any).Bun?.SQL;

if (!BunSQL) {
	console.error('BunSQL is not available');
	process.exit(1);
}

const sql = new BunSQL(dbUrl);

// Deterministic UUID mapper for legacy mock string IDs
const idMap = new Map<string, string>();
function toUUID(id: string): string {
	if (!id) return crypto.randomUUID();
	// If already a valid UUID
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
		return id;
	}
	if (idMap.has(id)) return idMap.get(id)!;
	
	// Create deterministic UUID from string hash
	const hash = crypto.createHash('md5').update(id).digest('hex');
	const uuid = [
		hash.substring(0, 8),
		hash.substring(8, 12),
		'4' + hash.substring(13, 16),
		((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
		hash.substring(20, 32)
	].join('-');
	idMap.set(id, uuid);
	return uuid;
}

async function migrate() {
	console.log('Running PostgreSQL schema updates and data migration...');

	// 1. Ensure user_role enum has 'admin'
	try {
		await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';`;
		console.log('✓ user_role enum verified/updated with admin');
	} catch (e: any) {
		console.log('Note on user_role:', e.message);
	}

	// 2. Ensure invitations table exists
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
	console.log('✓ invitations table verified');

	// 3. Load existing users from users.json
	const usersFile = path.resolve(process.cwd(), 'apps/web/.data/users.json');
	const workspaceFile = path.resolve(process.cwd(), 'apps/web/.data/workspace.json');

	if (fs.existsSync(usersFile)) {
		const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
		for (const u of users) {
			const uuid = toUUID(u.id);
			await sql`
				INSERT INTO users (id, email, password_hash, name, avatar_url, created_at)
				VALUES (${uuid}, ${u.email.toLowerCase()}, ${u.passwordHash}, ${u.name}, ${u.avatarUrl || ''}, ${u.createdAt || new Date().toISOString()})
				ON CONFLICT (email) DO UPDATE 
				SET password_hash = EXCLUDED.password_hash,
				    name = EXCLUDED.name,
				    avatar_url = EXCLUDED.avatar_url;
			`;
		}
		console.log(`✓ Migrated ${users.length} users into PostgreSQL`);
	}

	// 4. Load workspace data from workspace.json
	if (fs.existsSync(workspaceFile)) {
		const ws = JSON.parse(fs.readFileSync(workspaceFile, 'utf-8'));

		// Organizations
		if (Array.isArray(ws.orgs)) {
			for (const o of ws.orgs) {
				const uuid = toUUID(o.id);
				await sql`
					INSERT INTO organizations (id, name, slug)
					VALUES (${uuid}, ${o.name}, ${o.slug})
					ON CONFLICT (slug) DO UPDATE 
					SET name = EXCLUDED.name;
				`;
			}
			console.log(`✓ Migrated ${ws.orgs.length} organizations into PostgreSQL`);
		}

		// Memberships
		if (Array.isArray(ws.members)) {
			for (const m of ws.members) {
				const uuid = toUUID(m.id);
				const userId = toUUID(m.userId);
				const orgId = toUUID(m.orgId);
				const role = (m.role || 'viewer').toLowerCase();

				await sql`
					INSERT INTO memberships (id, user_id, org_id, role)
					VALUES (${uuid}, ${userId}, ${orgId}, ${role}::user_role)
					ON CONFLICT (user_id, org_id) DO UPDATE 
					SET role = EXCLUDED.role;
				`;
			}
			console.log(`✓ Migrated ${ws.members.length} memberships into PostgreSQL`);
		}

		// Sites
		if (Array.isArray(ws.sites)) {
			for (const s of ws.sites) {
				const uuid = toUUID(s.id);
				const orgId = toUUID(s.orgId);
				await sql`
					INSERT INTO sites (id, org_id, domain, name, timezone, tracking_id, public, created_at)
					VALUES (${uuid}, ${orgId}, ${s.domain}, ${s.name || s.domain}, ${s.timezone || 'UTC'}, ${s.trackingId}, ${!!s.public}, ${s.createdAt || new Date().toISOString()})
					ON CONFLICT (tracking_id) DO UPDATE 
					SET domain = EXCLUDED.domain,
					    name = EXCLUDED.name;
				`;
			}
			console.log(`✓ Migrated ${ws.sites.length} sites into PostgreSQL`);
		}

		// API Keys
		if (Array.isArray(ws.apiKeys)) {
			for (const k of ws.apiKeys) {
				const uuid = toUUID(k.id);
				const siteId = toUUID(k.siteId);
				const scope = (k.scope || 'all').toLowerCase();
				await sql`
					INSERT INTO api_keys (id, site_id, name, key_hash, key_prefix, scope, created_at)
					VALUES (${uuid}, ${siteId}, ${k.name}, ${k.keyHash || k.prefix || 'key_hash'}, ${k.prefix || 'gly_key'}, ${scope}::api_key_scope, ${k.createdAt || new Date().toISOString()})
					ON CONFLICT (id) DO NOTHING;
				`;
			}
			console.log(`✓ Migrated ${ws.apiKeys.length} api_keys into PostgreSQL`);
		}

		// Invitations
		if (Array.isArray(ws.invitations)) {
			for (const inv of ws.invitations) {
				const uuid = toUUID(inv.id);
				const orgId = toUUID(inv.orgId);
				let inviterId = toUUID(inv.inviterId);
				const inviterByEmail = await sql`SELECT id FROM users WHERE LOWER(email) = LOWER(${inv.inviterId}) LIMIT 1`;
				if (inviterByEmail.length > 0) {
					inviterId = inviterByEmail[0].id;
				} else {
					const checkInviter = await sql`SELECT id FROM users WHERE id = ${inviterId}::uuid LIMIT 1`;
					if (checkInviter.length === 0) {
						const [firstUser] = await sql`SELECT id FROM users LIMIT 1`;
						inviterId = firstUser?.id;
					}
				}
				if (!inviterId) continue;
				let role = (inv.role || 'viewer').toLowerCase();
				if (!['owner', 'admin', 'editor', 'viewer'].includes(role)) {
					role = 'viewer';
				}
				await sql`
					INSERT INTO invitations (id, org_id, inviter_id, email, role, token, status, created_at, expires_at)
					VALUES (${uuid}, ${orgId}, ${inviterId}, ${inv.email}, ${role}::user_role, ${inv.token}, ${inv.status || 'pending'}, ${inv.createdAt || new Date().toISOString()}, ${inv.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString()})
					ON CONFLICT (token) DO UPDATE 
					SET status = EXCLUDED.status;
				`;
			}
			console.log(`✓ Migrated ${ws.invitations.length} invitations into PostgreSQL`);
		}
	}

	// Verify totals in database
	const [userCount] = await sql`SELECT count(*)::int as count FROM users;`;
	const [orgCount] = await sql`SELECT count(*)::int as count FROM organizations;`;
	const [siteCount] = await sql`SELECT count(*)::int as count FROM sites;`;
	const [memCount] = await sql`SELECT count(*)::int as count FROM memberships;`;
	const [keyCount] = await sql`SELECT count(*)::int as count FROM api_keys;`;
	const [invCount] = await sql`SELECT count(*)::int as count FROM invitations;`;

	console.log('\n--- PostgreSQL Migration Summary ---');
	console.log(`Users:         ${userCount.count}`);
	console.log(`Organizations: ${orgCount.count}`);
	console.log(`Memberships:   ${memCount.count}`);
	console.log(`Sites:         ${siteCount.count}`);
	console.log(`API Keys:      ${keyCount.count}`);
	console.log(`Invitations:   ${invCount.count}`);
	console.log('------------------------------------');
}

migrate().then(() => {
	console.log('Migration completed successfully!');
	process.exit(0);
}).catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
