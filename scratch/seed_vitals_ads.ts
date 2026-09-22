// Seed realistic Vitals and Ads events directly to the Collector API
const COLLECTOR_URL = process.env.COLLECTOR_URL || 'http://localhost:8081';
const SITES = ['gly_demo_8829', 'gly_demo_9912'];

async function sendBeacon(payload: any) {
	try {
		const res = await fetch(`${COLLECTOR_URL}/api/v1/event`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
			body: JSON.stringify(payload)
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function seed() {
	console.log('Seeding vitals and ad events...');

	for (const site of SITES) {
		// Seed vitals
		const paths = ['/', '/docs', '/blog/stream-analytics', '/pricing', '/checkout'];
		for (const path of paths) {
			for (let i = 0; i < 5; i++) {
				await sendBeacon({
					s: site,
					n: 'vitals',
					u: path,
					r: 'https://google.com',
					tz: 'UTC',
					l: 'en-US',
					tab_id: 'seed_' + Math.random().toString(36).substring(2, 9),
					p: {
						lcp: String(1200 + Math.floor(Math.random() * 1400)),
						cls: String((0.01 + Math.random() * 0.05).toFixed(3)),
						inp: String(80 + Math.floor(Math.random() * 90)),
						fcp: String(700 + Math.floor(Math.random() * 400)),
						ttfb: String(150 + Math.floor(Math.random() * 150))
					}
				});
			}
		}

		// Seed ads
		const slots = ['header_leaderboard_728x90', 'sidebar_rectangle_300x250', 'in_article_interstitial'];
		for (const slot of slots) {
			for (let i = 0; i < 6; i++) {
				await sendBeacon({
					s: site,
					n: 'ad_request',
					u: '/blog/stream-analytics',
					r: '',
					tz: 'UTC',
					l: 'en-US',
					tab_id: 'seed_ad_' + Math.random().toString(36).substring(2, 9),
					p: { slot_id: slot }
				});

				await sendBeacon({
					s: site,
					n: 'ad_impression',
					u: '/blog/stream-analytics',
					r: '',
					tz: 'UTC',
					l: 'en-US',
					tab_id: 'seed_ad_' + Math.random().toString(36).substring(2, 9),
					p: { slot_id: slot }
				});

				await sendBeacon({
					s: site,
					n: 'ad_viewable',
					u: '/blog/stream-analytics',
					r: '',
					tz: 'UTC',
					l: 'en-US',
					tab_id: 'seed_ad_' + Math.random().toString(36).substring(2, 9),
					p: { slot_id: slot, dwell_time: '4.2' }
				});

				if (i === 0) {
					await sendBeacon({
						s: site,
						n: 'ad_click',
						u: '/blog/stream-analytics',
						r: '',
						tz: 'UTC',
						l: 'en-US',
						tab_id: 'seed_ad_' + Math.random().toString(36).substring(2, 9),
						p: { slot_id: slot }
					});
				}
			}
		}
	}

	console.log('Seeding finished!');
}

seed().catch(console.error);
