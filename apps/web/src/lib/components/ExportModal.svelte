<script lang="ts">
	import {
		Download,
		X,
		FileSpreadsheet,
		FileText,
		Printer,
		FileCode,
		CheckCircle2,
		Calendar
	} from '@lucide/svelte';
	import { siteStore } from '$lib/stores/site.svelte';
	import { dateStore } from '$lib/stores/date.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let selectedFormat = $state<'csv' | 'xlsx' | 'pdf' | 'json'>('xlsx');
	let isExporting = $state(false);
	let successMsg = $state(false);

	async function handleDownload() {
		const siteId = siteStore.activeSiteId;
		if (!siteId) return;

		if (selectedFormat === 'pdf') {
			open = false;
			setTimeout(() => {
				window.print();
			}, 300);
			return;
		}

		isExporting = true;
		successMsg = false;

		try {
			const params = new URLSearchParams({
				siteId,
				format: selectedFormat,
				from: dateStore.from,
				to: dateStore.to
			});

			const url = `/api/export?${params.toString()}`;
			const res = await fetch(url);
			if (res.ok) {
				const blob = await res.blob();
				const dlUrl = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = dlUrl;
				const ext = selectedFormat === 'xlsx' ? 'xls' : selectedFormat;
				a.download = `gravlytics_${siteId}_${dateStore.from}_${dateStore.to}.${ext}`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(dlUrl);

				successMsg = true;
				setTimeout(() => {
					open = false;
					successMsg = false;
				}, 1200);
			}
		} catch (err) {
			console.error('Export download error:', err);
		} finally {
			isExporting = false;
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
		<div class="relative w-full max-w-lg rounded-2xl border border-themed bg-card p-6 shadow-2xl transition-all">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-themed pb-4">
				<div class="flex items-center gap-2.5">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
						<Download size={16} strokeWidth={2} />
					</div>
					<div>
						<h3 class="font-semibold text-sm text-heading">Export Analytics Report</h3>
						<p class="text-[11px] text-hint">Export telemetry metrics for presentation and spreadsheet analysis</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded-md p-1 text-hint hover:text-heading hover:bg-card-hover transition-colors"
					aria-label="Close export dialog"
				>
					<X size={16} />
				</button>
			</div>

			<!-- Active Date Range Banner -->
			<div class="mt-4 flex items-center gap-2 rounded-lg border border-themed bg-input/50 px-3.5 py-2 text-xs">
				<Calendar size={13} class="text-indigo-400 shrink-0" />
				<span class="text-hint">Selected Range:</span>
				<span class="font-mono font-medium text-heading">{dateStore.from} → {dateStore.to}</span>
				<span class="badge-tag ml-auto rounded px-1.5 py-0.5 text-[10px] font-mono">{dateStore.label}</span>
			</div>

			<!-- Format Selection Cards -->
			<div class="mt-4 grid grid-cols-2 gap-2.5">
				<!-- Excel -->
				<button
					type="button"
					onclick={() => (selectedFormat = 'xlsx')}
					class="flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all {selectedFormat === 'xlsx'
						? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
						: 'border-themed bg-input/40 hover:border-indigo-500/30 hover:bg-card-hover'}"
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
							<FileSpreadsheet size={15} />
						</div>
						{#if selectedFormat === 'xlsx'}
							<CheckCircle2 size={14} class="text-indigo-400" />
						{/if}
					</div>
					<div class="mt-1">
						<span class="font-semibold text-xs text-heading">Excel Workbook</span>
						<p class="text-[10px] text-hint mt-0.5">Multi-sheet formatted tables (.xlsx / .xls)</p>
					</div>
				</button>

				<!-- CSV -->
				<button
					type="button"
					onclick={() => (selectedFormat = 'csv')}
					class="flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all {selectedFormat === 'csv'
						? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
						: 'border-themed bg-input/40 hover:border-indigo-500/30 hover:bg-card-hover'}"
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400">
							<FileText size={15} />
						</div>
						{#if selectedFormat === 'csv'}
							<CheckCircle2 size={14} class="text-indigo-400" />
						{/if}
					</div>
					<div class="mt-1">
						<span class="font-semibold text-xs text-heading">CSV File</span>
						<p class="text-[10px] text-hint mt-0.5">Comma-separated UTF-8 tables (.csv)</p>
					</div>
				</button>

				<!-- PDF Printable -->
				<button
					type="button"
					onclick={() => (selectedFormat = 'pdf')}
					class="flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all {selectedFormat === 'pdf'
						? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
						: 'border-themed bg-input/40 hover:border-indigo-500/30 hover:bg-card-hover'}"
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-400">
							<Printer size={15} />
						</div>
						{#if selectedFormat === 'pdf'}
							<CheckCircle2 size={14} class="text-indigo-400" />
						{/if}
					</div>
					<div class="mt-1">
						<span class="font-semibold text-xs text-heading">PDF Report</span>
						<p class="text-[10px] text-hint mt-0.5">Printable executive dashboard summary</p>
					</div>
				</button>

				<!-- JSON -->
				<button
					type="button"
					onclick={() => (selectedFormat = 'json')}
					class="flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all {selectedFormat === 'json'
						? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/10'
						: 'border-themed bg-input/40 hover:border-indigo-500/30 hover:bg-card-hover'}"
				>
					<div class="flex w-full items-center justify-between">
						<div class="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
							<FileCode size={15} />
						</div>
						{#if selectedFormat === 'json'}
							<CheckCircle2 size={14} class="text-indigo-400" />
						{/if}
					</div>
					<div class="mt-1">
						<span class="font-semibold text-xs text-heading">Raw JSON</span>
						<p class="text-[10px] text-hint mt-0.5">Full structured telemetry payload</p>
					</div>
				</button>
			</div>

			<!-- Footer Buttons -->
			<div class="mt-6 flex items-center justify-end gap-2.5 border-t border-themed pt-4">
				<button
					type="button"
					onclick={() => (open = false)}
					class="rounded-lg border border-themed px-3.5 py-1.5 text-xs font-medium text-body hover:bg-card-hover transition-colors"
				>
					Cancel
				</button>

				<button
					type="button"
					disabled={isExporting}
					onclick={handleDownload}
					class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
				>
					{#if isExporting}
						<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
						<span>Exporting...</span>
					{:else if successMsg}
						<CheckCircle2 size={14} />
						<span>Downloaded!</span>
					{:else}
						<Download size={14} />
						<span>Export Now</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
