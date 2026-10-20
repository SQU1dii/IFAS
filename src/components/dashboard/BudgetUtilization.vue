<script setup>
/**
 * BudgetUtilization — shows each active budget with a progress bar,
 * remaining balance, and a colour-coded status badge.
 *
 * status values (computed by mock/real service):
 *   on-track → green bar
 *   warning  → amber bar (≥ 80%)
 *   over     → red bar (≥ 100%)
 */
import BaseProgress from '@/components/common/BaseProgress.vue'
import BaseBadge    from '@/components/common/BaseBadge.vue'
import EmptyState   from '@/components/common/EmptyState.vue'
import { formatCurrency, formatPercent } from '@/utils/format'

const props = defineProps({
  budgets: { type: Array,   default: () => [] },
  loading: { type: Boolean, default: false },
})

function statusBadge(status) {
  return { 'on_track': 'green', 'warning': 'amber', 'over': 'red' }[status] ?? 'neutral'
}

function statusLabel(status) {
  return { 'on_track': 'On track', 'warning': 'Near limit', 'over': 'Over budget' }[status] ?? status
}

function barColor(status) {
  return { 'on_track': 'green', 'warning': 'amber', 'over': 'red' }[status] ?? 'green'
}
</script>

<template>
  <div>
    <!-- Skeleton -->
    <template v-if="loading">
      <div v-for="i in 4" :key="i" class="py-3 border-b border-slate-100 last:border-0 space-y-2">
        <div class="flex justify-between">
          <div class="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
          <div class="h-3.5 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
        <div class="h-2.5 w-full bg-slate-200 rounded-full animate-pulse" />
      </div>
    </template>

    <!-- Empty -->
    <EmptyState
      v-else-if="!budgets.length"
      title="No budgets set"
      message="Create a budget to track your spending against a limit."
      icon="chart"
    >
      <template #action>
        <RouterLink to="/budgets" class="text-sm font-medium text-emerald-600 hover:underline">
          Set up budgets →
        </RouterLink>
      </template>
    </EmptyState>

    <!-- Budget list -->
    <ul v-else class="divide-y divide-slate-100" role="list">
      <li v-for="b in budgets" :key="b.id" class="py-3.5">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm font-medium text-navy-800 truncate">{{ b.category_name }}</span>
            <BaseBadge :variant="statusBadge(b.status)" size="sm">{{ statusLabel(b.status) }}</BaseBadge>
          </div>
          <span class="text-xs text-slate-500 shrink-0 tabular-nums">
            {{ formatCurrency(b.spent) }} / {{ formatCurrency(b.limit) }}
          </span>
        </div>

        <BaseProgress :value="b.spent" :max="b.limit" :color="barColor(b.status)" size="md" />

        <div class="flex justify-between mt-1.5">
          <span class="text-xs text-slate-400">{{ formatPercent(b.utilization) }} used</span>
          <span
            :class="['text-xs font-medium', b.remaining < 0 ? 'text-rose-600' : 'text-slate-500']"
          >
            {{ b.remaining >= 0 ? formatCurrency(b.remaining) + ' left' : formatCurrency(Math.abs(b.remaining)) + ' over' }}
          </span>
        </div>
      </li>
    </ul>

    <!-- View-all link -->
    <div v-if="budgets.length" class="pt-3 border-t border-slate-100 mt-1">
      <RouterLink
        to="/budgets"
        class="flex items-center justify-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        Manage budgets
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </RouterLink>
    </div>
  </div>
</template>
