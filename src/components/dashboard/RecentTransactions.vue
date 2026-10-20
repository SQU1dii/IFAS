<script setup>
/**
 * RecentTransactions — the last N transactions shown on the dashboard.
 * Links through to the full Transactions view.
 *
 * Transfers are visually distinct (blue badge) so they're never confused
 * with real income or expenses.
 */
import { computed } from 'vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatCurrency, formatDateShort } from '@/utils/format'

const props = defineProps({
  transactions: { type: Array, default: () => [] },
  loading:      { type: Boolean, default: false },
})

// Colour and sign logic per transaction type.
function amountClass(t) {
  if (t.type === 'income')   return 'money-positive font-semibold'
  if (t.type === 'expense')  return 'money-negative font-semibold'
  return 'text-navy-500 font-medium'  // transfer
}

function amountPrefix(t) {
  if (t.type === 'income')  return '+'
  if (t.type === 'expense') return '−'
  return ''
}

function badgeVariant(type) {
  return { income: 'green', expense: 'red', transfer: 'blue' }[type] ?? 'neutral'
}

function categoryIcon(t) {
  // Maps category names to a simple emoji fallback for the avatar.
  const map = {
    'Salary': '💼', 'Freelance': '💻', 'Investment Income': '📈', 'Refunds': '↩',
    'Groceries': '🛒', 'Rent & Housing': '🏠', 'Utilities': '💡', 'Transport': '🚗',
    'Dining Out': '🍽', 'Entertainment': '🎬', 'Healthcare': '💊', 'Shopping': '🛍',
    'Subscriptions': '📱', 'Education': '📚', 'Transfer': '↔',
  }
  return map[t.category] ?? '💰'
}
</script>

<template>
  <div>
    <!-- Skeleton rows -->
    <template v-if="loading">
      <div v-for="i in 6" :key="i" class="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
        <div class="h-9 w-9 rounded-xl bg-slate-200 animate-pulse shrink-0" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3.5 w-40 bg-slate-200 rounded animate-pulse" />
          <div class="h-3 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
        <div class="h-4 w-16 bg-slate-200 rounded animate-pulse" />
      </div>
    </template>

    <!-- Empty -->
    <EmptyState
      v-else-if="!transactions.length"
      title="No recent transactions"
      message="Transactions you add will appear here."
      icon="inbox"
    />

    <!-- List -->
    <template v-else>
      <ul class="divide-y divide-slate-100" role="list">
        <li
          v-for="txn in transactions"
          :key="txn.id"
          class="flex items-center gap-3 py-3 group"
        >
          <!-- Category avatar -->
          <span
            class="shrink-0 h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-base"
            aria-hidden="true"
          >
            {{ categoryIcon(txn) }}
          </span>

          <!-- Description + meta -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-navy-800 truncate">{{ txn.description }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-xs text-slate-400">{{ formatDateShort(txn.date) }}</span>
              <span class="text-slate-300" aria-hidden="true">·</span>
              <BaseBadge :variant="badgeVariant(txn.type)" size="sm">
                {{ txn.type === 'transfer' ? 'Transfer' : txn.category }}
              </BaseBadge>
            </div>
          </div>

          <!-- Amount -->
          <span :class="['text-sm shrink-0', amountClass(txn)]">
            {{ amountPrefix(txn) }}{{ formatCurrency(txn.amount) }}
          </span>
        </li>
      </ul>

      <!-- View-all link -->
      <div class="pt-3 border-t border-slate-100 mt-1">
        <RouterLink
          to="/transactions"
          class="flex items-center justify-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 py-1.5 rounded-lg hover:bg-emerald-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          View all transactions
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </RouterLink>
      </div>
    </template>
  </div>
</template>
