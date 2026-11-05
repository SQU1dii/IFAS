<script setup>
/**
 * DepartmentsView — ORGANIZATION workspaces only.
 * Create, rename, update budgets, and delete departments.
 * Each department shows its budget, spent, remaining, and utilization.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import workspaceService      from '@/services/workspaceService'
import { formatCurrency, formatPercent } from '@/utils/format'
import { runRules, required, isPositiveNumber } from '@/utils/validation'

import PageHeader         from '@/components/common/PageHeader.vue'
import BaseButton         from '@/components/common/BaseButton.vue'
import BaseCard           from '@/components/common/BaseCard.vue'
import BaseAlert          from '@/components/common/BaseAlert.vue'
import BaseInput          from '@/components/common/BaseInput.vue'
import BaseBadge          from '@/components/common/BaseBadge.vue'
import BaseProgress       from '@/components/common/BaseProgress.vue'
import BaseSpinner        from '@/components/common/BaseSpinner.vue'
import EmptyState         from '@/components/common/EmptyState.vue'
import DeleteConfirmModal from '@/components/transactions/DeleteConfirmModal.vue'

const ws = useWorkspaceStore()

const depts      = ref([])
const loading    = ref(false)
const fetchError = ref('')

async function load() {
  if (!ws.wsId) return
  loading.value = true; fetchError.value = ''
  try { depts.value = await workspaceService.listDepartments(ws.wsId) }
  catch (e) { fetchError.value = e?.message ?? 'Failed to load departments.' }
  finally   { loading.value = false }
}
onMounted(load)

// ── Summary ─────────────────────────────────────────────
const totalBudget    = computed(() => depts.value.reduce((s, d) => s + d.budget, 0))
const totalSpent     = computed(() => depts.value.reduce((s, d) => s + d.spent,  0))
const overBudget     = computed(() => depts.value.filter((d) => d.status === 'over'))
const nearBudget     = computed(() => depts.value.filter((d) => d.status === 'warning'))

// ── Modal ────────────────────────────────────────────────
const modalOpen    = ref(false)
const editTarget   = ref(null)
const formLoading  = ref(false)
const formApiError = ref('')

const blank = () => ({ name: '', budget: '', head_name: '' })
const form    = reactive(blank())
const touched = reactive({})

const errors = computed(() => ({
  name:   runRules(form.name,   [[required, 'Department name is required']]),
  budget: runRules(form.budget, [[required, 'Budget is required'], [isPositiveNumber, 'Enter a positive amount']]),
}))
const fieldErr = (f) => touched[f] ? (errors.value[f] || '') : ''
const isValid = computed(() => !errors.value.name && !errors.value.budget)

function openAdd() {
  editTarget.value = null
  Object.assign(form, blank())
  Object.keys(touched).forEach((k) => delete touched[k])
  formApiError.value = ''; modalOpen.value = true
}
function openEdit(d) {
  editTarget.value = d
  Object.assign(form, { name: d.name, budget: String(d.budget), head_name: d.head_name ?? '' })
  Object.keys(touched).forEach((k) => delete touched[k])
  formApiError.value = ''; modalOpen.value = true
}
function closeModal() { modalOpen.value = false }

async function handleSave() {
  Object.keys(errors.value).forEach((k) => (touched[k] = true))
  if (!isValid.value) return
  formLoading.value = true; formApiError.value = ''
  try {
    const payload = { name: form.name.trim(), budget: parseFloat(form.budget), head_name: form.head_name.trim() }
    if (editTarget.value) await workspaceService.updateDepartment(ws.wsId, editTarget.value.id, payload)
    else                  await workspaceService.createDepartment(ws.wsId, payload)
    closeModal(); load()
  } catch (e) {
    formApiError.value = e?.message ?? 'Save failed.'
  } finally { formLoading.value = false }
}

// ── Delete ───────────────────────────────────────────────
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

function openDelete(d) { deleteTarget.value = d }
function closeDelete()  { deleteTarget.value = null }

async function handleDelete() {
  deleteLoading.value = true
  try {
    await workspaceService.deleteDepartment(ws.wsId, deleteTarget.value.id)
    depts.value = depts.value.filter((d) => d.id !== deleteTarget.value.id)
    closeDelete()
  } catch (e) { formApiError.value = e?.message ?? 'Delete failed.' }
  finally { deleteLoading.value = false }
}

const statusColor = { over: 'red', warning: 'amber', on_track: 'green' }
const statusLabel = { over: 'Over budget', warning: 'Near limit', on_track: 'On track' }
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader title="Departments" subtitle="Manage departmental budgets and allocations">
      <template #actions>
        <BaseButton v-if="ws.can('departments.write')" variant="primary" size="sm" @click="openAdd">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add department
        </BaseButton>
      </template>
    </PageHeader>

    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">{{ fetchError }}</BaseAlert>

    <!-- Threshold warnings -->
    <div v-if="!loading && (overBudget.length || nearBudget.length)" class="flex flex-wrap gap-3">
      <BaseAlert v-if="overBudget.length" variant="error" class="flex-1 min-w-[240px]">
        <strong>{{ overBudget.map((d) => d.name).join(', ') }}</strong>
        {{ overBudget.length === 1 ? 'has' : 'have' }} exceeded their budget.
      </BaseAlert>
      <BaseAlert v-if="nearBudget.length" variant="warning" class="flex-1 min-w-[240px]">
        <strong>{{ nearBudget.map((d) => d.name).join(', ') }}</strong>
        {{ nearBudget.length === 1 ? 'is' : 'are' }} approaching their budget limit.
      </BaseAlert>
    </div>

    <!-- Summary cards -->
    <div v-if="!loading && depts.length" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="card-pad">
        <p class="muted">Total Budget</p>
        <p class="text-xl font-bold text-navy-800 mt-1 tabular-nums">{{ formatCurrency(totalBudget) }}</p>
      </div>
      <div class="card-pad">
        <p class="muted">Total Spent</p>
        <p class="text-xl font-bold text-rose-600 mt-1 tabular-nums">{{ formatCurrency(totalSpent) }}</p>
      </div>
      <div class="card-pad">
        <p class="muted">Remaining</p>
        <p class="text-xl font-bold mt-1 tabular-nums"
          :class="totalBudget - totalSpent >= 0 ? 'text-emerald-700' : 'text-rose-600'">
          {{ formatCurrency(totalBudget - totalSpent) }}
        </p>
      </div>
      <div class="card-pad">
        <p class="muted">Departments</p>
        <p class="text-xl font-bold text-navy-800 mt-1">{{ depts.length }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>

    <EmptyState v-else-if="!depts.length"
      title="No departments yet"
      message="Create a department to assign budgets and track spending."
      icon="chart">
      <template #action>
        <BaseButton v-if="ws.can('departments.write')" variant="primary" size="sm" @click="openAdd">
          Add first department
        </BaseButton>
      </template>
    </EmptyState>

    <!-- Department cards grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <BaseCard v-for="dept in depts" :key="dept.id" class="relative flex flex-col gap-3">
        <div
          :class="['absolute top-0 left-0 right-0 h-1 rounded-t-2xl', statusColor[dept.status] === 'red' ? 'bg-rose-500' : statusColor[dept.status] === 'amber' ? 'bg-amber-400' : 'bg-emerald-500']"
          aria-hidden="true"
        />
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-navy-800 truncate">{{ dept.name }}</h3>
            <p v-if="dept.head_name" class="text-xs text-slate-400 mt-0.5">Head: {{ dept.head_name }}</p>
            <BaseBadge :variant="statusColor[dept.status] ?? 'neutral'" size="sm" class="mt-1">
              {{ statusLabel[dept.status] ?? dept.status }}
            </BaseBadge>
          </div>
          <div v-if="ws.can('departments.write')" class="flex items-center gap-0.5 shrink-0">
            <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Edit ' + dept.name" @click="openEdit(dept)">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </BaseButton>
            <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Delete ' + dept.name" @click="openDelete(dept)">
              <svg class="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </BaseButton>
          </div>
        </div>

        <BaseProgress :value="dept.spent" :max="dept.budget" :color="statusColor[dept.status] ?? 'green'" size="md" />

        <div class="flex justify-between text-xs">
          <span class="text-slate-500 tabular-nums">{{ formatCurrency(dept.spent) }} spent</span>
          <span class="tabular-nums font-medium" :class="dept.remaining < 0 ? 'text-rose-600' : 'text-slate-500'">
            {{ dept.remaining >= 0 ? formatCurrency(dept.remaining) + ' left' : formatCurrency(Math.abs(dept.remaining)) + ' over' }}
          </span>
        </div>

        <div class="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5 -mb-1">
          <span class="text-slate-400">Limit: <strong class="text-navy-700">{{ formatCurrency(dept.budget) }}</strong></span>
          <span class="text-slate-400">{{ formatPercent(dept.utilization_pct ?? 0) }} used</span>
        </div>
      </BaseCard>
    </div>

    <!-- Add / Edit modal -->
    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog" aria-modal="true" :aria-label="editTarget ? 'Edit department' : 'Add department'">
        <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="closeModal" />
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 class="text-base font-semibold text-navy-800">{{ editTarget ? 'Edit department' : 'Add department' }}</h2>
            <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="closeModal">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <BaseAlert v-if="formApiError" variant="error">{{ formApiError }}</BaseAlert>
            <BaseInput v-model="form.name" label="Department name" placeholder="e.g. Programs" required :error="fieldErr('name')" @blur="touched.name = true" />
            <BaseInput v-model="form.budget" label="Annual budget" type="number" placeholder="e.g. 500000" min="1" step="1" required :error="fieldErr('budget')" @blur="touched.budget = true" />
            <BaseInput v-model="form.head_name" label="Department head" placeholder="e.g. David Kimani" />
          </div>
          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <BaseButton variant="secondary" @click="closeModal">Cancel</BaseButton>
            <BaseButton variant="primary" :loading="formLoading" @click="handleSave">
              {{ editTarget ? 'Save changes' : 'Add department' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>

    <DeleteConfirmModal
      :open="!!deleteTarget" :loading="deleteLoading"
      title="Delete department"
      :message="deleteTarget ? 'Delete ' + deleteTarget.name + '? This cannot be undone.' : ''"
      @close="closeDelete" @confirm="handleDelete"
    />

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
