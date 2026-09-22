// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name: string;
				avatarUrl?: string;
				createdAt: string;
				role?: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
			};
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'bun' {
	export const SQL: any;
}

export {};
