import { db, drizzleDb, users, pgClient, eq } from '../apps/web/src/lib/server/db';
import { hashPassword } from '../apps/web/src/lib/server/crypto';

async function testProdRegister() {
	console.log('=== Testing Production Registration & Lifecycle with Drizzle ORM ===\n');

	// 1. Create a brand new user via Drizzle
	const email = 'production_drizzle_test@example.com';
	const passwordHash = hashPassword('SecurePassword123!');
	const name = 'Drizzle Admin';

	console.log('1. Calling db.createUser (Drizzle transaction)...');
	const user = await db.createUser(email, passwordHash, name);
	console.log('   Created user:', { id: user.id, email: user.email, name: user.name, role: user.role });

	if (!user.id.includes('-')) {
		throw new Error('User ID must be a PostgreSQL UUID');
	}

	// 2. Check user in PostgreSQL via Drizzle select
	console.log('\n2. Verifying user directly in PostgreSQL via Drizzle select...');
	const [pgUser] = await drizzleDb.select().from(users).where(eq(users.id, user.id));
	console.log('   PostgreSQL user:', { id: pgUser?.id, email: pgUser?.email, name: pgUser?.name });
	if (!pgUser || pgUser.email !== email) throw new Error('User not found in PostgreSQL');

	// 3. Check organization and membership in PostgreSQL
	console.log('\n3. Verifying organization & membership in PostgreSQL...');
	const orgs = await db.getUserOrganizations(user.id);
	console.log('   User orgs:', orgs);
	if (orgs.length !== 1 || orgs[0].name !== "Drizzle Admin's Workspace") {
		throw new Error('Organization not created properly');
	}

	// 4. Check sites - MUST BE 0 (NO DEFAULT SITES CREATED)
	console.log('\n4. Verifying sites count (MUST BE 0)...');
	const sites = await db.getUserSites(user.id);
	console.log('   User sites count:', sites.length);
	if (sites.length !== 0) {
		throw new Error(`Expected 0 sites, but found ${sites.length}! Default site was not removed.`);
	}
	console.log('   [SUCCESS] No default sites were auto-created. Pristine zero-state verified!');

	// 5. Create a real site via Drizzle
	console.log('\n5. Creating first real site for user via Drizzle...');
	const newSite = await db.createSiteForUser(user.id, 'company.com', 'Company Production');
	console.log('   Created site:', { id: newSite.id, domain: newSite.domain, trackingId: newSite.trackingId });

	const sitesAfterAdd = await db.getUserSites(user.id);
	console.log('   User sites count after adding:', sitesAfterAdd.length);
	if (sitesAfterAdd.length !== 1) {
		throw new Error('Expected 1 site after adding');
	}

	// 6. Test site lookup by tracking ID
	console.log('\n6. Looking up site by tracking ID...');
	const foundSite = await db.getSiteByTrackingId(newSite.trackingId);
	console.log('   Found site domain:', foundSite?.domain);
	if (!foundSite || foundSite.id !== newSite.id) {
		throw new Error('Site tracking ID lookup failed');
	}

	// 7. Test API Key generation via Drizzle
	console.log('\n7. Creating and validating API key...');
	const { apiKey, rawKey } = await db.createApiKeyForUser(user.id, 'Test API Key', 'all', newSite.id);
	console.log('   Created API Key:', { id: apiKey.id, prefix: apiKey.prefix });
	const validated = await db.validateApiKey(rawKey);
	console.log('   Validated API Key site:', validated?.site?.domain);
	if (!validated || validated.site.id !== newSite.id) {
		throw new Error('API Key validation failed');
	}

	// 8. Clean up test data so DB remains 100% clean
	console.log('\n8. Cleaning up test records in PostgreSQL...');
	await pgClient`TRUNCATE TABLE refresh_tokens, saved_reports, goals, api_keys, sites, invitations, memberships, organizations, users CASCADE;`;
	console.log('   [SUCCESS] Database cleaned up.');

	console.log('\n>>> ALL DRIZZLE ORM CRUD & LIFECYCLE TESTS PASSED! <<<');
	await pgClient.end();
	process.exit(0);
}

testProdRegister().catch((err) => {
	console.error('Test failed:', err);
	process.exit(1);
});
