<script lang="ts">
	let members = $state([
		{
			id: 'mem-1',
			name: 'Rizal Maulana',
			email: 'rizal@gravlytics.dev',
			role: 'Owner',
			joinedAt: '2026-03-01'
		},
		{
			id: 'mem-2',
			name: 'Sarah Chen',
			email: 'sarah@example.com',
			role: 'Editor',
			joinedAt: '2026-03-12'
		},
		{
			id: 'mem-3',
			name: 'David Kim',
			email: 'david@example.com',
			role: 'Viewer',
			joinedAt: '2026-03-18'
		}
	]);

	let showInviteModal = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state('Viewer');

	function handleInvite() {
		if (!inviteEmail) return;
		members.push({
			id: 'mem_' + Math.random().toString(36).substring(2, 8),
			name: inviteEmail.split('@')[0],
			email: inviteEmail,
			role: inviteRole,
			joinedAt: new Date().toISOString().split('T')[0]
		});
		inviteEmail = '';
		showInviteModal = false;
	}

	function handleRemove(memberId: string) {
		members = members.filter((m) => m.id !== memberId);
	}
</script>

<svelte:head>
	<title>Team & Permissions — Gravlytics</title>
</svelte:head>

<div class="flex flex-col gap-6 max-w-4xl">
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight text-white">Team & Access Control</h1>
			<p class="text-sm text-muted-light">Manage organization members and role-based permissions (RBAC)</p>
		</div>
		<button
			onclick={() => (showInviteModal = true)}
			class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98]"
		>
			+ Invite Member
		</button>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex items-center gap-2 border-b border-ink-border pb-3">
		<a href="/settings" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">General</a>
		<a href="/settings/sites" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">Sites</a>
		<a href="/settings/team" class="rounded-lg bg-ink-lighter px-3.5 py-1.5 text-xs font-semibold text-white">Team</a>
		<a href="/settings/api-keys" class="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-light hover:text-white">API Keys</a>
	</div>

	<!-- Members List -->
	<div class="flex flex-col gap-3">
		{#each members as member}
			<div class="glass-card flex items-center justify-between p-5">
				<div class="flex items-center gap-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-white">
						{member.name.charAt(0).toUpperCase()}
					</div>
					<div>
						<h3 class="text-sm font-semibold text-white">{member.name}</h3>
						<p class="text-xs text-muted-light">{member.email}</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {member.role === 'Owner'
							? 'bg-primary/20 text-primary-light'
							: member.role === 'Editor'
								? 'bg-accent/20 text-accent'
								: 'bg-ink-lighter text-muted-light'}"
					>
						{member.role}
					</span>

					<span class="hidden sm:inline text-[11px] text-muted">Joined {member.joinedAt}</span>

					{#if member.role !== 'Owner'}
						<button
							onclick={() => handleRemove(member.id)}
							class="rounded-lg p-2 text-muted hover:text-red-400 hover:bg-red-500/10"
							title="Remove Member"
						>
							🗑️
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Invite Modal -->
	{#if showInviteModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			<div class="glass-card w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-semibold text-white">Invite Team Member</h2>
					<button onclick={() => (showInviteModal = false)} class="text-muted hover:text-white">✕</button>
				</div>

				<div class="flex flex-col gap-3">
					<div>
						<label for="invite-email" class="mb-1.5 block text-xs font-medium text-muted-light">Email Address</label>
						<input
							id="invite-email"
							type="email"
							bind:value={inviteEmail}
							placeholder="colleague@company.com"
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						/>
					</div>
					<div>
						<label for="invite-role" class="mb-1.5 block text-xs font-medium text-muted-light">Role & Permissions</label>
						<select
							id="invite-role"
							bind:value={inviteRole}
							class="w-full rounded-lg border border-ink-border bg-ink-lighter px-3.5 py-2 text-sm text-white focus:border-primary focus:outline-none"
						>
							<option value="Viewer">Viewer — View analytics only</option>
							<option value="Editor">Editor — Manage sites and goals</option>
							<option value="Owner">Owner — Full administrative control</option>
						</select>
					</div>
				</div>

				<div class="mt-2 flex justify-end gap-2">
					<button
						onclick={() => (showInviteModal = false)}
						class="rounded-lg px-4 py-2 text-xs font-medium text-muted-light hover:bg-ink-lighter"
					>
						Cancel
					</button>
					<button
						onclick={handleInvite}
						class="gradient-accent rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90"
					>
						Send Invite
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
