import { sql } from '../apps/web/src/lib/server/db';
import fs from 'node:fs';
import path from 'node:path';

async function purgeProductionData() {
	console.log('=== Purging All Default & Test Data for Production Readiness ===\n');

	// 1. Truncate PostgreSQL metadata tables
	console.log('1. Truncating PostgreSQL tables...');
	try {
		await sql`
			TRUNCATE TABLE 
				refresh_tokens, 
				saved_reports, 
				goals, 
				api_keys, 
				sites, 
				invitations, 
				memberships, 
				organizations, 
				users 
			CASCADE;
		`;
		console.log('   [SUCCESS] PostgreSQL tables truncated.');
	} catch (err) {
		console.error('   [ERROR] PostgreSQL truncate failed:', err);
	}

	// 2. Truncate ClickHouse event tables
	console.log('\n2. Truncating ClickHouse event tables...');
	const chHost = process.env.CLICKHOUSE_HOST || 'localhost';
	const chPort = process.env.CLICKHOUSE_HTTP_PORT || '8123';
	const chUser = process.env.CLICKHOUSE_USER || 'default';
	const chPass = process.env.CLICKHOUSE_PASSWORD || 'gravlytics_dev';
	const chDb = process.env.CLICKHOUSE_DB || 'gravlytics';

	const chTables = ['events', 'daily_visitors', 'hourly_stats'];
	for (const tbl of chTables) {
		try {
			const res = await fetch(`http://${chHost}:${chPort}/?user=${chUser}&password=${chPass}`, {
				method: 'POST',
				body: `TRUNCATE TABLE IF EXISTS ${chDb}.${tbl}`
			});
			if (res.ok) {
				console.log(`   [SUCCESS] ClickHouse ${chDb}.${tbl} truncated.`);
			} else {
				console.warn(`   [WARN] ClickHouse ${tbl}: ${await res.text()}`);
			}
		} catch (err) {
			console.warn(`   [WARN] Could not reach ClickHouse for ${tbl}:`, (err as any).message);
		}
	}

	// 3. Remove local .data directories
	console.log('\n3. Cleaning up local JSON data stores...');
	const dirsToClean = [
		path.resolve(process.cwd(), 'apps/web/.data'),
		path.resolve(process.cwd(), '.data')
	];

	for (const dir of dirsToClean) {
		if (fs.existsSync(dir)) {
			fs.rmSync(dir, { recursive: true, force: true });
			console.log(`   [SUCCESS] Removed: ${dir}`);
		} else {
			console.log(`   [SKIP] Not found: ${dir}`);
		}
	}

	// 4. Verify PostgreSQL row counts
	console.log('\n4. Verifying PostgreSQL clean state:');
	const [uCount] = await sql`SELECT count(*)::int as count FROM users`;
	const [oCount] = await sql`SELECT count(*)::int as count FROM organizations`;
	const [mCount] = await sql`SELECT count(*)::int as count FROM memberships`;
	const [sCount] = await sql`SELECT count(*)::int as count FROM sites`;
	const [kCount] = await sql`SELECT count(*)::int as count FROM api_keys`;
	const [gCount] = await sql`SELECT count(*)::int as count FROM goals`;

	console.log(`   users: ${uCount.count}`);
	console.log(`   organizations: ${oCount.count}`);
	console.log(`   memberships: ${mCount.count}`);
	console.log(`   sites: ${sCount.count}`);
	console.log(`   api_keys: ${kCount.count}`);
	console.log(`   goals: ${gCount.count}`);

	if (
		uCount.count === 0 &&
		oCount.count === 0 &&
		mCount.count === 0 &&
		sCount.count === 0 &&
		kCount.count === 0 &&
		gCount.count === 0
	) {
		console.log('\n>>> SYSTEM IS 100% PRISTINE AND READY FOR PRODUCTION! <<<');
	} else {
		console.error('\n>>> WARNING: Some records still exist in PostgreSQL! <<<');
	}

	process.exit(0);
}

purgeProductionData().catch((err) => {
	console.error('Fatal purge error:', err);
	process.exit(1);
});
