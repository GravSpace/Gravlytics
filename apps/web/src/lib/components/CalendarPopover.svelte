<script lang="ts">
	import {
		Calendar as CalendarIcon,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		Check,
		Filter,
		X
	} from '@lucide/svelte';
	import { dateStore, type DatePreset } from '$lib/stores/date.svelte';

	let isOpen = $state(false);

	// Calendar state
	const today = new Date();
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth()); // 0-11

	let tempFrom = $state(dateStore.from);
	let tempTo = $state(dateStore.to);
	let hoverDate = $state<string | null>(null);
	let isSelectingEnd = $state(false);

	const MONTH_NAMES = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	const presets: { id: DatePreset; label: string }[] = [
		{ id: 'today', label: 'Today' },
		{ id: 'yesterday', label: 'Yesterday' },
		{ id: '7d', label: 'Last 7 days' },
		{ id: '30d', label: 'Last 30 days' },
		{ id: '90d', label: 'Last 90 days' },
		{ id: '12m', label: 'Last 12 months' }
	];

	function formatDateStr(y: number, m: number, d: number): string {
		const month = String(m + 1).padStart(2, '0');
		const day = String(d).padStart(2, '0');
		return `${y}-${month}-${day}`;
	}

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear--;
		} else {
			viewMonth--;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear++;
		} else {
			viewMonth++;
		}
	}

	function selectPreset(preset: DatePreset) {
		dateStore.setPreset(preset);
		tempFrom = dateStore.from;
		tempTo = dateStore.to;
		isOpen = false;
	}

	function handleDateClick(dateStr: string) {
		if (!isSelectingEnd || !tempFrom) {
			tempFrom = dateStr;
			tempTo = '';
			isSelectingEnd = true;
		} else {
			if (dateStr < tempFrom) {
				tempTo = tempFrom;
				tempFrom = dateStr;
			} else {
				tempTo = dateStr;
			}
			isSelectingEnd = false;
		}
	}

	function handleDateHover(dateStr: string) {
		if (isSelectingEnd && tempFrom) {
			hoverDate = dateStr;
		}
	}

	function applyCustomRange() {
		if (tempFrom) {
			const finalTo = tempTo || tempFrom;
			dateStore.setCustomRange(tempFrom, finalTo);
			isOpen = false;
			isSelectingEnd = false;
		}
	}

	// Calculate calendar grid days
	let calendarDays = $derived.by(() => {
		const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

		const days: {
			day: number;
			dateStr: string;
			isCurrentMonth: boolean;
			isToday: boolean;
		}[] = [];

		// Days from previous month
		for (let i = firstDayOfMonth - 1; i >= 0; i--) {
			const d = daysInPrevMonth - i;
			const m = viewMonth === 0 ? 11 : viewMonth - 1;
			const y = viewMonth === 0 ? viewYear - 1 : viewYear;
			days.push({
				day: d,
				dateStr: formatDateStr(y, m, d),
				isCurrentMonth: false,
				isToday: false
			});
		}

		// Days of current month
		const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = formatDateStr(viewYear, viewMonth, d);
			days.push({
				day: d,
				dateStr,
				isCurrentMonth: true,
				isToday: dateStr === todayStr
			});
		}

		// Days from next month to fill remaining grid cells (up to 35 or 42)
		const totalNeeded = days.length <= 35 ? 35 : 42;
		const nextMonthDays = totalNeeded - days.length;
		for (let d = 1; d <= nextMonthDays; d++) {
			const m = viewMonth === 11 ? 0 : viewMonth + 1;
			const y = viewMonth === 11 ? viewYear + 1 : viewYear;
			days.push({
				day: d,
				dateStr: formatDateStr(y, m, d),
				isCurrentMonth: false,
				isToday: false
			});
		}

		return days;
	});

	function isRangeStart(dateStr: string): boolean {
		return tempFrom === dateStr;
	}

	function isRangeEnd(dateStr: string): boolean {
		if (tempTo) return tempTo === dateStr;
		if (isSelectingEnd && hoverDate) return hoverDate === dateStr;
		return false;
	}

	function isInRange(dateStr: string): boolean {
		if (tempFrom && tempTo) {
			return dateStr > tempFrom && dateStr < tempTo;
		}
		if (isSelectingEnd && tempFrom && hoverDate) {
			const min = tempFrom < hoverDate ? tempFrom : hoverDate;
			const max = tempFrom < hoverDate ? hoverDate : tempFrom;
			return dateStr > min && dateStr < max;
		}
		return false;
	}
</script>

<div class="relative">
	<!-- Trigger Button -->
	<button
		onclick={() => {
			isOpen = !isOpen;
			if (isOpen) {
				tempFrom = dateStore.from;
				tempTo = dateStore.to;
				isSelectingEnd = false;
				if (dateStore.from) {
					const [y, m] = dateStore.from.split('-').map(Number);
					if (y && m) {
						viewYear = y;
						viewMonth = m - 1;
					}
				}
			}
		}}
		class="btn-ghost flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none shadow-sm cursor-pointer hover:border-themed-strong transition-all"
		title="Filter date range"
		aria-expanded={isOpen}
	>
		<CalendarIcon size={13} class="text-indigo-400 shrink-0" />
		<span class="font-medium text-heading">{dateStore.label}</span>
		<ChevronDown size={12} class="text-label shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" />
	</button>

	{#if isOpen}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-40"
			onclick={() => (isOpen = false)}
			role="presentation"
		></div>

		<!-- Shadcn/ui Datepicker Modal -->
		<div
			class="card-modal absolute right-0 top-full mt-2 z-50 flex flex-col md:flex-row shadow-2xl rounded-xl border border-themed bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-100"
		>
			<!-- Presets Sidebar -->
			<div class="w-full md:w-44 p-3 border-b md:border-b-0 md:border-r border-themed bg-canvas/40 flex flex-col gap-1">
				<div class="text-[11px] font-semibold text-heading px-2 py-1 mb-1 flex items-center gap-1.5">
					<Filter size={12} class="text-indigo-400" />
					<span>Presets</span>
				</div>
				{#each presets as preset}
					{@const isSelected = dateStore.preset === preset.id}
					<button
						onclick={() => selectPreset(preset.id)}
						class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer {isSelected
							? 'bg-indigo-600 text-white font-semibold shadow-sm'
							: 'text-label hover:text-heading hover:bg-card-hover font-medium'}"
					>
						{preset.label}
					</button>
				{/each}

				<!-- Period Comparison Toggle Section -->
				<div class="mt-2.5 pt-2.5 border-t border-themed flex flex-col gap-1.5 px-1">
					<span class="text-[10px] font-semibold uppercase tracking-wider text-hint">Comparison</span>
					<label class="flex items-center gap-2 text-xs text-heading cursor-pointer select-none">
						<input
							type="checkbox"
							checked={dateStore.compareMode !== 'none'}
							onchange={(e) => {
								const checked = (e.target as HTMLInputElement).checked;
								dateStore.setCompareMode(checked ? 'previous_period' : 'none');
							}}
							class="rounded border-themed text-indigo-600 focus:ring-indigo-500 cursor-pointer"
						/>
						<span>Compare Range</span>
					</label>

					{#if dateStore.compareMode !== 'none'}
						<div class="mt-1 flex flex-col gap-1 pl-4 text-[11px] text-body">
							<label class="flex items-center gap-1.5 cursor-pointer">
								<input
									type="radio"
									name="compareType"
									value="previous_period"
									checked={dateStore.compareMode === 'previous_period'}
									onchange={() => dateStore.setCompareMode('previous_period')}
									class="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
								/>
								<span>Prev. Period</span>
							</label>
							<label class="flex items-center gap-1.5 cursor-pointer">
								<input
									type="radio"
									name="compareType"
									value="previous_year"
									checked={dateStore.compareMode === 'previous_year'}
									onchange={() => dateStore.setCompareMode('previous_year')}
									class="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
								/>
								<span>Previous Year</span>
							</label>
						</div>
					{/if}
				</div>
			</div>

			<!-- Interactive Calendar Grid (shadcn/ui style) -->
			<div class="p-4 flex flex-col gap-3 min-w-[280px] sm:min-w-[320px]">
				<!-- Calendar Header (Month / Year & Navigation) -->
				<div class="flex items-center justify-between pb-1 border-b border-themed">
					<span class="text-xs font-bold text-heading font-mono">
						{MONTH_NAMES[viewMonth]} {viewYear}
					</span>
					<div class="flex items-center gap-1">
						<button
							onclick={prevMonth}
							class="p-1 rounded-md text-label hover:text-heading hover:bg-card-hover transition-colors cursor-pointer"
							title="Previous month"
						>
							<ChevronLeft size={15} />
						</button>
						<button
							onclick={nextMonth}
							class="p-1 rounded-md text-label hover:text-heading hover:bg-card-hover transition-colors cursor-pointer"
							title="Next month"
						>
							<ChevronRight size={15} />
						</button>
					</div>
				</div>

				<!-- Days of Week Header -->
				<div class="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-label">
					{#each DAY_NAMES as dayName}
						<div class="py-0.5">{dayName}</div>
					{/each}
				</div>

				<!-- Days Matrix Grid -->
				<div class="grid grid-cols-7 gap-1 outline-none" onmouseleave={() => (hoverDate = null)} role="grid" tabindex="0" aria-label="Date Calendar">
					{#each calendarDays as cell}
						{@const isStart = isRangeStart(cell.dateStr)}
						{@const isEnd = isRangeEnd(cell.dateStr)}
						{@const inRange = isInRange(cell.dateStr)}
						<button
							onclick={() => handleDateClick(cell.dateStr)}
							onmouseenter={() => handleDateHover(cell.dateStr)}
							disabled={!cell.isCurrentMonth}
							class="h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-md font-mono transition-all cursor-pointer select-none relative {isStart || isEnd
								? 'bg-indigo-600 text-white font-bold shadow-md z-10'
								: inRange
								? 'bg-primary/15 text-primary font-semibold rounded-none'
								: cell.isCurrentMonth
								? 'text-heading hover:bg-card-hover'
								: 'text-label/30 cursor-not-allowed opacity-30'} {cell.isToday && !isStart && !isEnd ? 'border border-primary/40 text-primary font-semibold' : ''}"
						>
							{cell.day}
						</button>
					{/each}
				</div>

				<!-- Selected Range Display & Action Footer -->
				<div class="pt-3 border-t border-themed flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
					<div class="text-[11px] text-label font-mono">
						{#if tempFrom}
							<span class="text-heading font-medium">{tempFrom}</span>
							{#if tempTo && tempTo !== tempFrom}
								<span> &rarr; </span>
								<span class="text-heading font-medium">{tempTo}</span>
							{:else if isSelectingEnd}
								<span class="text-indigo-400 animate-pulse"> (select end date)</span>
							{/if}
						{:else}
							<span>Select date range</span>
						{/if}
					</div>

					<div class="flex items-center gap-2 justify-end">
						<button
							onclick={() => (isOpen = false)}
							class="px-2.5 py-1 text-xs text-label hover:text-heading rounded-md border border-themed bg-card cursor-pointer"
						>
							Cancel
						</button>
						<button
							onclick={applyCustomRange}
							disabled={!tempFrom}
							class="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors cursor-pointer disabled:opacity-50"
						>
							<Check size={12} />
							<span>Apply Range</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
