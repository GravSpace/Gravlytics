<script lang="ts">
	import { User, Check, AlertCircle, Shield, Lock, Mail } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import SettingsTabs from '$lib/components/SettingsTabs.svelte';

	let name = $state('');
	let email = $state('');
	let createdAt = $state('');
	let orgName = $state('');

	let isProfileLoading = $state(true);
	let profileSuccessMsg = $state('');
	let profileErrorMsg = $state('');
	let isSavingProfile = $state(false);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordSuccessMsg = $state('');
	let passwordErrorMsg = $state('');
	let isChangingPassword = $state(false);

	async function loadProfile() {
		try {
			const res = await fetch('/api/user/profile');
			if (res.ok) {
				const data = await res.json();
				if (data.user) {
					name = data.user.name || '';
					email = data.user.email || '';
					createdAt = data.user.createdAt || '';
				}
				if (data.organizations && data.organizations.length > 0) {
					orgName = data.organizations[0].name;
				}
			}
		} catch (err) {
			console.error('Failed to load profile', err);
		} finally {
			isProfileLoading = false;
		}
	}

	async function handleUpdateProfile() {
		profileSuccessMsg = '';
		profileErrorMsg = '';
		isSavingProfile = true;

		try {
			const res = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email })
			});
			const data = await res.json();
			if (res.ok) {
				profileSuccessMsg = 'Profile updated successfully.';
				setTimeout(() => (profileSuccessMsg = ''), 3000);
			} else {
				profileErrorMsg = data.error || 'Failed to update profile.';
			}
		} catch {
			profileErrorMsg = 'Network error while updating profile.';
		} finally {
			isSavingProfile = false;
		}
	}

	async function handleChangePassword() {
		passwordSuccessMsg = '';
		passwordErrorMsg = '';

		if (newPassword !== confirmPassword) {
			passwordErrorMsg = 'New passwords do not match.';
			return;
		}

		if (newPassword.length < 6) {
			passwordErrorMsg = 'New password must be at least 6 characters.';
			return;
		}

		isChangingPassword = true;

		try {
			const res = await fetch('/api/user/profile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword })
			});
			const data = await res.json();
			if (res.ok) {
				passwordSuccessMsg = 'Password changed successfully.';
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
				setTimeout(() => (passwordSuccessMsg = ''), 3000);
			} else {
				passwordErrorMsg = data.error || 'Failed to change password.';
			}
		} catch {
			passwordErrorMsg = 'Network error while changing password.';
		} finally {
			isChangingPassword = false;
		}
	}

	onMount(() => {
		loadProfile();
	});
</script>

<svelte:head>
	<title>Account Profile — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-5 max-w-4xl">
	<!-- Page Header -->
	<div class="flex flex-col">
		<h1 class="text-lg font-bold tracking-tight text-heading">Account Profile</h1>
		<p class="text-xs text-label">Manage your personal account credentials, security, and workspace preferences</p>
	</div>

	<!-- Navigation Tabs -->
	<SettingsTabs />

	<!-- Profile Summary Banner -->
	<div class="rounded-xl border border-themed bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-primary to-cyan-400 text-xl font-bold text-white shadow-md">
				{name ? name.charAt(0).toUpperCase() : 'U'}
			</div>
			<div>
				<h2 class="text-base font-bold text-heading">{name || 'User'}</h2>
				<p class="text-xs text-label font-mono mt-0.5">{email}</p>
				<div class="flex items-center gap-2 mt-1.5">
					<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
						{orgName || 'Workspace Member'}
					</span>
					{#if createdAt}
						<span class="text-[11px] text-label">Member since {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Section 1: Update Profile Details -->
	<div class="rounded-xl border border-themed bg-card p-5 flex flex-col gap-4">
		<div class="flex items-center gap-2 border-b border-themed pb-3">
			<User size={15} class="text-indigo-400" />
			<h2 class="text-xs font-semibold uppercase tracking-wider text-heading">Personal Information</h2>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }} class="flex flex-col gap-3.5 max-w-md">
			{#if profileSuccessMsg}
				<div class="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
					<Check size={14} />
					<span>{profileSuccessMsg}</span>
				</div>
			{/if}
			{#if profileErrorMsg}
				<div class="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
					<AlertCircle size={14} />
					<span>{profileErrorMsg}</span>
				</div>
			{/if}

			<div>
				<label for="prof-name" class="mb-1 block text-[11px] font-medium text-label">Full Name</label>
				<input
					id="prof-name"
					type="text"
					bind:value={name}
					class="w-full rounded-md input-field px-3 py-1.5 text-xs text-heading"
					required
				/>
			</div>

			<div>
				<label for="prof-email" class="mb-1 block text-[11px] font-medium text-label">Email Address</label>
				<input
					id="prof-email"
					type="email"
					bind:value={email}
					class="w-full rounded-md input-field px-3 py-1.5 text-xs text-heading"
					required
				/>
			</div>

			<div class="pt-2">
				<button
					type="submit"
					disabled={isSavingProfile}
					class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
				>
					<Check size={13} />
					<span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
				</button>
			</div>
		</form>
	</div>

	<!-- Section 2: Security & Change Password -->
	<div class="rounded-xl border border-themed bg-card p-5 flex flex-col gap-4">
		<div class="flex items-center gap-2 border-b border-themed pb-3">
			<Lock size={15} class="text-indigo-400" />
			<h2 class="text-xs font-semibold uppercase tracking-wider text-heading">Security & Password</h2>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }} class="flex flex-col gap-3.5 max-w-md">
			{#if passwordSuccessMsg}
				<div class="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
					<Check size={14} />
					<span>{passwordSuccessMsg}</span>
				</div>
			{/if}
			{#if passwordErrorMsg}
				<div class="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
					<AlertCircle size={14} />
					<span>{passwordErrorMsg}</span>
				</div>
			{/if}

			<div>
				<label for="cur-pass" class="mb-1 block text-[11px] font-medium text-label">Current Password</label>
				<input
					id="cur-pass"
					type="password"
					bind:value={currentPassword}
					placeholder="••••••••"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs text-heading"
					required
				/>
			</div>

			<div>
				<label for="new-pass" class="mb-1 block text-[11px] font-medium text-label">New Password</label>
				<input
					id="new-pass"
					type="password"
					bind:value={newPassword}
					placeholder="Minimum 6 characters"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs text-heading"
					required
				/>
			</div>

			<div>
				<label for="conf-pass" class="mb-1 block text-[11px] font-medium text-label">Confirm New Password</label>
				<input
					id="conf-pass"
					type="password"
					bind:value={confirmPassword}
					placeholder="Re-enter new password"
					class="w-full rounded-md input-field px-3 py-1.5 text-xs text-heading"
					required
				/>
			</div>

			<div class="pt-2">
				<button
					type="submit"
					disabled={isChangingPassword}
					class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
				>
					<Shield size={13} />
					<span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
				</button>
			</div>
		</form>
	</div>
</div>
