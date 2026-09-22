<script lang="ts">
	import {
		Sliders,
		Globe,
		Users,
		Key,
		Plus,
		Trash2,
		X,
		Shield,
		Mail,
		User,
		Copy,
		Check,
		Clock,
		AlertCircle
	} from '@lucide/svelte';
	import { onMount } from 'svelte';

	interface MemberItem {
		id: string;
		name: string;
		email: string;
		role: string;
		joinedAt: string;
	}

	interface InvitationItem {
		id: string;
		email: string;
		role: string;
		token: string;
		createdAt: string;
	}

	let organization = $state<{ name: string; slug: string } | null>(null);
	let members = $state<MemberItem[]>([]);
	let invitations = $state<InvitationItem[]>([]);
	let isLoading = $state(true);

	let showInviteModal = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state<'Admin' | 'Editor' | 'Viewer'>('Viewer');
	let isInviting = $state(false);
	let generatedInviteUrl = $state<string | null>(null);
	let copiedLink = $state(false);
	let errorMessage = $state('');

	async function loadTeam() {
		try {
			const res = await fetch('/api/team');
			if (res.ok) {
				const data = await res.json();
				organization = data.organization;
				members = data.members || [];
				invitations = data.invitations || [];
			}
		} catch (err) {
			console.error('Failed to load team', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleSendInvite() {
		if (!inviteEmail || !inviteEmail.includes('@')) return;
		errorMessage = '';
		isInviting = true;

		try {
			const res = await fetch('/api/team', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: inviteEmail, role: inviteRole })
			});
			const data = await res.json();
			if (res.ok) {
				generatedInviteUrl = data.inviteUrl;
				await loadTeam();
			} else {
				errorMessage = data.error || 'Failed to create invitation.';
			}
		} catch {
			errorMessage = 'Network error while sending invitation.';
		} finally {
			isInviting = false;
		}
	}

	async function handleRemoveMember(memberId: string) {
		try {
			const res = await fetch(`/api/team?memberId=${memberId}`, { method: 'DELETE' });
			if (res.ok) {
				await loadTeam();
			}
		} catch (err) {
			console.error('Failed to remove member', err);
		}
	}

	async function handleCancelInvite(inviteId: string) {
		try {
			const res = await fetch(`/api/team?inviteId=${inviteId}`, { method: 'DELETE' });
			if (res.ok) {
				await loadTeam();
			}
		} catch (err) {
			console.error('Failed to cancel invite', err);
		}
	}

	function copyInviteLink(token: string) {
		const origin = typeof window !== 'undefined' ? window.location.origin : '';
		const url = `${origin}/invite/${token}`;
		navigator.clipboard.writeText(url);
		copiedLink = true;
		setTimeout(() => (copiedLink = false), 2000);
	}

	onMount(() => {
		loadTeam();
	});
</script>

<svelte:head>
	<title>Team & Access Control — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-5 max-w-4xl">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
		<div class="flex flex-col">
			<h1 class="text-lg font-bold tracking-tight text-heading">Team & Access Control</h1>
			<p class="text-xs text-label">
				Manage organization members, send invitations, and assign role permissions
			</p>
		</div>
		<button
			onclick={() => {
				showInviteModal = true;
				generatedInviteUrl = null;
				inviteEmail = '';
				errorMessage = '';
			}}
			class="flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors cursor-pointer active:scale-[0.98]"
		>
			<Plus size={14} strokeWidth={2} />
			<span>Invite Member</span>
		</button>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-1.5 border-b border-themed pb-2 text-xs overflow-x-auto no-scrollbar">
		<a href="/settings/profile" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<User size={13} />
			<span>Profile</span>
		</a>
		<a href="/settings" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Sliders size={13} />
			<span>General</span>
		</a>
		<a href="/settings/sites" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Globe size={13} />
			<span>Sites</span>
		</a>
		<a href="/settings/team" class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white shadow-sm whitespace-nowrap shrink-0">
			<Users size={13} />
			<span>Team</span>
		</a>
		<a href="/settings/api-keys" class="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-label hover:text-heading hover:bg-card-hover transition-colors whitespace-nowrap shrink-0">
			<Key size={13} />
			<span>API Keys</span>
		</a>
	</div>

	<!-- Active Organization Info -->
	{#if organization}
		<div class="p-4 rounded-xl border border-themed bg-card flex items-center justify-between">
			<div>
				<span class="text-[10px] font-mono uppercase tracking-wider text-label">Active Workspace</span>
				<h2 class="text-sm font-bold text-heading mt-0.5">{organization.name}</h2>
			</div>
			<span class="px-2.5 py-1 rounded-md bg-canvas border border-themed font-mono text-xs text-label">
				{members.length} {members.length === 1 ? 'member' : 'members'}
			</span>
		</div>
	{/if}

	<!-- Active Members List -->
	<div class="space-y-3">
		<h2 class="text-xs font-semibold uppercase tracking-wider text-heading">Organization Members</h2>

		{#if isLoading}
			<div class="space-y-2">
				{#each Array(3) as _}
					<div class="h-14 rounded-xl bg-card border border-themed animate-pulse"></div>
				{/each}
			</div>
		{:else if members.length > 0}
			<div class="flex flex-col gap-2">
				{#each members as member}
					<div class="flex items-center justify-between card p-3.5 px-4 transition-colors hover:border-indigo-500/30">
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-bold text-white shadow-sm">
								{member.name.charAt(0).toUpperCase()}
							</div>
							<div>
								<div class="flex items-center gap-2">
									<h3 class="text-xs font-semibold text-heading">{member.name}</h3>
									<span
										class="rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase {member.role === 'Owner'
											? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
											: member.role === 'Admin'
											? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
											: member.role === 'Editor'
											? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
											: 'bg-slate-500/15 text-slate-400 border border-slate-500/30'}"
									>
										{member.role}
									</span>
								</div>
								<p class="font-mono text-[11px] text-label mt-0.5">{member.email}</p>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<span class="hidden sm:inline font-mono text-[10px] text-hint">Joined {member.joinedAt}</span>
							{#if member.role !== 'Owner'}
								<button
									onclick={() => handleRemoveMember(member.id)}
									class="flex h-7 w-7 items-center justify-center rounded-md text-label hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
									title="Remove Member"
									aria-label="Remove Member"
								>
									<Trash2 size={13} strokeWidth={1.75} />
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-6 rounded-xl border border-themed bg-card text-center text-xs text-label">
				No members found.
			</div>
		{/if}
	</div>

	<!-- Pending Invitations Section -->
	{#if invitations.length > 0}
		<div class="space-y-3 pt-2">
			<div class="flex items-center gap-2">
				<Clock size={14} class="text-amber-400" />
				<h2 class="text-xs font-semibold uppercase tracking-wider text-heading">Pending Invitations ({invitations.length})</h2>
			</div>

			<div class="flex flex-col gap-2">
				{#each invitations as inv}
					<div class="flex items-center justify-between p-3 px-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
						<div class="flex items-center gap-3">
							<div class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
								<Mail size={13} />
							</div>
							<div>
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-heading font-mono">{inv.email}</span>
									<span class="px-1.5 py-0.2 rounded text-[9px] font-mono border border-amber-500/30 text-amber-400">
										{inv.role}
									</span>
								</div>
								<span class="text-[10px] text-label">Invited {new Date(inv.createdAt).toLocaleDateString()}</span>
							</div>
						</div>

						<div class="flex items-center gap-2">
							<button
								onclick={() => copyInviteLink(inv.token)}
								class="flex items-center gap-1 px-2 py-1 rounded-md border border-themed bg-card text-xs text-label hover:text-heading transition-colors cursor-pointer"
								title="Copy invitation URL"
							>
								{#if copiedLink}
									<Check size={12} class="text-emerald-400" />
									<span class="text-emerald-400 text-[11px]">Copied</span>
								{:else}
									<Copy size={12} />
									<span class="text-[11px]">Copy Link</span>
								{/if}
							</button>

							<button
								onclick={() => handleCancelInvite(inv.id)}
								class="flex h-7 w-7 items-center justify-center rounded-md text-label hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
								title="Cancel invitation"
							>
								<X size={13} />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Invite Member Modal -->
	{#if showInviteModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-100">
			<div class="w-full max-w-md card-modal p-5 flex flex-col gap-4 rounded-xl border border-themed bg-card shadow-2xl">
				<div class="flex items-center justify-between border-b border-themed pb-3">
					<div class="flex items-center gap-2">
						<Mail size={16} class="text-indigo-400" />
						<h2 class="text-sm font-bold text-heading">Invite Team Member</h2>
					</div>
					<button onclick={() => (showInviteModal = false)} class="text-label hover:text-heading cursor-pointer" aria-label="Close">
						<X size={16} />
					</button>
				</div>

				{#if generatedInviteUrl}
					<!-- Success & Copy Link View -->
					<div class="space-y-3">
						<div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
							<Check size={15} />
							<span>Invitation created successfully! Share the link below:</span>
						</div>

						<div class="p-3 rounded-lg bg-canvas border border-themed font-mono text-xs break-all text-heading select-all">
							{generatedInviteUrl}
						</div>

						<div class="flex items-center justify-end gap-2 pt-2">
							<button
								onclick={() => copyInviteLink(generatedInviteUrl ? generatedInviteUrl.split('/invite/')[1] : '')}
								class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
							>
								{#if copiedLink}
									<Check size={13} />
									<span>Link Copied!</span>
								{:else}
									<Copy size={13} />
									<span>Copy Link</span>
								{/if}
							</button>
							<button
								onclick={() => (showInviteModal = false)}
								class="px-3 py-1.5 rounded-lg border border-themed bg-card text-xs text-label hover:text-heading cursor-pointer"
							>
								Done
							</button>
						</div>
					</div>
				{:else}
					<!-- Invite Form -->
					{#if errorMessage}
						<div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
							<AlertCircle size={14} />
							<span>{errorMessage}</span>
						</div>
					{/if}

					<div class="flex flex-col gap-3">
						<div>
							<label for="inv-email" class="mb-1 block text-[11px] font-medium text-label">Email Address</label>
							<input
								id="inv-email"
								type="email"
								bind:value={inviteEmail}
								placeholder="colleague@example.com"
								class="w-full rounded-md input-field px-3 py-1.5 text-xs text-heading"
							/>
						</div>

						<div>
							<label for="inv-role" class="mb-1 block text-[11px] font-medium text-label">Role & Permissions</label>
							<select
								id="inv-role"
								bind:value={inviteRole}
								class="w-full rounded-md input-field px-3 py-1.5 text-xs text-heading cursor-pointer"
							>
								<option value="Admin">Admin (Full Access & Site Management)</option>
								<option value="Editor">Editor (View Stats & Create Goals)</option>
								<option value="Viewer">Viewer (Read-only Analytics)</option>
							</select>
						</div>

						<p class="text-[11px] text-label leading-relaxed mt-1">
							Invited members will receive shared access to all websites under <strong>{organization?.name || 'this workspace'}</strong> once they accept.
						</p>
					</div>

					<div class="flex items-center justify-end gap-2 border-t border-themed pt-3 mt-1">
						<button
							onclick={() => (showInviteModal = false)}
							class="rounded-md border border-themed bg-card px-3 py-1.5 text-xs font-medium text-label hover:text-heading cursor-pointer"
						>
							Cancel
						</button>
						<button
							onclick={handleSendInvite}
							disabled={isInviting || !inviteEmail}
							class="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
						>
							<Mail size={13} />
							<span>{isInviting ? 'Generating...' : 'Create Invite Link'}</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
