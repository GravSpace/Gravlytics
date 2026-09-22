export function parseDateRange(url: URL): { from?: string; to?: string; period: string } {
	const period = url.searchParams.get('period');
	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	if (fromParam && toParam) {
		return { from: fromParam, to: toParam, period: 'custom' };
	}

	const now = new Date();
	const formatDate = (d: Date) => d.toISOString().split('T')[0];

	if (period === 'today') {
		const today = formatDate(now);
		return { from: today, to: today, period: 'today' };
	}

	if (period === 'yesterday') {
		const yest = new Date(now.getTime() - 86400000);
		const yestStr = formatDate(yest);
		return { from: yestStr, to: yestStr, period: 'yesterday' };
	}

	if (period === '7d' || period === '7days') {
		const past = new Date(now.getTime() - 7 * 86400000);
		return { from: formatDate(past), to: formatDate(now), period: '7d' };
	}

	// Default 30d
	const past = new Date(now.getTime() - 30 * 86400000);
	return { from: formatDate(past), to: formatDate(now), period: period || '30d' };
}
