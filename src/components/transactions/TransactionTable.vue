<script setup>
/**
 * TransactionTable — paginated, sortable table of transactions.
 *
 * Transfers are visually distinct: shown with a source→destination
 * arrow and a blue "Transfer" badge instead of a category.
 * Amounts are always positive in the data; we sign them for display.
 */
import BaseBadge  from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatCurrency, formatDate } from '@/utils/format'

const props = defineProps({
  transactions: { type: Array,   default: () => [] },
  loading:      { type: Boolean, default: false    },
  meta:         { type: Object,  default: () => ({}) }, // { total, page, page_size, total_pages }
  hideActions:  { type: Boolean, default: false    },
})
const emit = defineEmits(['edit', 'delete', 'page'])

function typeBadge(type) {
  return { income: 'green', expense: 'red', transfer: 'blue' }[type] ?? 'neutral'
}
function typeLabel(type) {
  return { income: 'Income', expense: 'Expense', transfer: 'Transfer' }[type] ?? type
}
function amountClass(type) {
  if (type === 'income')   return 'money-positive font-semibold'
  if (type === 'expense')  return 'money-negative font-semibold'
  return 'text-navy-500 font-medium'
}
function amountPrefix(type) {
  if (type === 'income')  return '+'
  if (type === 'expense') return '−'
  return ''
}

const pages = () => {
  const tp = props.meta?.total_pages ?? 1
  const cp = props.meta?.page ?? 1
  const arr = []
  for (let i = Math.max(1, cp - 2); i <= Math.min(tp, cp + 2); i++) arr.push(i)
  return arr
}
</script>

<template>
  <div>
    <!-- Skeleton -->
    <template v-if="loading">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="i in 8" :key="i" class="border-b border-slate-100">
              <td v-for="j in 6" :key="j" class="px-4 py-3.5">
                <div class="h-3 bg-slate-200 rounded animate-pulse" :style="`width:${40+j*12}%`" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Empty -->
    <EmptyState
      v-else-if="!transactions.length"
      title="No transactions found"
      message="Try adjusting the filters or add a new transaction."
      icon="inbox"
    />

    <!-- Table -->
    <template v-else>
      <div class="overflow-x-auto -mx-1">
        <table class="w-full text-sm" aria-label="Transactions">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Category / Account</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              <th v-if="!hideActions" class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="txn in transactions"
              :key="txn.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                {{ formatDate(txn.date) }}
              </td>

              <td class="px-4 py-3.5">
                <p class="font-medium text-navy-800 truncate max-w-[180px]">{{ txn.description }}</p>
                <p v-if="txn.notes" class="text-xs text-slate-400 truncate max-w-[180px]">{{ txn.notes }}</p>
              </td>

              <td class="px-4 py-3.5 hidden sm:table-cell">
                <BaseBadge :variant="typeBadge(txn.type)" size="sm">{{ typeLabel(txn.type) }}</BaseBadge>
              </td>

              <td class="px-4 py-3.5 hidden md:table-cell">
                <template v-if="txn.type === 'transfer'">
                  <div class="flex items-center gap-1 text-xs text-slate-600">
                    <span class="truncate max-w-[80px]">{{ txn.account_name }}</span>
                    <svg class="h-3 w-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                    <span class="truncate max-w-[80px]">{{ txn.destination_account_name }}</span>
                  </div>
                </template>
                <template v-else>
                  <p class="text-xs text-slate-600 truncate max-w-[140px]">{{ txn.category_name ?? '—' }}</p>
                  <p class="text-xs text-slate-400 truncate max-w-[140px]">{{ txn.account_name }}</p>
                </template>
              </td>

              <td class="px-4 py-3.5 text-right whitespace-nowrap">
                <span :class="amountClass(txn.type)">
                  {{ amountPrefix(txn.type) }}{{ formatCurrency(txn.amount) }}
                </span>
              </td>

              <td v-if="!hideActions" class="px-4 py-3.5 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1">
                  <BaseButton variant="ghost" size="sm" icon-only :aria-label="`Edit ${txn.description}`" @click="emit('edit', txn)">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" icon-only :aria-label="`Delete ${txn.description}`" @click="emit('delete', txn)">
                    <svg class="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="meta?.total_pages > 1"
        class="flex items-center justify-between pt-4 border-t border-slate-100 mt-2"
      >
        <p class="text-xs text-slate-500">
          {{ (meta.page - 1) * meta.page_size + 1 }}–{{ Math.min(meta.page * meta.page_size, meta.total) }}
          of {{ meta.total }} transactions
        </p>
        <div class="flex items-center gap-1">
          <BaseButton
            variant="secondary" size="sm"
            :disabled="meta.page <= 1"
            aria-label="Previous page"
            @click="emit('page', meta.page - 1)"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </BaseButton>
          <button
            v-for="p in pages()"
            :key="p"
            type="button"
            :class="[
              'h-8 w-8 rounded-lg text-xs font-medium transition',
              p === meta.page
                ? 'bg-emerald-600 text-white'
                : 'text-navy-700 hover:bg-slate-100',
            ]"
            :aria-current="p === meta.page ? 'page' : undefined"
            @click="emit('page', p)"
          >{{ p }}</button>
          <BaseButton
            variant="secondary" size="sm"
            :disabled="meta.page >= meta.total_pages"
            aria-label="Next page"
            @click="emit('page', meta.page + 1)"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </BaseButton>
        </div>
      </div>
    </template>
  </div>
</template>
