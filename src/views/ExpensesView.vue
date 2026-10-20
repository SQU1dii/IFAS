<script setup>
/**
 * ExpensesView — expense transactions with category breakdown and spending summary.
 *
 * Uses GET /transactions?type=expense (via transactionService.list).
 * No separate endpoint — per the backend contract.
 */
import { computed } from 'vue'
import { useTransactionPage } from '@/composables/useTransactionPage'
import { formatCurrency, formatPercent } from '@/utils/format'

import PageHeader           from '@/components/common/PageHeader.vue'
import BaseButton           from '@/components/common/BaseButton.vue'
import BaseCard             from '@/components/common/BaseCard.vue'
import BaseAlert            from '@/components/common/BaseAlert.vue'
import BaseProgress         from '@/components/common/BaseProgress.vue'
import BaseBadge            from '@/components/common/BaseBadge.vue'
import TransactionFilterBar from '@/components/transactions/TransactionFilterBar.vue'
import TransactionTable     from '@/components/transactions/TransactionTable.vue'
import TransactionModal     from '@/components/transactions/TransactionModal.vue'
import DeleteConfirmModal   from '@/components/transactions/DeleteConfirmModal.vue'

const {
  categories, accounts, filters, page,
  transactions, meta, loading, fetchError, load,
  categorySummary, pageTotal,
  modalOpen, editTarget, modalLoading, modalApiError, modalFieldErrs,
  openAdd, openEdit, closeModal, handleSave,
  deleteTarget, deleteLoading, deleteError,
  openDelete, closeDelete, handleDelete,
} = useTransactionPage('expense')

const topCategory = computed(() =>
  categorySummary.value.length ? categorySummary.value[0].name : null
)

const maxCatAmount = computed(() =>
  categorySummary.value.length ? categorySummary.value[0].amount : 1
)

// Percentage of page total for each category
function catPct(amount) {
  return pageTotal.value > 0 ? (amount / pageTotal.value) * 100 : 0
}
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader
      title="Expenses"
      :subtitle="topCategory ? `Largest category: ${topCategory}` : 'All expense transactions'"
    >
      <template #actions>
        <BaseButton variant="primary" size="sm" @click="openAdd">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Record expense
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Summary + Category breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <!-- Total card -->
      <div class="card-pad flex items-center gap-4">
        <span class="shrink-0 h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center">
          <svg class="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
          </svg>
        </span>
        <div>
          <p class="text-xs text-slate-500 font-medium uppercase tracking-wide">Page total</p>
          <p class="text-2xl font-bold text-navy-800 mt-0.5">{{ formatCurrency(pageTotal) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">
            {{ meta.total ?? 0 }} transaction{{ meta.total !== 1 ? 's' : '' }} total
          </p>
        </div>
      </div>

      <!-- Category breakdown -->
      <BaseCard class="lg:col-span-2" no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 class="section-title">By category</h2>
          <p class="muted mt-0.5">Current page · transfers excluded</p>
        </div>

        <div v-if="!categorySummary.length" class="px-5 py-6 text-center text-sm text-slate-400">
          No data for current filters.
        </div>

        <ul v-else class="divide-y divide-slate-100">
          <li
            v-for="cat in categorySummary.slice(0, 7)"
            :key="cat.name"
            class="px-5 py-3"
          >
            <div class="flex items-center justify-between mb-1.5 gap-3">
              <span class="text-sm text-navy-700 truncate">{{ cat.name }}</span>
              <div class="flex items-center gap-2 shrink-0">
                <BaseBadge variant="neutral" size="sm">{{ formatPercent(catPct(cat.amount)) }}</BaseBadge>
                <span class="text-sm font-semibold text-navy-800 tabular-nums w-24 text-right">
                  {{ formatCurrency(cat.amount) }}
                </span>
              </div>
            </div>
            <BaseProgress
              :value="cat.amount"
              :max="maxCatAmount"
              color="red"
              size="sm"
            />
          </li>
        </ul>
      </BaseCard>
    </div>

    <!-- Filters -->
    <TransactionFilterBar
      v-model="filters"
      :categories="categories"
      :accounts="accounts"
      :hide-type="true"
    />

    <!-- Fetch error -->
    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">
      {{ fetchError }}
    </BaseAlert>

    <!-- Transactions table -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-1 flex items-center justify-between border-b border-slate-100">
        <h2 class="section-title">Expense history</h2>
        <p v-if="!loading && meta?.total" class="text-xs text-slate-400">
          Page {{ meta.page }} of {{ meta.total_pages }}
        </p>
      </div>
      <div class="p-4">
        <TransactionTable
          :transactions="transactions"
          :loading="loading"
          :meta="meta"
          @edit="openEdit"
          @delete="openDelete"
          @page="(p) => (page = p)"
        />
      </div>
    </BaseCard>

    <!-- Add / Edit modal — type pre-locked to expense -->
    <TransactionModal
      :open="modalOpen"
      :transaction="editTarget ?? { type: 'expense' }"
      :categories="categories"
      :accounts="accounts"
      :loading="modalLoading"
      :api-error="modalApiError"
      :field-errors="modalFieldErrs"
      @close="closeModal"
      @submit="handleSave"
    />

    <!-- Delete confirm -->
    <DeleteConfirmModal
      :open="!!deleteTarget"
      :loading="deleteLoading"
      title="Delete expense"
      :message="deleteTarget ? 'Delete &quot;' + deleteTarget.description + '&quot;? This cannot be undone.' : ''"
      @close="closeDelete"
      @confirm="handleDelete"
    />

  </div>
</template>
