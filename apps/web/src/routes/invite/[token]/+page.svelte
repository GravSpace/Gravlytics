<script lang="ts">
	import { Users, CheckCircle2, ArrowRight, Shield, LogIn, UserPlus } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Team Invitation — {data.invite.orgName} | Gravlytics</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 bg-canvas">
	<div class="w-full max-w-md rounded-2xl border border-themed bg-card p-6 shadow-2xl flex flex-col gap-6 text-center">
		<!-- Brand Logo -->
		<div class="flex flex-col items-center gap-2">
			<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-primary to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
				<div class="flex h-full w-full items-center justify-center rounded-[15px]" style="background: var(--logo-inner-bg);">
					<span class="font-mono text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-primary to-cyan-200">G</span>
				</div>
			</div>
			<span class="text-sm font-semibold tracking-tight text-heading">Gravlytics</span>
		</div>

		<!-- Invite Header -->
		<div class="space-y-1.5">
			<h1 class="text-xl font-bold text-heading">You're Invited to Join</h1>
			<p class="text-base font-semibold text-indigo-400 font-mono">{data.invite.orgName}</p>
			<p class="text-xs text-label leading-relaxed">
				<strong>{data.invite.inviterName}</strong> has invited you to collaborate as <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">{data.invite.role}</span>.
			</p>
		</div>

		<!-- Details Card -->
		<div class="rounded-xl border border-themed bg-canvas/60 p-4 text-left space-y-2 text-xs">
			<div class="flex items-center justify-between">
				<span class="text-label">Invited Email:</span>
				<span class="font-mono text-heading font-medium">{data.invite.email}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-label">Assigned Role:</span>
				<span class="font-medium text-heading">{data.invite.role}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-label">Shared Access:</span>
				<span class="text-emerald-400 font-medium">All Organization Websites</span>
			</div>
		</div>

		<!-- Action Section -->
		{#if data.user}
			<form method="POST" onsubmit={() => (isSubmitting = true)}>
				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
				>
					<span>{isSubmitting ? 'Joining Team...' : 'Accept Invitation & Access Sites'}</span>
					<ArrowRight size={14} />
				</button>
			</form>
			<p class="text-[11px] text-label">
				Logged in as <strong class="text-heading">{data.user.email}</strong>.
			</p>
		{:else}
			<div class="flex flex-col gap-2.5">
				<a
					href="/login?redirect=/invite/{data.invite.token}"
					class="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
				>
					<LogIn size={14} />
					<span>Sign In to Accept</span>
				</a>
				<a
					href="/register?redirect=/invite/{data.invite.token}"
					class="w-full flex items-center justify-center gap-2 rounded-xl border border-themed bg-card py-2.5 text-xs font-medium text-heading hover:bg-card-hover transition-all"
				>
					<UserPlus size={14} />
					<span>Create Account to Accept</span>
				</a>
			</div>
		{/if}
	</div>
</div>
