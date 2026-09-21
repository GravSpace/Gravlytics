<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let name = $state('');
	let email = $state('');
	let password = $state('');
</script>

<svelte:head>
	<title>Create Account — Gravlytics</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
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
			<p class="mt-1 text-xs text-muted-light">Create your account to start tracking privacy-first web stats</p>
		</div>

		<!-- Error Alert -->
		{#if form?.error}
			<div class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
				{form.error}
			</div>
		{/if}

		<!-- Form -->
		<form method="POST" class="flex flex-col gap-4">
			<div>
				<label for="name" class="mb-1.5 block text-xs font-medium text-muted-light">Full Name</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					bind:value={name}
					placeholder="Alex Rivera"
					class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2.5 text-sm text-white placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
				/>
			</div>

			<div>
				<label for="email" class="mb-1.5 block text-xs font-medium text-muted-light">Email Address</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					bind:value={email}
					placeholder="name@company.com"
					class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2.5 text-sm text-white placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
				/>
			</div>

			<div>
				<label for="password" class="mb-1.5 block text-xs font-medium text-muted-light">Password (min. 8 characters)</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					bind:value={password}
					placeholder="••••••••"
					class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2.5 text-sm text-white placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
				/>
			</div>

			<button
				type="submit"
				class="gradient-accent mt-2 flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 active:scale-[0.99]"
			>
				Create Account
			</button>
		</form>

		<!-- Footer Link -->
		<p class="mt-8 text-center text-xs text-muted-light">
			Already have an account?
			<a href="/login" class="font-medium text-accent hover:underline">Sign in</a>
		</p>
	</div>
</div>
