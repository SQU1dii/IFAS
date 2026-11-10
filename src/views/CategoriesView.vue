<script setup>
/**
 * CategoriesView — manage income and expense categories.
 * Create, rename, and delete categories. Grouped by type.
 *
 * Backend contract: CATEGORY_TYPES = ['INCOME', 'EXPENSE'] (uppercase).
 * The form sends uppercase type values to match the backend validator.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import categoryService from '@/services/categoryService'
import { runRules, required, minLength } from '@/utils/validation'

import PageHeader         from '@/components/common/PageHeader.vue'
import BaseButton          from '@/components/common/BaseButton.vue'
import BaseCard            from '@/components/common/BaseCard.vue'
import BaseAlert           from '@/components/common/BaseAlert.vue'
import BaseInput           from '@/components/common/BaseInput.vue'
import BaseSelect          from '@/components/common/BaseSelect.vue'
import BaseBadge           from '@/components/common/BaseBadge.vue'
import BaseSpinner         from '@/components/common/BaseSpinner.vue'
import EmptyState          from '@/components/common/EmptyState.vue'
import DeleteConfirmModal  from '@/components/transactions/DeleteConfirmModal.vue'

const ws = useWorkspaceStore()

const allCats      = ref([])
const loading      = ref(false)
const fetchError   = ref('')

// Backend returns type as uppercase ('INCOME' / 'EXPENSE') — normalise for display
const incomeCats  = computed(() => allCats.value.filter((c) => (c.type || '').toUpperCase() === 'INCOME'))
const expenseCats = computed(() => allCats.value.filter((c) => (c.type || '').toUpperCase() === 'EXPENSE'))

async function load() {
  loading.value = true; fetchError.value = ''
  try { allCats.value = await categoryService.list() }
  catch (e) { fetchError.value = e?.message ?? 'Failed to load categories.' }
  finally   { loading.value = false }
}
onMounted(load)

// ── Add / Edit modal ──────────────────────────────────────
const modalOpen    = ref(false)
const editTarget   = ref(null)
const formLoading  = ref(false)
const formApiError = ref('')

// type is uppercase to match backend CATEGORY_TYPES
const blank = () => ({ name: '', type: 'EXPENSE' })
const form    = reactive(blank())
const touched = reactive({})

// Backend accepts 'INCOME' or 'EXPENSE' (uppercase)
const typeOptions = [
  { value: 'INCOME',  label: 'Income'  },
  { value: 'EXPENSE', label: 'Expense' },
]

const errors = computed(() => ({
  name: runRules(form.name, [[required, 'Category name is required'], [minLength, 'Name must be at least 2 characters', 2]]),
  type: runRules(form.type, [[required, 'Type is required']]),
}))
const fieldErr = (f) => touched[f] ? (errors.value[f] || '') : ''
const isValid = computed(() => !errors.value.name && !errors.value.type)

function openAdd(type = 'EXPENSE') {
  editTarget.value = null
  Object.assign(form, { name: '', type })
  Object.keys(touched).forEach((k) => delete touched[k])
  formApiError.value = ''; modalOpen.value = true
}
function openEdit(cat) {
  editTarget.value = cat
  // Ensure type is uppercase for the form
  Object.assign(form, { name: cat.name, type: (cat.type || 'EXPENSE').toUpperCase() })
  Object.keys(touched).forEach((k) => delete touched[k])
  formApiError.value = ''; modalOpen.value = true
}
function closeModal() { modalOpen.value = false }

async function handleSave() {
  Object.keys(errors.value).forEach((k) => (touched[k] = true))
  if (!isValid.value) return
  formLoading.value = true; formApiError.value = ''
  try {
    if (editTarget.value) {
      const updated = await categoryService.update(editTarget.value.id, { name: form.name.trim() })
      const idx = allCats.value.findIndex((c) => c.id === editTarget.value.id)
      if (idx !== -1) allCats.value[idx] = updated
    } else {
      const created = await categoryService.create({ name: form.name.trim(), type: form.type })
      allCats.value.push(created)
    }
    closeModal()
  } catch (e) {
    formApiError.value = e?.message ?? 'Save failed.'
  } finally { formLoading.value = false }
}

// ── Delete ────────────────────────────────────────────────
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

function openDelete(cat) { deleteTarget.value = cat }
function closeDelete()   { deleteTarget.value = null }

async function handleDelete() {
  deleteLoading.value = true
  try {
    await categoryService.remove(deleteTarget.value.id)
    allCats.value = allCats.value.filter((c) => c.id !== deleteTarget.value.id)
    closeDelete()
  } catch (e) { formApiError.value = e?.message ?? 'Delete failed.' }
  finally { deleteLoading.value = false }
}

const typeBadge = { INCOME: 'green', EXPENSE: 'red', income: 'green', expense: 'red' }
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader title="Categories" subtitle="Manage your income and expense categories">
      <template #actions>
        <BaseButton variant="primary" size="sm" @click="openAdd('EXPENSE')">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add category
        </BaseButton>
      </template>
    </PageHeader>

    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">{{ fetchError }}</BaseAlert>

    <div v-if="loading" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- ── Income categories ─────────────────────────── -->
        <BaseCard no-pad>
          <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="section-title">Income Categories</h2>
              <BaseBadge variant="green" size="sm">{{ incomeCats.length }}</BaseBadge>
            </div>
            <BaseButton variant="ghost" size="sm" @click="openAdd('INCOME')">+ Add</BaseButton>
          </div>
          <EmptyState v-if="!incomeCats.length" title="No income categories" message="Add categories to classify your income sources." icon="inbox" />
          <ul v-else class="divide-y divide-slate-100" role="list">
            <li v-for="cat in incomeCats" :key="cat.id" class="flex items-center gap-3 px-5 py-3 group">
              <span class="shrink-0 h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm" aria-hidden="true">📈</span>
              <span class="flex-1 text-sm font-medium text-navy-800 truncate">{{ cat.name }}</span>
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Edit ' + cat.name" @click="openEdit(cat)">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </BaseButton>
                <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Delete ' + cat.name" @click="openDelete(cat)">
                  <svg class="h-3.5 w-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </BaseButton>
              </div>
            </li>
          </ul>
        </BaseCard>

        <!-- ── Expense categories ──────────────────────────── -->
        <BaseCard no-pad>
          <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="section-title">Expense Categories</h2>
              <BaseBadge variant="red" size="sm">{{ expenseCats.length }}</BaseBadge>
            </div>
            <BaseButton variant="ghost" size="sm" @click="openAdd('EXPENSE')">+ Add</BaseButton>
          </div>
          <EmptyState v-if="!expenseCats.length" title="No expense categories" message="Add categories to classify your spending." icon="inbox" />
          <ul v-else class="divide-y divide-slate-100" role="list">
            <li v-for="cat in expenseCats" :key="cat.id" class="flex items-center gap-3 px-5 py-3 group">
              <span class="shrink-0 h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-sm" aria-hidden="true">💸</span>
              <span class="flex-1 text-sm font-medium text-navy-800 truncate">{{ cat.name }}</span>
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Edit ' + cat.name" @click="openEdit(cat)">
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </BaseButton>
                <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Delete ' + cat.name" @click="openDelete(cat)">
                  <svg class="h-3.5 w-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </BaseButton>
              </div>
            </li>
          </ul>
        </BaseCard>
      </div>
    </template>

    <!-- Add / Edit modal -->
    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog" aria-modal="true" :aria-label="editTarget ? 'Edit category' : 'Add category'">
        <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="closeModal" />
        <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 class="text-base font-semibold text-navy-800">{{ editTarget ? 'Edit category' : 'Add category' }}</h2>
            <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="closeModal">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <BaseAlert v-if="formApiError" variant="error">{{ formApiError }}</BaseAlert>
            <BaseInput v-model="form.name" label="Category name" placeholder="e.g. School Fees" required :error="fieldErr('name')" @blur="touched.name = true" />
            <BaseSelect v-model="form.type" label="Type" :options="typeOptions" required :disabled="!!editTarget" :error="fieldErr('type')" @blur="touched.type = true" />
          </div>
          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <BaseButton variant="secondary" @click="closeModal">Cancel</BaseButton>
            <BaseButton variant="primary" :loading="formLoading" @click="handleSave">
              {{ editTarget ? 'Save changes' : 'Add category' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>

    <DeleteConfirmModal
      :open="!!deleteTarget" :loading="deleteLoading"
      title="Delete category"
      :message="deleteTarget ? 'Delete ' + deleteTarget.name + '? Transactions using this category may be affected.' : ''"
      @close="closeDelete" @confirm="handleDelete"
    />

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
