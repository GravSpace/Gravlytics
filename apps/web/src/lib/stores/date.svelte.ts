// Gravlytics Date Range Store
// Reactive store providing global date filtering across all dashboard views

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '12m' | 'custom';
export type CompareMode = 'none' | 'previous_period' | 'previous_year';

function formatDate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
	if (!dateStr) return '';
	const [year, month, day] = dateStr.split('-').map(Number);
	const d = new Date(year, month - 1, day);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

class DateStore {
	preset = $state<DatePreset>('30d');
	from = $state<string>('');
	to = $state<string>('');
	label = $state<string>('Last 30 days');
	compareMode = $state<CompareMode>('none');
	version = $state<number>(0);

	constructor() {
		this.applyPreset('30d');
	}

	get selectedRange() {
		return { from: this.from, to: this.to };
	}

	get compareFrom(): string {
		if (this.compareMode === 'none' || !this.from || !this.to) return '';
		if (this.compareMode === 'previous_year') {
			const [y, m, d] = this.from.split('-').map(Number);
			return `${y - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		}
		const fromDate = new Date(this.from);
		const toDate = new Date(this.to);
		const diffDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24)));
		const prevTo = new Date(fromDate);
		prevTo.setDate(prevTo.getDate() - 1);
		const prevFrom = new Date(prevTo);
		prevFrom.setDate(prevFrom.getDate() - diffDays + 1);
		return formatDate(prevFrom);
	}

	get compareTo(): string {
		if (this.compareMode === 'none' || !this.from || !this.to) return '';
		if (this.compareMode === 'previous_year') {
			const [y, m, d] = this.to.split('-').map(Number);
			return `${y - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		}
		const fromDate = new Date(this.from);
		const prevTo = new Date(fromDate);
		prevTo.setDate(prevTo.getDate() - 1);
		return formatDate(prevTo);
	}

	get compareLabel(): string {
		if (this.compareMode === 'none') return '';
		if (this.compareMode === 'previous_year') return 'vs. Same Period Last Year';
		return 'vs. Previous Period';
	}

	setCompareMode(mode: CompareMode) {
		this.compareMode = mode;
		this.version++;
	}

	setPreset(preset: DatePreset) {
		this.applyPreset(preset);
		this.version++;
	}

	setCustomRange(from: string, to: string) {
		if (!from || !to) return;
		this.preset = 'custom';
		this.from = from;
		this.to = to;
		this.label = `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
		this.version++;
	}

	private applyPreset(preset: DatePreset) {
		const now = new Date();
		const todayStr = formatDate(now);

		this.preset = preset;
		this.to = todayStr;

		switch (preset) {
			case 'today': {
				this.from = todayStr;
				this.label = 'Today';
				break;
			}
			case 'yesterday': {
				const y = new Date(now);
				y.setDate(y.getDate() - 1);
				const yStr = formatDate(y);
				this.from = yStr;
				this.to = yStr;
				this.label = 'Yesterday';
				break;
			}
			case '7d': {
				const d = new Date(now);
				d.setDate(d.getDate() - 6);
				this.from = formatDate(d);
				this.label = 'Last 7 days';
				break;
			}
			case '30d': {
				const d = new Date(now);
				d.setDate(d.getDate() - 29);
				this.from = formatDate(d);
				this.label = 'Last 30 days';
				break;
			}
			case '90d': {
				const d = new Date(now);
				d.setDate(d.getDate() - 89);
				this.from = formatDate(d);
				this.label = 'Last 90 days';
				break;
			}
			case '12m': {
				const d = new Date(now);
				d.setDate(d.getDate() - 364);
				this.from = formatDate(d);
				this.label = 'Last 12 months';
				break;
			}
			default: {
				const d = new Date(now);
				d.setDate(d.getDate() - 29);
				this.from = formatDate(d);
				this.label = 'Last 30 days';
			}
		}
	}
}

export const dateStore = new DateStore();
