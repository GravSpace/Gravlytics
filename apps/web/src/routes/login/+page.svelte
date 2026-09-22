<script lang="ts">
	import type { ActionData } from './$types';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { Sun, Moon } from '@lucide/svelte';

	let { form }: { form: ActionData } = $props();
	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
</script>

<svelte:head>
	<title>Sign In — Gravlytics</title>
</svelte:head>

<div class="relative flex min-h-screen items-center justify-center p-4">
	<!-- Theme toggle button -->
	<div class="absolute top-5 right-5 z-20">
		<button
			type="button"
			onclick={() => themeStore.toggle()}
			class="btn-ghost flex h-9 w-9 items-center justify-center rounded-lg shadow-sm"
			title="Toggle Dark / Light Theme"
			aria-label="Toggle Dark / Light Theme"
		>
			{#if themeStore.current === 'dark'}
				<Sun size={16} class="text-amber-400" />
			{:else}
				<Moon size={16} class="text-indigo-600" />
			{/if}
		</button>
	</div>

	<div class="glass-card relative w-full max-w-md overflow-hidden p-8 shadow-2xl">
		<!-- Background glow -->
		<div
			class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
		></div>

		<!-- Brand Header -->
		<div class="mb-8 flex flex-col items-center text-center">
			<div class="gradient-accent mb-3 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg shadow-primary/30">
				<span class="text-xl font-black text-white">G</span>
			</div>
			<h1 class="gradient-accent-text text-2xl font-bold tracking-tight">Gravlytics</h1>
			<p class="mt-1 text-xs text-label">Sign in to your privacy-first analytics dashboard</p>
		</div>

		<!-- Error Alert -->
		{#if form?.error}
			<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-500 dark:text-red-400">
				{form.error}
			</div>
		{/if}

		<!-- Form -->
		<form method="POST" class="flex flex-col gap-4">
			<div>
				<label for="email" class="mb-1.5 block text-xs font-medium text-heading">Email Address</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					bind:value={email}
					placeholder="name@company.com"
					class="w-full rounded-lg border border-themed-strong bg-input px-3.5 py-2.5 text-sm text-heading placeholder:text-hint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
				/>
			</div>

			<div>
				<div class="mb-1.5 flex items-center justify-between">
					<label for="password" class="text-xs font-medium text-heading">Password</label>
					<span class="text-[11px] text-indigo-600 dark:text-accent cursor-pointer hover:underline">Forgot password?</span>
				</div>
				<input
					id="password"
					name="password"
					type="password"
					required
					bind:value={password}
					placeholder="••••••••"
					class="w-full rounded-lg border border-themed-strong bg-input px-3.5 py-2.5 text-sm text-heading placeholder:text-hint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
				/>
			</div>

			<button
				type="submit"
				disabled={isLoading}
				class="gradient-accent mt-2 flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
			>
				Sign In
			</button>
		</form>

		<!-- OAuth Divider -->
		<div class="my-6 flex items-center gap-3">
			<div class="h-px flex-1 border-t border-divider-strong"></div>
			<span class="text-[11px] uppercase tracking-wider text-hint">Or continue with</span>
			<div class="h-px flex-1 border-t border-divider-strong"></div>
		</div>

		<!-- OAuth Buttons -->
		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="flex items-center justify-center gap-2 rounded-lg border border-themed-strong bg-input hover:bg-card-hover py-2 text-xs font-medium text-heading transition-colors hover:border-primary/50 shadow-sm"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
					/>
				</svg>
				GitHub
			</button>
			<button
				type="button"
				class="flex items-center justify-center gap-2 rounded-lg border border-themed-strong bg-input hover:bg-card-hover py-2 text-xs font-medium text-heading transition-colors hover:border-primary/50 shadow-sm"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24">
					<path
						fill="#EA4335"
						d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
					/>
					<path
						fill="#4285F4"
						d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
					/>
					<path
						fill="#FBBC05"
						d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.1.2-1.9.4-2.7L1.6 6.4C.6 8.4 0 10.6 0 13c0 2.4.6 4.6 1.6 6.6l3.7-4.9z"
					/>
					<path
						fill="#34A853"
						d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.1L1.6 16.1C3.5 19.9 7.4 23 12 23z"
					/>
				</svg>
				Google
			</button>
		</div>

		<!-- Footer Link -->
		<p class="mt-8 text-center text-xs text-label">
			Don't have an account yet?
			<a href="/register" class="font-medium text-indigo-600 dark:text-accent hover:underline">Create an account</a>
		</p>
	</div>
</div>
