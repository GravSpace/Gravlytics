// Gravlytics Date Range Store
// Reactive store providing global date filtering across all dashboard views

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '12m' | 'custom';

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
	version = $state<number>(0);

	constructor() {
		this.applyPreset('30d');
	}

	get selectedRange() {
		return { from: this.from, to: this.to };
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
