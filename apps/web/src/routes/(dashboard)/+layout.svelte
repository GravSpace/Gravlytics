<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';

	let { children }: { children: Snippet } = $props();

	let sidebarCollapsed = $state(false);
</script>

<div class="flex h-screen overflow-hidden">
	<!-- Sidebar -->
	<Sidebar bind:collapsed={sidebarCollapsed} />

	<!-- Main content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<Header {sidebarCollapsed} />
		<main class="flex-1 overflow-y-auto p-6">
			{@render children()}
		</main>
	</div>
</div>
