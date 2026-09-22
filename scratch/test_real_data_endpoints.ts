import { hashPassword, signJWT } from '../apps/web/src/lib/server/crypto';

async function runTests() {
	const BASE_URL = 'http://localhost:5174';
	console.log('Testing Real Data Endpoints on', BASE_URL);

	const token = signJWT({
		userId: 'usr_demo_default',
		email: 'demo@gravlytics.com',
		name: 'Demo Analyst'
	});
	const cookie = `gravlytics_token=${token}`;
	console.log('✓ Successfully generated auth token for demo user');

	// 2. Fetch active organization
	const orgRes = await fetch(`${BASE_URL}/api/organization`, {
		headers: { Cookie: cookie }
	});
	if (!orgRes.ok) {
		throw new Error(`Failed to GET /api/organization: ${orgRes.statusText}`);
	}
	const orgData = await orgRes.json();
	console.log('✓ GET /api/organization returned:', orgData);
	if (!orgData.organization || !orgData.role) {
		throw new Error('Invalid organization response format');
	}

	// 3. Update organization name
	const oldName = orgData.organization.name;
	const testName = `Updated ${oldName.replace(/Updated\s*/g, '')}`;
	const patchRes = await fetch(`${BASE_URL}/api/organization`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', Cookie: cookie },
		body: JSON.stringify({ name: testName, slug: orgData.organization.slug })
	});
	if (!patchRes.ok) {
		throw new Error(`Failed to PATCH /api/organization: ${patchRes.statusText}`);
	}
	const patchData = await patchRes.json();
	console.log('✓ PATCH /api/organization updated name to:', patchData.organization.name);

	// 4. Test API keys listing
	const keysRes = await fetch(`${BASE_URL}/api/api-keys`, {
		headers: { Cookie: cookie }
	});
	if (!keysRes.ok) {
		throw new Error(`Failed to GET /api/api-keys: ${keysRes.statusText}`);
	}
	const initialKeys = await keysRes.json();
	console.log(`✓ GET /api/api-keys returned ${initialKeys.apiKeys?.length || 0} keys`);

	// 5. Create new API key
	const createKeyRes = await fetch(`${BASE_URL}/api/api-keys`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Cookie: cookie },
		body: JSON.stringify({ name: 'Integration Test Key', scope: 'all' })
	});
	if (!createKeyRes.ok) {
		const err = await createKeyRes.text();
		throw new Error(`Failed to POST /api/api-keys: ${err}`);
	}
	const createdKeyData = await createKeyRes.json();
	console.log('✓ POST /api/api-keys created key:', createdKeyData.apiKey.id, 'rawKey:', createdKeyData.rawKey);

	// 6. Test external API using this newly created rawKey
	const externalRes = await fetch(`${BASE_URL}/api/v1/stats/overview`, {
		headers: { Authorization: `Bearer ${createdKeyData.rawKey}` }
	});
	if (!externalRes.ok) {
		const err = await externalRes.text();
		throw new Error(`External API failed with newly generated key: ${err}`);
	}
	const statsData = await externalRes.json();
	console.log('✓ External API /api/v1/stats/overview authenticated successfully! Site:', statsData.site?.domain);

	// 7. Revoke API key
	const deleteRes = await fetch(`${BASE_URL}/api/api-keys?id=${createdKeyData.apiKey.id}`, {
		method: 'DELETE',
		headers: { Cookie: cookie }
	});
	if (!deleteRes.ok) {
		throw new Error(`Failed to DELETE /api/api-keys: ${deleteRes.statusText}`);
	}
	console.log('✓ DELETE /api/api-keys successfully revoked the key');

	// 8. Verify the key no longer works on external endpoint
	const revokedTestRes = await fetch(`${BASE_URL}/api/v1/stats/overview`, {
		headers: { Authorization: `Bearer ${createdKeyData.rawKey}` }
	});
	if (revokedTestRes.status !== 401) {
		throw new Error(`Expected 401 for revoked key, got ${revokedTestRes.status}`);
	}
	console.log('✓ Revoked key was correctly rejected (401 Unauthorized)');

	console.log('\nALL REAL DATA ENDPOINT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
	console.error('Test failed:', err);
	process.exit(1);
});
