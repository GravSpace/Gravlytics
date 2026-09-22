// Gravlytics Theme Store
// Provides seamless dark & light mode toggling with persistence

export type Theme = 'dark' | 'light';

class ThemeStore {
	current = $state<Theme>('dark');

	constructor() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('gravlytics_theme') as Theme | null;
			if (saved === 'light' || saved === 'dark') {
				this.current = saved;
			} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
				this.current = 'light';
			}
			this.applyTheme(this.current);
		}
	}

	toggle() {
		this.setTheme(this.current === 'dark' ? 'light' : 'dark');
	}

	setTheme(theme: Theme) {
		this.current = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem('gravlytics_theme', theme);
			this.applyTheme(theme);
		}
	}

	private applyTheme(theme: Theme) {
		const root = document.documentElement;
		if (theme === 'light') {
			root.classList.remove('dark');
			root.classList.add('light');
			root.setAttribute('data-theme', 'light');
			root.style.colorScheme = 'light';
		} else {
			root.classList.remove('light');
			root.classList.add('dark');
			root.setAttribute('data-theme', 'dark');
			root.style.colorScheme = 'dark';
		}
	}
}

export const themeStore = new ThemeStore();
