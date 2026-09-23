<script lang="ts">
	import { page } from '$app/stores';
	import { User, Sliders, Globe, Users, Shield, Lock, Key } from '@lucide/svelte';

	interface Props {
		activeTab?: string;
	}

	let { activeTab }: Props = $props();

	const tabs = [
		{ id: 'profile', label: 'Profile', href: '/settings/profile', icon: User },
		{ id: 'general', label: 'General', href: '/settings', icon: Sliders },
		{ id: 'sites', label: 'Sites', href: '/settings/sites', icon: Globe },
		{ id: 'team', label: 'Team', href: '/settings/team', icon: Users },
		{ id: 'alerts', label: 'Alerts', href: '/settings/alerts', icon: Shield },
		{ id: 'audit', label: 'Audit Log', href: '/settings/audit', icon: Lock },
		{ id: 'api-keys', label: 'API Keys', href: '/settings/api-keys', icon: Key }
	];

	function isCurrent(tab: (typeof tabs)[0], path: string): boolean {
		if (activeTab) {
			return activeTab === tab.id || activeTab === tab.href;
		}
		if (tab.href === '/settings') {
			return path === '/settings';
		}
		return path === tab.href || path.startsWith(tab.href + '/');
	}
</script>

<div
	class="border-themed no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b pb-2 text-xs"
>
	{#each tabs as tab (tab.id)}
		{@const active = isCurrent(tab, $page.url.pathname)}
		<a
			href={tab.href}
			class={active
				? 'flex shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 font-semibold whitespace-nowrap text-white shadow-sm'
				: 'text-label hover:text-heading hover:bg-card-hover flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-medium whitespace-nowrap transition-colors'}
		>
			<tab.icon size={13} />
			<span>{tab.label}</span>
		</a>
	{/each}
</div>
