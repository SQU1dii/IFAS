<script setup>
/**
 * IncomeView — income transactions with source summary and trend.
 *
 * Uses GET /transactions?type=income (via transactionService.list).
 * No separate endpoint — per the backend contract.
 */
import { computed } from 'vue'
import { useTransactionPage } from '@/composables/useTransactionPage'
import { formatCurrency }     from '@/utils/format'

import PageHeader           from '@/components/common/PageHeader.vue'
import BaseButton           from '@/components/common/BaseButton.vue'
import BaseCard             from '@/components/common/BaseCard.vue'
import BaseAlert            from '@/components/common/BaseAlert.vue'
import BaseProgress         from '@/components/common/BaseProgress.vue'
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
} = useTransactionPage('income')

// Top income source for the subtitle
const topSource = computed(() =>
  categorySummary.value.length ? categorySummary.value[0].name : null
)

// Max amount for the category bar widths
const maxCatAmount = computed(() =>
  categorySummary.value.length ? categorySummary.value[0].amount : 1
)
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader
      title="Income"
      :subtitle="topSource ? `Top source: ${topSource}` : 'All income transactions'"
    >
      <template #actions>
        <BaseButton variant="primary" size="sm" @click="openAdd">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Record income
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Summary + Category breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

      <!-- Total card -->
      <div class="card-pad flex items-center gap-4">
        <span class="shrink-0 h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
          <svg class="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
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
          <h2 class="section-title">By income source</h2>
          <p class="muted mt-0.5">Current page · transfers excluded</p>
        </div>
        <div class="px-5 py-3 space-y-3">
          <div v-if="!categorySummary.length" class="py-4 text-center text-sm text-slate-400">
            No data for current filters.
          </div>
          <div v-for="cat in categorySummary.slice(0, 6)" :key="cat.name">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm text-navy-700">{{ cat.name }}</span>
              <span class="text-sm font-semibold text-emerald-700 tabular-nums">
                {{ formatCurrency(cat.amount) }}
              </span>
            </div>
            <BaseProgress
              :value="cat.amount"
              :max="maxCatAmount"
              color="green"
              size="sm"
            />
          </div>
        </div>
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
        <h2 class="section-title">Income history</h2>
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

    <!-- Add / Edit modal — type pre-locked to income -->
    <TransactionModal
      :open="modalOpen"
      :transaction="editTarget ?? { type: 'income' }"
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
      title="Delete income entry"
      :message="deleteTarget ? 'Delete &quot;' + deleteTarget.description + '&quot;? This cannot be undone.' : ''"
      @close="closeDelete"
      @confirm="handleDelete"
    />

  </div>
</template>
