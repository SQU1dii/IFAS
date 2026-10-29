<script setup>
/**
 * SavingsView — manage savings goals with contributions and withdrawals.
 *
 * Layout
 * ──────
 * Top row        : 3 summary cards (total saved, total target, overall progress)
 * Goals grid     : one card per goal — circular-style progress, target date,
 *                  monthly_needed estimate, contribute / withdraw / edit / delete
 * Detail drawer  : slides in when a goal is selected — shows contribution
 *                  history table (newest first) with type badges
 *
 * Rules
 * ─────
 * • Withdrawals cannot exceed current balance (validated by service + backend).
 * • monthly_needed is labeled clearly as an ESTIMATE — not a guarantee.
 * • progress_pct, remaining_amount, days_remaining and monthly_needed all
 *   come from the service; the view never recalculates them.
 * • If a goal is reached (reached === true) it shows a completion state.
 */
import { ref, computed, onMounted, reactive, watch } from 'vue'
import savingsService  from '@/services/savingsService'
import { formatCurrency, formatDate, formatPercent } from '@/utils/format'
import { runRules, required, isPositiveNumber, isValidDate } from '@/utils/validation'

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

// ── Goals list ──────────────────────────────────────────────
const goals      = ref([])
const loading    = ref(false)
const fetchError = ref('')

async function loadGoals() {
  loading.value = true; fetchError.value = ''
  try { goals.value = await savingsService.list() }
  catch (e) { fetchError.value = e?.message ?? 'Failed to load savings goals.' }
  finally   { loading.value = false }
}
onMounted(loadGoals)

// ── Summary cards ───────────────────────────────────────────
const summary = computed(() => {
  const totalSaved    = goals.value.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget   = goals.value.reduce((s, g) => s + g.target_amount,  0)
  const overallPct    = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0
  const reached       = goals.value.filter((g) => g.reached).length
  const active        = goals.value.filter((g) => !g.reached).length
  return { totalSaved, totalTarget, overallPct, reached, active, count: goals.value.length }
})

// ── Goal / Edit modal ───────────────────────────────────────
const goalModalOpen   = ref(false)
const goalEditTarget  = ref(null)
const goalLoading     = ref(false)
const goalApiError    = ref('')
const goalFieldErrs   = ref({})

const blankGoal = () => ({
  name: '', target_amount: '', initial_amount: '', target_date: '', notes: '',
})
const gForm    = reactive(blankGoal())
const gTouched = reactive({})

const gErrors = computed(() => ({
  name:          runRules(gForm.name,          [[required, 'Goal name is required']]),
  target_amount: runRules(gForm.target_amount, [[required, 'Target amount is required'], [isPositiveNumber, 'Enter a positive number']]),
  target_date:   gForm.target_date ? runRules(gForm.target_date, [[isValidDate, 'Enter a valid date']]) : null,
}))
const gFieldErr = (f) => gTouched[f] ? (goalFieldErrs.value[f] || gErrors.value[f] || '') : ''
const gIsValid  = computed(() => !gErrors.value.name && !gErrors.value.target_amount && !gErrors.value.target_date)

function openAddGoal() {
  goalEditTarget.value = null
  Object.assign(gForm, blankGoal())
  Object.keys(gTouched).forEach((k) => delete gTouched[k])
  goalApiError.value = ''; goalFieldErrs.value = {}
  goalModalOpen.value = true
}

function openEditGoal(g) {
  goalEditTarget.value = g
  Object.assign(gForm, {
    name:           g.name,
    target_amount:  String(g.target_amount),
    initial_amount: '',
    target_date:    g.target_date ?? '',
    notes:          g.notes ?? '',
  })
  Object.keys(gTouched).forEach((k) => delete gTouched[k])
  goalApiError.value = ''; goalFieldErrs.value = {}
  goalModalOpen.value = true
}

function closeGoalModal() { goalModalOpen.value = false }

async function handleGoalSave() {
  Object.keys(gErrors.value).forEach((k) => (gTouched[k] = true))
  if (!gIsValid.value) return
  goalLoading.value = true; goalApiError.value = ''; goalFieldErrs.value = {}
  try {
    const payload = {
      name:          gForm.name.trim(),
      target_amount: parseFloat(gForm.target_amount),
      target_date:   gForm.target_date || null,
      notes:         gForm.notes.trim(),
    }
    if (goalEditTarget.value) {
      const updated = await savingsService.update(goalEditTarget.value.id, payload)
      const idx = goals.value.findIndex((g) => g.id === goalEditTarget.value.id)
      if (idx !== -1) goals.value[idx] = updated
    } else {
      if (gForm.initial_amount) payload.initial_amount = parseFloat(gForm.initial_amount)
      const created = await savingsService.create(payload)
      goals.value.unshift(created)
    }
    closeGoalModal()
  } catch (e) {
    goalApiError.value  = e?.message ?? 'Save failed.'
    goalFieldErrs.value = e?.fieldErrors ?? {}
  } finally { goalLoading.value = false }
}

// ── Delete goal ─────────────────────────────────────────────
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

function openDelete(g) { deleteTarget.value = g }
function closeDelete()  { deleteTarget.value = null }

async function handleDelete() {
  deleteLoading.value = true
  try {
    await savingsService.remove(deleteTarget.value.id)
    goals.value = goals.value.filter((g) => g.id !== deleteTarget.value.id)
    if (selectedGoal.value?.id === deleteTarget.value.id) selectedGoal.value = null
    closeDelete()
  } catch (e) { goalApiError.value = e?.message ?? 'Delete failed.' }
  finally { deleteLoading.value = false }
}

// ── Contribution / Withdrawal modal ────────────────────────
const contribGoal    = ref(null)   // goal the modal is open for
const contribLoading = ref(false)
const contribApiError= ref('')
const contribFieldErrs = ref({})
const isWithdrawal   = ref(false)  // toggle between deposit and withdraw

const blankContrib = () => ({
  amount: '',
  date:   new Date().toISOString().slice(0, 10),
  notes:  '',
})
const cForm    = reactive(blankContrib())
const cTouched = reactive({})

const cErrors = computed(() => ({
  amount: runRules(cForm.amount, [[required, 'Amount is required'], [isPositiveNumber, 'Enter a positive number']]),
  date:   runRules(cForm.date,   [[required, 'Date is required'], [isValidDate, 'Enter a valid date']]),
}))
const cFieldErr = (f) => cTouched[f] ? (contribFieldErrs.value[f] || cErrors.value[f] || '') : ''
const cIsValid  = computed(() => !cErrors.value.amount && !cErrors.value.date)

// Extra withdrawal guard surfaced in the UI before hitting the service.
const withdrawalExceedsBalance = computed(() =>
  isWithdrawal.value &&
  contribGoal.value &&
  parseFloat(cForm.amount || 0) > contribGoal.value.current_amount
)

function openContrib(g, withdrawal = false) {
  contribGoal.value = g
  isWithdrawal.value = withdrawal
  Object.assign(cForm, blankContrib())
  Object.keys(cTouched).forEach((k) => delete cTouched[k])
  contribApiError.value = ''; contribFieldErrs.value = {}
}
function closeContrib() { contribGoal.value = null }

async function handleContrib() {
  Object.keys(cErrors.value).forEach((k) => (cTouched[k] = true))
  if (!cIsValid.value || withdrawalExceedsBalance.value) return

  contribLoading.value = true; contribApiError.value = ''; contribFieldErrs.value = {}
  try {
    const { contribution, goal: updated } = await savingsService.addContribution(
      contribGoal.value.id,
      {
        amount: parseFloat(cForm.amount),
        type:   isWithdrawal.value ? 'withdrawal' : 'contribution',
        date:   cForm.date,
        notes:  cForm.notes.trim(),
      }
    )
    // Update the goal in the list in-place (no full reload needed).
    const idx = goals.value.findIndex((g) => g.id === updated.id)
    if (idx !== -1) goals.value[idx] = updated

    // Refresh history panel if this goal is open.
    if (selectedGoal.value?.id === updated.id) {
      selectedGoal.value = updated
      contribHistory.value.unshift(contribution)
    }
    closeContrib()
  } catch (e) {
    contribApiError.value  = e?.message ?? 'Transaction failed.'
    contribFieldErrs.value = e?.fieldErrors ?? {}
  } finally { contribLoading.value = false }
}

// ── History panel ───────────────────────────────────────────
const selectedGoal    = ref(null)
const contribHistory  = ref([])
const historyLoading  = ref(false)
const historyError    = ref('')

async function selectGoal(g) {
  if (selectedGoal.value?.id === g.id) { selectedGoal.value = null; return }
  selectedGoal.value = g
  historyLoading.value = true; historyError.value = ''
  try   { contribHistory.value = await savingsService.getContributions(g.id) }
  catch (e) { historyError.value = e?.message ?? 'Failed to load history.' }
  finally   { historyLoading.value = false }
}

// Progress ring helper — SVG circle circumference trick.
const RADIUS = 36
const CIRC   = 2 * Math.PI * RADIUS
function strokeDash(pct) {
  const filled = Math.min(100, pct) / 100 * CIRC
  return `${filled} ${CIRC}`
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <PageHeader title="Savings Goals" subtitle="Track progress toward your financial targets">
      <template #actions>
        <BaseButton variant="primary" size="sm" @click="openAddGoal">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add goal
        </BaseButton>
      </template>
    </PageHeader>

    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">{{ fetchError }}</BaseAlert>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <BaseSpinner size="lg" />
    </div>

    <template v-else>

      <!-- ── Summary cards ─────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">

        <div class="card-pad">
          <p class="muted">Total saved</p>
          <p class="text-2xl font-bold text-navy-800 mt-1">{{ formatCurrency(summary.totalSaved) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">across {{ summary.count }} goal{{ summary.count !== 1 ? 's' : '' }}</p>
        </div>

        <div class="card-pad">
          <p class="muted">Total target</p>
          <p class="text-2xl font-bold text-navy-800 mt-1">{{ formatCurrency(summary.totalTarget) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{ formatCurrency(summary.totalTarget - summary.totalSaved) }} remaining</p>
        </div>

        <div class="card-pad col-span-2 lg:col-span-1">
          <p class="muted">Overall progress</p>
          <p class="text-2xl font-bold text-emerald-700 mt-1">{{ formatPercent(summary.overallPct) }}</p>
          <BaseProgress :value="summary.overallPct" :max="100" color="green" size="md" class="mt-2" />
          <p class="text-xs text-slate-400 mt-1.5">
            {{ summary.reached }} goal{{ summary.reached !== 1 ? 's' : '' }} reached ·
            {{ summary.active }} active
          </p>
        </div>
      </div>

      <!-- ── Empty state ────────────────────────────────────── -->
      <EmptyState
        v-if="!goals.length"
        title="No savings goals yet"
        message="Create your first goal to start tracking progress toward it."
        icon="savings"
      >
        <template #action>
          <BaseButton variant="primary" size="sm" @click="openAddGoal">Create a goal</BaseButton>
        </template>
      </EmptyState>

      <!-- ── Goals grid ─────────────────────────────────────── -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <BaseCard
          v-for="g in goals"
          :key="g.id"
          class="flex flex-col gap-4 cursor-pointer hover:shadow-card-hover transition-shadow"
          :class="selectedGoal?.id === g.id ? 'ring-2 ring-emerald-500/40' : ''"
          @click="selectGoal(g)"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-navy-800 truncate">{{ g.name }}</h3>
                <BaseBadge v-if="g.reached" variant="green" size="sm">🎉 Reached</BaseBadge>
              </div>
              <p v-if="g.target_date" class="text-xs text-slate-400 mt-0.5">
                Target: {{ formatDate(g.target_date) }}
                <span v-if="g.days_remaining != null" class="ml-1">
                  · <span :class="g.days_remaining < 30 ? 'text-amber-600' : 'text-slate-400'">
                    {{ g.days_remaining > 0 ? g.days_remaining + ' days left' : 'Overdue' }}
                  </span>
                </span>
              </p>
            </div>
            <div class="flex items-center gap-0.5 shrink-0" @click.stop>
              <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Edit ' + g.name" @click="openEditGoal(g)">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </BaseButton>
              <BaseButton variant="ghost" size="sm" icon-only :aria-label="'Delete ' + g.name" @click="openDelete(g)">
                <svg class="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </BaseButton>
            </div>
          </div>

          <!-- Progress ring + amounts -->
          <div class="flex items-center gap-4">
            <!-- SVG progress ring -->
            <div class="shrink-0 relative h-20 w-20" :aria-label="`${g.progress_pct}% complete`" role="img">
              <svg class="h-20 w-20 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
                <circle cx="44" cy="44" :r="RADIUS" fill="none" stroke="#e2e8f0" stroke-width="8" />
                <circle
                  cx="44" cy="44" :r="RADIUS" fill="none"
                  :stroke="g.reached ? '#10b981' : g.progress_pct >= 80 ? '#10b981' : '#3b82f6'"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="strokeDash(g.progress_pct)"
                  style="transition: stroke-dasharray 0.4s ease"
                />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-navy-800">
                {{ Math.round(g.progress_pct) }}%
              </span>
            </div>

            <div class="flex-1 space-y-1 min-w-0">
              <div class="flex justify-between text-xs">
                <span class="text-slate-500">Saved</span>
                <span class="font-semibold text-navy-800 tabular-nums">{{ formatCurrency(g.current_amount) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-slate-500">Target</span>
                <span class="font-medium text-slate-600 tabular-nums">{{ formatCurrency(g.target_amount) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-slate-500">Remaining</span>
                <span class="font-medium tabular-nums" :class="g.reached ? 'text-emerald-600' : 'text-navy-700'">
                  {{ g.reached ? '—' : formatCurrency(g.remaining_amount) }}
                </span>
              </div>
              <!-- Monthly estimate (clearly labeled as an estimate) -->
              <div v-if="g.monthly_needed && !g.reached" class="flex justify-between text-xs pt-0.5">
                <span class="text-slate-400 italic">Est. monthly needed</span>
                <span class="text-slate-500 tabular-nums italic">{{ formatCurrency(g.monthly_needed) }}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <p v-if="g.notes" class="text-xs text-slate-400 truncate border-t border-slate-100 pt-3 -mb-1">
            {{ g.notes }}
          </p>

          <!-- Action buttons -->
          <div class="flex gap-2 border-t border-slate-100 pt-3 -mb-1" @click.stop>
            <BaseButton
              variant="primary" size="sm" class="flex-1"
              :disabled="g.reached"
              @click="openContrib(g, false)"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Contribute
            </BaseButton>
            <BaseButton
              variant="secondary" size="sm" class="flex-1"
              :disabled="g.current_amount <= 0"
              @click="openContrib(g, true)"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15" />
              </svg>
              Withdraw
            </BaseButton>
            <BaseButton
              variant="ghost" size="sm" icon-only
              :aria-label="selectedGoal?.id === g.id ? 'Hide history' : 'View history'"
              @click="selectGoal(g)"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- ── Contribution history panel ───────────────────── -->
      <Transition name="slide-up">
        <BaseCard v-if="selectedGoal" no-pad>
          <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="section-title">{{ selectedGoal.name }} — History</h2>
              <p class="muted mt-0.5">Contributions and withdrawals, newest first</p>
            </div>
            <BaseButton variant="ghost" size="sm" icon-only aria-label="Close history" @click="selectedGoal = null">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </BaseButton>
          </div>

          <div class="p-4">
            <!-- History loading -->
            <div v-if="historyLoading" class="flex justify-center py-8">
              <BaseSpinner size="md" />
            </div>

            <BaseAlert v-else-if="historyError" variant="error">{{ historyError }}</BaseAlert>

            <EmptyState
              v-else-if="!contribHistory.length"
              title="No history yet"
              message="Your contributions and withdrawals will appear here."
              icon="savings"
            />

            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm" aria-label="Contribution history">
                <thead>
                  <tr class="border-b border-slate-200">
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="c in contribHistory"
                    :key="c.id"
                    class="hover:bg-slate-50 transition-colors"
                  >
                    <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {{ formatDate(c.date) }}
                    </td>
                    <td class="px-4 py-3">
                      <BaseBadge :variant="c.type === 'contribution' ? 'green' : 'red'" size="sm">
                        {{ c.type === 'contribution' ? '↑ Contribution' : '↓ Withdrawal' }}
                      </BaseBadge>
                    </td>
                    <td class="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap"
                      :class="c.type === 'contribution' ? 'text-emerald-600' : 'text-rose-600'">
                      {{ c.type === 'contribution' ? '+' : '−' }}{{ formatCurrency(c.amount) }}
                    </td>
                    <td class="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">
                      {{ c.notes || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </BaseCard>
      </Transition>

    </template>


    <!-- ── Goal add / edit modal ──────────────────────────── -->
    <Transition name="modal">
      <div
        v-if="goalModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog" aria-modal="true"
        :aria-label="goalEditTarget ? 'Edit goal' : 'Add goal'"
      >
        <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="closeGoalModal" />
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 class="text-base font-semibold text-navy-800">{{ goalEditTarget ? 'Edit goal' : 'Add savings goal' }}</h2>
            <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="closeGoalModal">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <BaseAlert v-if="goalApiError" variant="error">{{ goalApiError }}</BaseAlert>

            <BaseInput
              v-model="gForm.name"
              label="Goal name" placeholder="e.g. Emergency Fund"
              required :error="gFieldErr('name')"
              @blur="gTouched.name = true"
            />
            <div class="grid grid-cols-2 gap-4">
              <BaseInput
                v-model="gForm.target_amount"
                label="Target amount" type="number"
                placeholder="0.00" min="1" step="0.01" required
                :error="gFieldErr('target_amount')"
                @blur="gTouched.target_amount = true"
              />
              <BaseInput
                v-model="gForm.target_date"
                label="Target date" type="date"
                :error="gFieldErr('target_date')"
                @blur="gTouched.target_date = true"
              />
            </div>
            <!-- Initial deposit shown only when creating -->
            <BaseInput
              v-if="!goalEditTarget"
              v-model="gForm.initial_amount"
              label="Initial deposit"
              type="number" placeholder="e.g. 10000" min="0" step="1"
              hint="Optional — how much you're putting in right now (KES)."
            />
            <div class="field">
              <label class="field-label">Notes <span class="text-slate-400 font-normal">(optional)</span></label>
              <textarea v-model="gForm.notes" rows="2" class="input resize-none" placeholder="What is this goal for?" />
            </div>
          </div>
          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <BaseButton variant="secondary" @click="closeGoalModal">Cancel</BaseButton>
            <BaseButton variant="primary" :loading="goalLoading" @click="handleGoalSave">
              {{ goalEditTarget ? 'Save changes' : 'Create goal' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>


    <!-- ── Contribution / Withdrawal modal ─────────────────── -->
    <Transition name="modal">
      <div
        v-if="contribGoal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog" aria-modal="true"
        :aria-label="isWithdrawal ? 'Withdraw from goal' : 'Add contribution'"
      >
        <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="closeContrib" />
        <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 class="text-base font-semibold text-navy-800">
                {{ isWithdrawal ? 'Withdraw funds' : 'Add contribution' }}
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">{{ contribGoal.name }}</p>
            </div>
            <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="closeContrib">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="px-6 py-5 space-y-4">
            <BaseAlert v-if="contribApiError" variant="error">{{ contribApiError }}</BaseAlert>

            <!-- Balance context -->
            <div class="bg-slate-50 rounded-xl px-4 py-3 text-sm flex justify-between">
              <span class="text-slate-500">Current balance</span>
              <span class="font-semibold text-navy-800">{{ formatCurrency(contribGoal.current_amount) }}</span>
            </div>

            <BaseInput
              v-model="cForm.amount"
              :label="isWithdrawal ? 'Withdrawal amount' : 'Contribution amount'"
              type="number" placeholder="0.00"
              min="0.01" step="0.01" required
              :error="cFieldErr('amount')"
              @blur="cTouched.amount = true"
            />

            <!-- Withdrawal guard -->
            <BaseAlert v-if="withdrawalExceedsBalance" variant="error">
              Withdrawal amount exceeds the available balance of {{ formatCurrency(contribGoal.current_amount) }}.
            </BaseAlert>

            <BaseInput
              v-model="cForm.date"
              label="Date" type="date" required
              :error="cFieldErr('date')"
              @blur="cTouched.date = true"
            />

            <div class="field">
              <label class="field-label">Notes <span class="text-slate-400 font-normal">(optional)</span></label>
              <textarea v-model="cForm.notes" rows="2" class="input resize-none" placeholder="Optional note…" />
            </div>
          </div>

          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <BaseButton variant="secondary" @click="closeContrib">Cancel</BaseButton>
            <BaseButton
              :variant="isWithdrawal ? 'danger' : 'primary'"
              :loading="contribLoading"
              :disabled="withdrawalExceedsBalance"
              @click="handleContrib"
            >
              {{ isWithdrawal ? 'Withdraw' : 'Add contribution' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>


    <!-- ── Delete goal confirm ──────────────────────────────── -->
    <DeleteConfirmModal
      :open="!!deleteTarget"
      :loading="deleteLoading"
      title="Delete goal"
      :message="deleteTarget ? 'Delete the goal ' + '&quot;' + deleteTarget.name + '&quot;' + '? All contribution history will be removed.' : ''"
      @close="closeDelete"
      @confirm="handleDelete"
    />

  </div>
</template>

<style scoped>
.modal-enter-active,   .modal-leave-active   { transition: opacity 0.2s ease; }
.modal-enter-from,     .modal-leave-to       { opacity: 0; }
.slide-up-enter-active,.slide-up-leave-active{ transition: opacity 0.2s ease, transform 0.2s ease; }
.slide-up-enter-from,  .slide-up-leave-to   { opacity: 0; transform: translateY(8px); }
</style>
