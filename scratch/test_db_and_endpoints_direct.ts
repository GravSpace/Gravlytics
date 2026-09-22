import { db } from '../apps/web/src/lib/server/db';
import { GET as getOrg, PATCH as patchOrg } from '../apps/web/src/routes/api/organization/+server';
import { GET as getKeys, POST as postKey, DELETE as deleteKey } from '../apps/web/src/routes/api/api-keys/+server';

async function testDirect() {
	console.log('--- Testing Real Data Logic Directly ---');

	const demoUserId = 'usr_demo_default';
	const adminUserId = 'usr_admin_default';

	// 1. Verify findUserById includes role
	const admin = await db.findUserById(adminUserId);
	const demo = await db.findUserById(demoUserId);
	console.log('Admin user:', { id: admin?.id, name: admin?.name, role: admin?.role });
	console.log('Demo user:', { id: demo?.id, name: demo?.name, role: demo?.role });
	if (admin?.role !== 'Owner' || demo?.role !== 'Owner') {
		throw new Error('User role missing or incorrect');
	}

	// 2. Test getOrganizationForUser
	const orgData = await db.getOrganizationForUser(demoUserId);
	console.log('Demo org data:', orgData);
	if (!orgData?.organization || orgData.role !== 'Owner') {
		throw new Error('Failed to get org for user');
	}

	// 3. Test updateOrganizationForUser
	const updatedOrg = await db.updateOrganizationForUser(
		demoUserId,
		orgData.organization.id,
		'Demo Organization Updated',
		'demo-org-updated'
	);
	console.log('Updated org:', updatedOrg);
	if (updatedOrg?.name !== 'Demo Organization Updated' || updatedOrg?.slug !== 'demo-org-updated') {
		throw new Error('Failed to update org');
	}

	// 4. Test API keys for user
	const userKeys = await db.getApiKeysForUser(demoUserId);
	console.log('Initial demo user keys count:', userKeys.length);

	// 5. Create API key for user
	const newKeyResult = await db.createApiKeyForUser(demoUserId, 'Production Test Key', 'all');
	console.log('Created API key:', newKeyResult.apiKey.id, 'prefix:', newKeyResult.apiKey.prefix, 'rawKey:', newKeyResult.rawKey);
	if (!newKeyResult.rawKey || !newKeyResult.apiKey.id) {
		throw new Error('Failed to create API key');
	}

	// 6. Validate newly created key via db.validateApiKey
	const validation = await db.validateApiKey(newKeyResult.rawKey);
	console.log('Validation with rawKey:', validation ? 'SUCCESS' : 'FAILED');
	if (!validation || validation.apiKey.id !== newKeyResult.apiKey.id) {
		throw new Error('API key validation failed for newly generated key');
	}

	// 7. Revoke API key for user
	const revoked = await db.revokeApiKeyForUser(demoUserId, newKeyResult.apiKey.id);
	console.log('Revoked key:', revoked);
	if (!revoked) {
		throw new Error('Failed to revoke API key');
	}

	// 8. Verify key no longer validates
	const postRevocation = await db.validateApiKey(newKeyResult.rawKey);
	console.log('Validation after revocation (should be null):', postRevocation);
	if (postRevocation !== null) {
		throw new Error('Revoked key should not validate');
	}

	// 9. Test API route handlers directly
	const mockEventGetOrg: any = { locals: { user: demo } };
	const getOrgResponse = await getOrg(mockEventGetOrg);
	const getOrgJson = await getOrgResponse.json();
	console.log('GET /api/organization handler response:', getOrgJson);

	const mockEventPostKey: any = {
		locals: { user: demo },
		request: {
			json: async () => ({ name: 'Handler Created Key', scope: 'query' })
		}
	};
	const postKeyResponse = await postKey(mockEventPostKey);
	const postKeyJson = await postKeyResponse.json();
	console.log('POST /api/api-keys handler response:', postKeyJson);
	if (!postKeyJson.success || !postKeyJson.rawKey) {
		throw new Error('POST /api/api-keys handler failed');
	}

	// Revoke the handler-created key
	const mockEventDeleteKey: any = {
		locals: { user: demo },
		url: new URL(`http://localhost/api/api-keys?id=${postKeyJson.apiKey.id}`)
	};
	const deleteKeyResponse = await deleteKey(mockEventDeleteKey);
	const deleteKeyJson = await deleteKeyResponse.json();
	console.log('DELETE /api/api-keys handler response:', deleteKeyJson);
	if (!deleteKeyJson.success) {
		throw new Error('DELETE /api/api-keys handler failed');
	}

	// 10. Restore demo organization name
	await db.updateOrganizationForUser(demoUserId, orgData.organization.id, 'Demo Workspace', 'demo-workspace');

	console.log('\n>>> ALL REAL DATA DIRECT LOGIC TESTS PASSED WITH 100% SUCCESS! <<<');
}

testDirect().catch((e) => {
	console.error('Direct test error:', e);
	process.exit(1);
});
