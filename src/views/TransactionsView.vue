<script setup>
/**
 * TransactionsView — full transactions management page.
 *
 * Features:
 *  • Searchable / filterable table (type, category, account, date range)
 *  • Add, edit, delete via modals
 *  • Transfer entries show source → destination and hide category
 *  • CSV import via 3-step wizard
 *  • Pagination driven by the backend meta object
 *  • All data from transactionService — never hardcoded
 */
import { ref, reactive, watch, onMounted, computed } from 'vue'
import transactionService from '@/services/transactionService'
import authService        from '@/services/authService'

import PageHeader           from '@/components/common/PageHeader.vue'
import BaseButton           from '@/components/common/BaseButton.vue'
import BaseCard             from '@/components/common/BaseCard.vue'
import BaseAlert            from '@/components/common/BaseAlert.vue'
import TransactionFilterBar from '@/components/transactions/TransactionFilterBar.vue'
import TransactionTable     from '@/components/transactions/TransactionTable.vue'
import TransactionModal     from '@/components/transactions/TransactionModal.vue'
import DeleteConfirmModal   from '@/components/transactions/DeleteConfirmModal.vue'
import CsvImportWizard      from '@/components/transactions/CsvImportWizard.vue'

// ── Reference data ────────────────────────────────────────
const categories = ref([])
const accounts   = ref([])

async function loadReference() {
  try {
    const [cats, accs] = await Promise.all([
      authService.getCategories(),
      authService.getAccounts(),
    ])
    categories.value = cats
    accounts.value   = accs
  } catch { /* non-critical — selects will be empty */ }
}

// ── Filter state ──────────────────────────────────────────
const filters = reactive({
  search: '', type: '', category_id: '', account_id: '', from: '', to: '',
})
const page = ref(1)

// ── Transactions ──────────────────────────────────────────
const transactions = ref([])
const meta         = ref({})
const loading      = ref(false)
const fetchError   = ref('')

async function load() {
  loading.value    = true
  fetchError.value = ''
  try {
    const res = await transactionService.list({
      page:        page.value,
      page_size:   15,
      search:      filters.search   || undefined,
      type:        filters.type     || undefined,
      category_id: filters.category_id || undefined,
      account_id:  filters.account_id  || undefined,
      from:        filters.from     || undefined,
      to:          filters.to       || undefined,
    })
    transactions.value = res.data
    meta.value         = res.meta ?? {}
  } catch (err) {
    fetchError.value = err?.message ?? 'Failed to load transactions.'
  } finally {
    loading.value = false
  }
}

// Debounce search; immediate on other filter changes.
let searchTimer = null
watch(() => filters.search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 350)
})
watch(
  () => [filters.type, filters.category_id, filters.account_id, filters.from, filters.to],
  () => { page.value = 1; load() }
)
watch(page, load)

onMounted(() => { loadReference(); load() })

// ── Add / Edit modal ──────────────────────────────────────
const modalOpen      = ref(false)
const editTarget     = ref(null)
const modalLoading   = ref(false)
const modalApiError  = ref('')
const modalFieldErrs = ref({})

function openAdd()       { editTarget.value = null; modalApiError.value = ''; modalFieldErrs.value = {}; modalOpen.value = true }
function openEdit(txn)   { editTarget.value = txn;  modalApiError.value = ''; modalFieldErrs.value = {}; modalOpen.value = true }
function closeModal()    { modalOpen.value = false }

async function handleSave(payload) {
  modalLoading.value   = true
  modalApiError.value  = ''
  modalFieldErrs.value = {}
  try {
    if (editTarget.value) {
      await transactionService.update(editTarget.value.id, payload)
    } else {
      await transactionService.create(payload)
    }
    closeModal()
    load()
  } catch (err) {
    modalApiError.value  = err?.message ?? 'Save failed.'
    modalFieldErrs.value = err?.fieldErrors ?? {}
  } finally {
    modalLoading.value = false
  }
}

// ── Delete modal ──────────────────────────────────────────
const deleteTarget  = ref(null)
const deleteLoading = ref(false)
const deleteError   = ref('')

function openDelete(txn) { deleteTarget.value = txn; deleteError.value = '' }
function closeDelete()   { deleteTarget.value = null }

async function handleDelete() {
  deleteLoading.value = true
  deleteError.value   = ''
  try {
    await transactionService.remove(deleteTarget.value.id)
    closeDelete()
    load()
  } catch (err) {
    deleteError.value = err?.message ?? 'Delete failed.'
  } finally {
    deleteLoading.value = false
  }
}

// ── CSV import ────────────────────────────────────────────
const showCsvWizard = ref(false)

function onImportDone() {
  showCsvWizard.value = false
  page.value = 1
  load()
}

// ── Summary counts (from meta) ────────────────────────────
const totalLabel = computed(() =>
  meta.value?.total != null ? `${meta.value.total.toLocaleString()} transaction${meta.value.total !== 1 ? 's' : ''}` : ''
)
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader title="Transactions" :subtitle="totalLabel">
      <template #actions>
        <BaseButton variant="secondary" size="sm" @click="showCsvWizard = true">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Import CSV
        </BaseButton>
        <BaseButton variant="primary" size="sm" @click="openAdd">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add transaction
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Filter bar -->
    <TransactionFilterBar
      v-model="filters"
      :categories="categories"
      :accounts="accounts"
    />

    <!-- Fetch error -->
    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">
      {{ fetchError }}
    </BaseAlert>

    <!-- Table card -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-1 flex items-center justify-between border-b border-slate-100">
        <h2 class="section-title">All transactions</h2>
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

    <!-- Add / Edit modal -->
    <TransactionModal
      :open="modalOpen"
      :transaction="editTarget"
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
      :message="deleteTarget ? 'Delete &quot;' + deleteTarget.description + '&quot;? This cannot be undone.' : ''"
      @close="closeDelete"
      @confirm="handleDelete"
    />

    <!-- CSV import wizard -->
    <CsvImportWizard
      v-if="showCsvWizard"
      @close="showCsvWizard = false"
      @done="onImportDone"
    />

  </div>
</template>
