<script setup>
/**
 * BudgetsView — create and manage category budgets.
 *
 * Layout
 * ──────
 * Top row   : 3 summary cards  (total budgeted, total spent, on-track count)
 * Filter bar: period toggle (monthly / yearly / all)
 * Main grid : one card per budget — progress bar, spent vs limit,
 *             remaining, status badge, edit/delete actions
 * Footer    : "+ Add budget" button
 *
 * Rules enforced (matching backend contract):
 *  • period must be 'monthly' or 'yearly' — no weekly or custom.
 *  • The frontend displays what the service returns; it never recalculates
 *    spending totals from raw transactions.
 *  • Utilization ≥ 80 % → warning; ≥ 100 % → over.
 *
 * Planned vs actual section shows a comparison table at the bottom.
 */
import { ref, computed, onMounted, reactive } from 'vue'
import budgetService   from '@/services/budgetService'
import authService     from '@/services/authService'
import { formatCurrency, formatPercent } from '@/utils/format'
import { runRules, required, isPositiveNumber } from '@/utils/validation'

import PageHeader         from '@/components/common/PageHeader.vue'
import BaseButton         from '@/components/common/BaseButton.vue'
import BaseCard           from '@/components/common/BaseCard.vue'
import BaseAlert          from '@/components/common/BaseAlert.vue'
import BaseInput          from '@/components/common/BaseInput.vue'
import BaseSelect         from '@/components/common/BaseSelect.vue'
import BaseBadge          from '@/components/common/BaseBadge.vue'
import BaseProgress       from '@/components/common/BaseProgress.vue'
import BaseSpinner        from '@/components/common/BaseSpinner.vue'
import EmptyState         from '@/components/common/EmptyState.vue'
import DeleteConfirmModal from '@/components/transactions/DeleteConfirmModal.vue'

// ── Reference data ─────────────────────────────────────────
const categories = ref([])
onMounted(async () => {
  try {
    const all = await authService.getCategories()
    categories.value = all.filter((c) => c.type === 'expense')
  } catch { /* non-critical */ }
  load()
})

// ── Budget list ─────────────────────────────────────────────
const budgets    = ref([])
const loading    = ref(false)
const fetchError = ref('')

async function load() {
  loading.value = true; fetchError.value = ''
  try { budgets.value = await budgetService.listWithStatus() }
  catch (e) { fetchError.value = e?.message ?? 'Failed to load budgets.' }
  finally   { loading.value = false }
}

// ── Period filter ───────────────────────────────────────────
const periodFilter = ref('all') // 'all' | 'monthly' | 'yearly'
const periodOptions = [
  { value: 'all',     label: 'All periods'  },
  { value: 'monthly', label: 'Monthly only' },
  { value: 'yearly',  label: 'Yearly only'  },
]

const filtered = computed(() =>
  periodFilter.value === 'all'
    ? budgets.value
    : budgets.value.filter((b) => b.period === periodFilter.value)
)

// ── Summary cards ───────────────────────────────────────────
const summaryCards = computed(() => {
  const list = filtered.value
  const totalLimit  = list.reduce((s, b) => s + b.limit,  0)
  const totalSpent  = list.reduce((s, b) => s + (b.spent ?? 0), 0)
  const onTrack     = list.filter((b) => b.status === 'on_track').length
  const warning     = list.filter((b) => b.status === 'warning').length
  const over        = list.filter((b) => b.status === 'over').length
  return { totalLimit, totalSpent, onTrack, warning, over, count: list.length }
})

// ── Status helpers ──────────────────────────────────────────
const STATUS = {
  on_track: { badge: 'green',  label: 'On track'    },
  warning:  { badge: 'amber',  label: 'Near limit'  },
  over:     { badge: 'red',    label: 'Over budget' },
}
const barColor = { on_track: 'green', warning: 'amber', over: 'red' }

function statusOf(b) { return STATUS[b.status] ?? STATUS.on_track }
function colorOf(b)  { return barColor[b.status] ?? 'green' }

// ── Category options for the form ──────────────────────────
const usedCategoryIds = computed(() => budgets.value.map((b) => b.category_id))
const availableCategories = computed(() =>
  categories.value
    .filter((c) => !usedCategoryIds.value.includes(c.id) || c.id === form.category_id)
    .map((c) => ({ value: c.id, label: c.name }))
)

const periodSelectOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly'  },
]

// ── Add / Edit modal ────────────────────────────────────────
const modalOpen      = ref(false)
const editTarget     = ref(null)
const formLoading    = ref(false)
const formApiError   = ref('')
const formFieldErrs  = ref({})

const blankForm = () => ({ category_id: '', limit: '', period: 'monthly', notes: '' })
const form    = reactive(blankForm())
const touched = reactive({})

const errors = computed(() => ({
  category_id: runRules(form.category_id, [[required, 'Category is required']]),
  limit:       runRules(form.limit,       [[required, 'Limit is required'], [isPositiveNumber, 'Enter a positive number']]),
  period:      runRules(form.period,      [[required, 'Period is required']]),
}))
const fieldErr = (f) => touched[f] ? (formFieldErrs.value[f] || errors.value[f] || '') : ''
const isValid  = computed(() => !errors.value.category_id && !errors.value.limit && !errors.value.period)

function openAdd() {
  editTarget.value = null
  Object.assign(form, blankForm())
  Object.keys(touched).forEach((k) => delete touched[k])
  formApiError.value = ''; formFieldErrs.value = {}
  modalOpen.value = true
}

function openEdit(b) {
  editTarget.value = b
  Object.assign(form, { category_id: b.category_id, limit: String(b.limit), period: b.period, notes: b.notes ?? '' })
  Object.keys(touched).forEach((k) => delete touched[k])
  formApiError.value = ''; formFieldErrs.value = {}
  modalOpen.value = true
}

function closeModal() { modalOpen.value = false }

async function handleSave() {
  Object.keys(errors.value).forEach((k) => (touched[k] = true))
  if (!isValid.value) return
  formLoading.value = true; formApiError.value = ''; formFieldErrs.value = {}
  try {
    const payload = {
      category_id: form.category_id,
      limit:       parseFloat(form.limit),
      period:      form.period,
      notes:       form.notes.trim(),
    }
    if (editTarget.value) await budgetService.update(editTarget.value.id, payload)
    else                  await budgetService.create(payload)
    closeModal(); load()
  } catch (e) {
    formApiError.value  = e?.message ?? 'Save failed.'
    formFieldErrs.value = e?.fieldErrors ?? {}
  } finally { formLoading.value = false }
}

// ── Delete modal ────────────────────────────────────────────
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

function openDelete(b) { deleteTarget.value = b }
function closeDelete()  { deleteTarget.value = null }

async function handleDelete() {
  deleteLoading.value = true
  try { await budgetService.remove(deleteTarget.value.id); closeDelete(); load() }
  catch (e) { formApiError.value = e?.message ?? 'Delete failed.' }
  finally { deleteLoading.value = false }
}

// ── Category name lookup ────────────────────────────────────
const categoryName = (id) =>
  categories.value.find((c) => c.id === id)?.name ?? id
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <PageHeader title="Budgets" subtitle="Set spending limits and track progress by category">
      <template #actions>
        <BaseButton variant="primary" size="sm" @click="openAdd">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add budget
        </BaseButton>
      </template>
    </PageHeader>

    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">
      {{ fetchError }}
    </BaseAlert>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <BaseSpinner size="lg" />
    </div>

    <template v-else>

      <!-- ── Summary cards ─────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div class="card-pad">
          <p class="muted">Total budgeted</p>
          <p class="text-2xl font-bold text-navy-800 mt-1">{{ formatCurrency(summaryCards.totalLimit) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{ summaryCards.count }} budget{{ summaryCards.count !== 1 ? 's' : '' }}</p>
        </div>

        <div class="card-pad">
          <p class="muted">Total spent</p>
          <p class="text-2xl font-bold text-navy-800 mt-1">{{ formatCurrency(summaryCards.totalSpent) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">
            {{ summaryCards.totalLimit > 0 ? formatPercent((summaryCards.totalSpent / summaryCards.totalLimit) * 100) : '—' }} of limit
          </p>
        </div>

        <div class="card-pad flex items-center gap-3">
          <span class="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <svg class="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p class="muted">On track</p>
            <p class="text-2xl font-bold text-emerald-700 mt-0.5">{{ summaryCards.onTrack }}</p>
          </div>
        </div>

        <div class="card-pad flex items-center gap-3">
          <span class="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            :class="summaryCards.over > 0 ? 'bg-rose-50' : 'bg-amber-50'">
            <svg class="h-5 w-5" :class="summaryCards.over > 0 ? 'text-rose-500' : 'text-amber-500'"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </span>
          <div>
            <p class="muted">Alerts</p>
            <p class="text-2xl font-bold mt-0.5" :class="summaryCards.over > 0 ? 'text-rose-600' : 'text-amber-600'">
              {{ summaryCards.over + summaryCards.warning }}
            </p>
          </div>
        </div>
      </div>

      <!-- ── Period filter ──────────────────────────────────── -->
      <div class="flex items-center gap-2">
        <button
          v-for="opt in periodOptions" :key="opt.value"
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-sm font-medium transition border',
            periodFilter === opt.value
              ? 'bg-navy-800 text-white border-navy-800'
              : 'bg-white text-navy-600 border-slate-300 hover:bg-slate-50',
          ]"
          @click="periodFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- ── Empty state ────────────────────────────────────── -->
      <EmptyState
        v-if="!filtered.length"
        title="No budgets yet"
        message="Create a budget to start tracking your spending against a limit."
        icon="chart"
      >
        <template #action>
          <BaseButton variant="primary" size="sm" @click="openAdd">Add your first budget</BaseButton>
        </template>
      </EmptyState>

      <!-- ── Budget cards grid ──────────────────────────────── -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <BaseCard
          v-for="b in filtered"
          :key="b.id"
          class="relative flex flex-col gap-4"
        >
          <!-- Over-budget accent strip -->
          <div
            v-if="b.status === 'over'"
            class="absolute top-0 left-0 right-0 h-1 bg-rose-500 rounded-t-2xl"
            aria-hidden="true"
          />
          <div
            v-else-if="b.status === 'warning'"
            class="absolute top-0 left-0 right-0 h-1 bg-amber-400 rounded-t-2xl"
            aria-hidden="true"
          />

          <!-- Header row -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-navy-800 truncate">{{ b.category_name }}</h3>
              <BaseBadge :variant="statusOf(b).badge" size="sm" class="mt-1">
                {{ statusOf(b).label }}
              </BaseBadge>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <BaseBadge variant="neutral" size="sm" class="capitalize">{{ b.period }}</BaseBadge>
              <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Edit ' + b.category_name" @click="openEdit(b)">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </BaseButton>
              <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Delete ' + b.category_name" @click="openDelete(b)">
                <svg class="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </BaseButton>
            </div>
          </div>

          <!-- Progress bar -->
          <div>
            <BaseProgress :value="b.spent ?? 0" :max="b.limit" :color="colorOf(b)" size="md" />
            <div class="flex justify-between mt-1.5 text-xs">
              <span class="text-slate-500 tabular-nums">
                {{ formatCurrency(b.spent ?? 0) }} spent
              </span>
              <span class="font-medium tabular-nums" :class="(b.remaining ?? b.limit) < 0 ? 'text-rose-600' : 'text-slate-600'">
                {{ (b.remaining ?? b.limit) >= 0
                    ? formatCurrency(b.remaining ?? b.limit) + ' left'
                    : formatCurrency(Math.abs(b.remaining ?? 0)) + ' over' }}
              </span>
            </div>
          </div>

          <!-- Limit row -->
          <div class="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3 -mb-1">
            <span>Limit: <strong class="text-navy-700">{{ formatCurrency(b.limit) }}</strong></span>
            <span>{{ formatPercent(b.utilization ?? 0) }} used</span>
          </div>

          <!-- Warning / over-budget inline alert -->
          <div
            v-if="b.status !== 'on_track'"
            :class="[
              'rounded-lg px-3 py-2 text-xs font-medium',
              b.status === 'over'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-amber-50 text-amber-700',
            ]"
            role="alert"
          >
            <span v-if="b.status === 'over'">
              ⚠ Over budget by {{ formatCurrency(Math.abs(b.remaining ?? 0)) }}
            </span>
            <span v-else>
              ⚠ {{ formatPercent(b.utilization ?? 0) }} used — approaching limit
            </span>
          </div>
        </BaseCard>
      </div>

      <!-- ── Planned vs Actual comparison table ─────────────── -->
      <BaseCard v-if="filtered.length" no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 class="section-title">Planned vs Actual</h2>
          <p class="muted mt-0.5">How your spending compares to each budget limit</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" aria-label="Planned vs actual spending">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Period</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Planned</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actual</th>
                <th class="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Variance</th>
                <th class="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="b in filtered" :key="b.id" class="hover:bg-slate-50 transition-colors">
                <td class="px-5 py-3.5 font-medium text-navy-800">{{ b.category_name }}</td>
                <td class="px-5 py-3.5 text-slate-500 capitalize hidden sm:table-cell">{{ b.period }}</td>
                <td class="px-5 py-3.5 text-right tabular-nums text-navy-700">{{ formatCurrency(b.limit) }}</td>
                <td class="px-5 py-3.5 text-right tabular-nums font-medium"
                  :class="(b.spent ?? 0) > b.limit ? 'text-rose-600' : 'text-navy-700'">
                  {{ formatCurrency(b.spent ?? 0) }}
                </td>
                <td class="px-5 py-3.5 text-right tabular-nums font-semibold"
                  :class="(b.remaining ?? b.limit) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                  {{ (b.remaining ?? b.limit) >= 0 ? '+' : '' }}{{ formatCurrency(b.remaining ?? b.limit) }}
                </td>
                <td class="px-5 py-3.5 text-center">
                  <BaseBadge :variant="statusOf(b).badge" size="sm">{{ statusOf(b).label }}</BaseBadge>
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-200">
              <tr class="bg-slate-50">
                <td class="px-5 py-3 font-semibold text-navy-800">Total</td>
                <td class="hidden sm:table-cell" />
                <td class="px-5 py-3 text-right font-semibold tabular-nums text-navy-800">{{ formatCurrency(summaryCards.totalLimit) }}</td>
                <td class="px-5 py-3 text-right font-semibold tabular-nums"
                  :class="summaryCards.totalSpent > summaryCards.totalLimit ? 'text-rose-600' : 'text-navy-800'">
                  {{ formatCurrency(summaryCards.totalSpent) }}
                </td>
                <td class="px-5 py-3 text-right font-semibold tabular-nums"
                  :class="summaryCards.totalLimit - summaryCards.totalSpent >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                  {{ summaryCards.totalLimit - summaryCards.totalSpent >= 0 ? '+' : '' }}{{ formatCurrency(summaryCards.totalLimit - summaryCards.totalSpent) }}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </BaseCard>

    </template><!-- /v-else loading -->


    <!-- ── Add / Edit modal ─────────────────────────────────── -->
    <Transition name="modal">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog" aria-modal="true"
        :aria-label="editTarget ? 'Edit budget' : 'Add budget'"
      >
        <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="closeModal" />
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">

          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 class="text-base font-semibold text-navy-800">{{ editTarget ? 'Edit budget' : 'Add budget' }}</h2>
            <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="closeModal">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="px-6 py-5 space-y-4">
            <BaseAlert v-if="formApiError" variant="error">{{ formApiError }}</BaseAlert>

            <!-- Category — locked when editing (can't change category of existing budget) -->
            <BaseSelect
              v-model="form.category_id"
              label="Category" required
              placeholder="Select expense category"
              :options="availableCategories"
              :disabled="!!editTarget"
              :error="fieldErr('category_id')"
              @blur="touched.category_id = true"
            />

            <div class="grid grid-cols-2 gap-4">
              <BaseInput
                v-model="form.limit"
                label="Monthly / yearly limit"
                type="number" placeholder="0.00"
                min="0.01" step="0.01" required
                :error="fieldErr('limit')"
                @blur="touched.limit = true"
              />
              <BaseSelect
                v-model="form.period"
                label="Period" required
                :options="periodSelectOptions"
                :error="fieldErr('period')"
                @blur="touched.period = true"
              />
            </div>

            <div class="field">
              <label class="field-label">Notes <span class="text-slate-400 font-normal">(optional)</span></label>
              <textarea v-model="form.notes" rows="2" class="input resize-none" placeholder="Optional note…" />
            </div>

            <!-- Period constraint reminder -->
            <p class="text-xs text-slate-400">
              Budget periods are limited to <strong>monthly</strong> or <strong>yearly</strong>.
            </p>
          </div>

          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <BaseButton variant="secondary" @click="closeModal">Cancel</BaseButton>
            <BaseButton variant="primary" :loading="formLoading" @click="handleSave">
              {{ editTarget ? 'Save changes' : 'Add budget' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete confirm ───────────────────────────────────── -->
    <DeleteConfirmModal
      :open="!!deleteTarget"
      :loading="deleteLoading"
      title="Delete budget"
      :message="deleteTarget ? 'Delete the budget for ' + deleteTarget.category_name + '? This cannot be undone.' : ''"
      @close="closeDelete"
      @confirm="handleDelete"
    />

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
