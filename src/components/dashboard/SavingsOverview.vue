<script setup>
/**
 * SavingsOverview — compact savings goal cards shown on the dashboard.
 * Each goal shows its name, progress bar, saved vs target, and due date.
 */
import BaseProgress from '@/components/common/BaseProgress.vue'
import EmptyState   from '@/components/common/EmptyState.vue'
import { formatCurrency, formatDate } from '@/utils/format'
import { computed } from 'vue'

const props = defineProps({
  goals:   { type: Array,   default: () => [] },
  loading: { type: Boolean, default: false },
})

function pct(goal) {
  return goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
}

function remaining(goal) {
  return Math.max(0, goal.target_amount - goal.current_amount)
}
</script>

<template>
  <div>
    <!-- Skeleton -->
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="py-3 border-b border-slate-100 last:border-0 space-y-2">
        <div class="flex justify-between">
          <div class="h-3.5 w-32 bg-slate-200 rounded animate-pulse" />
          <div class="h-3.5 w-12 bg-slate-200 rounded animate-pulse" />
        </div>
        <div class="h-2.5 w-full bg-slate-100 rounded-full animate-pulse" />
      </div>
    </template>

    <!-- Empty -->
    <EmptyState
      v-else-if="!goals.length"
      title="No savings goals"
      message="Set a goal to start tracking your progress."
      icon="savings"
    >
      <template #action>
        <RouterLink to="/savings" class="text-sm font-medium text-emerald-600 hover:underline">
          Add a goal →
        </RouterLink>
      </template>
    </EmptyState>

    <!-- Goal list -->
    <ul v-else class="divide-y divide-slate-100">
      <li v-for="goal in goals" :key="goal.id" class="py-3.5">
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="text-sm font-medium text-navy-800 truncate">{{ goal.name }}</span>
          <span class="text-xs font-semibold text-emerald-600 shrink-0 tabular-nums">
            {{ Math.round(pct(goal)) }}%
          </span>
        </div>

        <BaseProgress :value="goal.current_amount" :max="goal.target_amount" color="green" size="md" />

        <div class="flex justify-between items-center mt-1.5">
          <span class="text-xs text-slate-500 tabular-nums">
            {{ formatCurrency(goal.current_amount) }} of {{ formatCurrency(goal.target_amount) }}
          </span>
          <span class="text-xs text-slate-400">
            {{ remaining(goal) > 0 ? formatCurrency(remaining(goal)) + ' to go' : '🎉 Reached!' }}
          </span>
        </div>

        <p v-if="goal.targetDate" class="text-xs text-slate-400 mt-1">
          Target date: {{ formatDate(goal.targetDate) }}
        </p>
      </li>
    </ul>

    <div v-if="goals.length" class="pt-3 border-t border-slate-100 mt-1">
      <RouterLink
        to="/savings"
        class="flex items-center justify-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        View all goals
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </RouterLink>
    </div>
  </div>
</template>
