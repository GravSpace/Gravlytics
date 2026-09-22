import { db } from '../apps/web/src/lib/server/db';

async function testPostgresDirect() {
	console.log('=== Testing PostgreSQL Live Direct Queries ===\n');

	// 1. findUserByEmail
	const user = await db.findUserByEmail('demo@gravlytics.com');
	console.log('1. findUserByEmail:', { id: user?.id, email: user?.email, name: user?.name });
	if (!user || !user.id.includes('-')) {
		throw new Error('User not found or ID is not a PostgreSQL UUID');
	}

	// 2. findUserById with role
	const userWithRole = await db.findUserById(user.id);
	console.log('2. findUserById role:', userWithRole?.role);
	if (userWithRole?.role !== 'Owner') {
		throw new Error(`Expected role Owner, got ${userWithRole?.role}`);
	}

	// 3. getUserOrganizations
	const orgs = await db.getUserOrganizations(user.id);
	console.log('3. getUserOrganizations count:', orgs.length, 'primary:', orgs[0]?.name);
	if (orgs.length === 0 || !orgs[0]?.id) {
		throw new Error('No organizations returned for demo user');
	}
	const primaryOrg = orgs[0];

	// 4. getOrganizationForUser
	const orgData = await db.getOrganizationForUser(user.id);
	console.log('4. getOrganizationForUser:', orgData?.organization.name, 'role:', orgData?.role);
	if (!orgData || orgData.role !== 'Owner') {
		throw new Error('Failed to get primary organization');
	}

	// 5. updateOrganizationForUser in PostgreSQL
	const originalName = primaryOrg.name;
	const updatedOrg = await db.updateOrganizationForUser(
		user.id,
		primaryOrg.id,
		'Postgres Live Workspace',
		primaryOrg.slug
	);
	console.log('5. updateOrganizationForUser updated name:', updatedOrg?.name);
	if (updatedOrg?.name !== 'Postgres Live Workspace') {
		throw new Error('Failed to update organization name');
	}

	// Restore original name
	await db.updateOrganizationForUser(user.id, primaryOrg.id, originalName, primaryOrg.slug);
	console.log('   Restored organization name to:', originalName);

	// 6. getUserSites
	const sites = await db.getUserSites(user.id);
	console.log('6. getUserSites count:', sites.length, 'domains:', sites.map((s) => s.domain).join(', '));
	if (sites.length === 0) {
		throw new Error('No sites found for user in PostgreSQL');
	}

	// 7. createSiteForUser
	const testSite = await db.createSiteForUser(user.id, 'pg-integration.example.com', 'PG Integration Test');
	console.log('7. createSiteForUser created:', testSite.id, testSite.domain);
	if (!testSite.id || testSite.domain !== 'pg-integration.example.com') {
		throw new Error('Failed to create site in PostgreSQL');
	}

	// 8. createApiKeyForUser
	const keyResult = await db.createApiKeyForUser(user.id, 'PG Key Test', 'all', testSite.id);
	console.log('8. createApiKeyForUser created:', keyResult.apiKey.id, 'prefix:', keyResult.apiKey.prefix);
	if (!keyResult.rawKey || !keyResult.apiKey.id) {
		throw new Error('Failed to create API key in PostgreSQL');
	}

	// 9. validateApiKey against PostgreSQL
	const validation = await db.validateApiKey(keyResult.rawKey);
	console.log('9. validateApiKey validation result:', validation ? 'SUCCESS' : 'FAILED', 'site:', validation?.site.domain);
	if (!validation || validation.site.id !== testSite.id) {
		throw new Error('API key failed validation in PostgreSQL');
	}

	// 10. revokeApiKeyForUser
	const revoked = await db.revokeApiKeyForUser(user.id, keyResult.apiKey.id);
	console.log('10. revokeApiKeyForUser:', revoked ? 'SUCCESS' : 'FAILED');
	if (!revoked) {
		throw new Error('Failed to revoke API key in PostgreSQL');
	}

	// Verify key no longer validates
	const postRevocation = await db.validateApiKey(keyResult.rawKey);
	console.log('    Validation after revoke (should be null):', postRevocation);
	if (postRevocation !== null) {
		throw new Error('Revoked key still validated');
	}

	// 11. deleteSiteForUser
	const deletedSite = await db.deleteSiteForUser(user.id, testSite.id);
	console.log('11. deleteSiteForUser:', deletedSite ? 'SUCCESS' : 'FAILED');
	if (!deletedSite) {
		throw new Error('Failed to delete test site in PostgreSQL');
	}

	// 12. createOrgInvitation
	const testEmail = `invitee_${Date.now()}@test.com`;
	const invitation = await db.createOrgInvitation(primaryOrg.id, user.id, testEmail, 'Editor');
	console.log('12. createOrgInvitation created:', invitation.id, 'token:', invitation.token);
	if (!invitation.id || !invitation.token) {
		throw new Error('Failed to create invitation in PostgreSQL');
	}

	// 13. getInvitationByToken
	const fetchedInvite = await db.getInvitationByToken(invitation.token);
	console.log('13. getInvitationByToken:', fetchedInvite?.email, 'org:', fetchedInvite?.orgName);
	if (!fetchedInvite || fetchedInvite.email !== testEmail) {
		throw new Error('Failed to fetch invitation by token in PostgreSQL');
	}

	// 14. cancelOrgInvitation
	const cancelled = await db.cancelOrgInvitation(primaryOrg.id, invitation.id);
	console.log('14. cancelOrgInvitation:', cancelled ? 'SUCCESS' : 'FAILED');
	if (!cancelled) {
		throw new Error('Failed to cancel invitation in PostgreSQL');
	}

	console.log('\n>>> ALL POSTGRESQL CRUD TESTS PASSED WITH 100% SUCCESS! <<<');
}

testPostgresDirect().then(() => process.exit(0)).catch((e) => {
	console.error('Test error:', e);
	process.exit(1);
});
