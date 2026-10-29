<script setup>
/**
 * AccountsView — list, create, rename, and deactivate financial accounts.
 *
 * "Delete" is a soft-deactivation. Inactive accounts are shown in a
 * separate section and excluded from all transaction form dropdowns.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import accountService from '@/services/accountService'
import PageHeader     from '@/components/common/PageHeader.vue'
import BaseButton     from '@/components/common/BaseButton.vue'
import BaseCard       from '@/components/common/BaseCard.vue'
import BaseAlert      from '@/components/common/BaseAlert.vue'
import BaseInput      from '@/components/common/BaseInput.vue'
import BaseSelect     from '@/components/common/BaseSelect.vue'
import BaseBadge      from '@/components/common/BaseBadge.vue'
import BaseSpinner    from '@/components/common/BaseSpinner.vue'
import EmptyState     from '@/components/common/EmptyState.vue'
import DeleteConfirmModal from '@/components/transactions/DeleteConfirmModal.vue'
import { formatCurrency } from '@/utils/format'
import { runRules, required, minLength } from '@/utils/validation'

// ── Accounts list ─────────────────────────────────────────
const accounts   = ref([])
const loading    = ref(false)
const fetchError = ref('')

const active   = computed(() => accounts.value.filter((a) =>  a.is_active))
const inactive = computed(() => accounts.value.filter((a) => !a.is_active))

async function load() {
  loading.value = true; fetchError.value = ''
  try { accounts.value = await accountService.list() }
  catch (err) { fetchError.value = err?.message ?? 'Failed to load accounts.' }
  finally { loading.value = false }
}
onMounted(load)

// ── Account type options ──────────────────────────────────
const typeOptions = [
  { value: 'checking',     label: 'Checking / Current' },
  { value: 'savings',      label: 'Savings'            },
  { value: 'mobile_money', label: 'Mobile Money (M-Pesa)' },
  { value: 'credit',       label: 'Credit Card'        },
  { value: 'cash',         label: 'Cash'               },
  { value: 'investment',   label: 'Investment / CMA'   },
  { value: 'sacco',        label: 'SACCO'              },
  { value: 'other',        label: 'Other'              },
]

const accountTypeLabel = (t) =>
  typeOptions.find((o) => o.value === t)?.label ?? t

const accountTypeBadge = (t) =>
  ({ checking: 'green', savings: 'blue', mobile_money: 'green', credit: 'red', investment: 'purple', sacco: 'amber', cash: 'neutral' })[t] ?? 'neutral'

// ── Add / Edit modal ──────────────────────────────────────
const modalOpen     = ref(false)
const editTarget    = ref(null)
const formLoading   = ref(false)
const formApiError  = ref('')
const formFieldErrs = ref({})

const blank = () => ({ name: '', type: 'checking', currency: 'KES', balance: '', institution: '' })
const form    = reactive(blank())
const touched = reactive({})

const errors = computed(() => ({
  name:     runRules(form.name,     [[required, 'Account name is required'], [minLength, 'Name must be at least 2 characters', 2]]),
  type:     runRules(form.type,     [[required, 'Account type is required']]),
  currency: runRules(form.currency, [[required, 'Currency is required']]),
}))
const fieldErr = (f) => touched[f] ? (formFieldErrs.value[f] || errors.value[f] || '') : ''
const isValid = computed(() => !errors.value.name && !errors.value.type && !errors.value.currency)

function openAdd() {
  editTarget.value = null
  Object.assign(form, blank())
  Object.keys(touched).forEach((k) => delete touched[k])
  formApiError.value = ''; formFieldErrs.value = {}
  modalOpen.value = true
}
function openEdit(acc) {
  editTarget.value = acc
  Object.assign(form, { name: acc.name, type: acc.type, currency: acc.currency, balance: String(acc.balance ?? ''), institution: acc.institution ?? '' })
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
    const payload = { name: form.name.trim(), type: form.type, currency: form.currency, balance: parseFloat(form.balance || 0), institution: form.institution.trim() }
    if (editTarget.value) await accountService.update(editTarget.value.id, payload)
    else                  await accountService.create(payload)
    closeModal(); load()
  } catch (err) {
    formApiError.value = err?.message ?? 'Save failed.'
    formFieldErrs.value = err?.fieldErrors ?? {}
  } finally { formLoading.value = false }
}

// ── Deactivate ────────────────────────────────────────────
const deactivateTarget  = ref(null)
const deactivateLoading = ref(false)
const deactivateError   = ref('')

function openDeactivate(acc) { deactivateTarget.value = acc; deactivateError.value = '' }
function closeDeactivate()   { deactivateTarget.value = null }

async function handleDeactivate() {
  deactivateLoading.value = true; deactivateError.value = ''
  try { await accountService.deactivate(deactivateTarget.value.id); closeDeactivate(); load() }
  catch (err) { deactivateError.value = err?.message ?? 'Failed to deactivate.' }
  finally { deactivateLoading.value = false }
}
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader title="Accounts" subtitle="Manage your financial accounts">
      <template #actions>
        <BaseButton variant="primary" size="sm" @click="openAdd">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add account
        </BaseButton>
      </template>
    </PageHeader>

    <BaseAlert v-if="fetchError" variant="error" dismissible @dismiss="fetchError = ''">{{ fetchError }}</BaseAlert>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>

    <template v-else>
      <!-- Active accounts -->
      <BaseCard no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 class="section-title">Active accounts</h2>
        </div>
        <div class="p-4">
          <EmptyState v-if="!active.length" title="No accounts yet" message="Add an account to start tracking your finances." icon="savings">
            <template #action><BaseButton variant="primary" size="sm" @click="openAdd">Add account</BaseButton></template>
          </EmptyState>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="acc in active" :key="acc.id" class="flex items-center gap-4 py-4">
              <!-- Icon -->
              <span class="shrink-0 h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg" aria-hidden="true">
                {{ { checking: '🏦', savings: '💰', mobile_money: '📱', credit: '💳', investment: '📈', sacco: '🤝', cash: '💵', other: '🏧' }[acc.type] ?? '🏧' }}
              </span>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-navy-800 truncate">{{ acc.name }}</p>
                  <BaseBadge :variant="accountTypeBadge(acc.type)" size="sm">{{ accountTypeLabel(acc.type) }}</BaseBadge>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">{{ acc.institution || '—' }} · {{ acc.currency }}</p>
              </div>
              <!-- Balance -->
              <div class="text-right shrink-0">
                <p :class="['text-base font-bold', acc.balance >= 0 ? 'text-navy-800' : 'text-rose-600']">
                  {{ formatCurrency(acc.balance, acc.currency) }}
                </p>
                <p class="text-xs text-slate-400 mt-0.5">Balance</p>
              </div>
              <!-- Actions -->
              <div class="flex items-center gap-1 shrink-0">
                <BaseButton variant="ghost" size="sm" icon-only :aria-label="`Edit ${acc.name}`" @click="openEdit(acc)">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </BaseButton>
                <BaseButton variant="ghost" size="sm" icon-only :aria-label="`Deactivate ${acc.name}`" @click="openDeactivate(acc)">
                  <svg class="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </BaseButton>
              </div>
            </li>
          </ul>
        </div>
      </BaseCard>

      <!-- Inactive accounts (collapsible) -->
      <BaseCard v-if="inactive.length" no-pad>
        <details class="group">
          <summary class="px-5 py-4 flex items-center justify-between cursor-pointer list-none">
            <h2 class="section-title text-slate-400">Inactive accounts ({{ inactive.length }})</h2>
            <svg class="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </summary>
          <div class="px-4 pb-4 border-t border-slate-100 pt-2">
            <ul class="divide-y divide-slate-100">
              <li v-for="acc in inactive" :key="acc.id" class="flex items-center gap-4 py-3 opacity-60">
                <span class="shrink-0 h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-base" aria-hidden="true">
                  {{ { checking: '🏦', savings: '💰', mobile_money: '📱', credit: '💳' }[acc.type] ?? '🏧' }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-navy-700 truncate">{{ acc.name }}</p>
                  <p class="text-xs text-slate-400">{{ accountTypeLabel(acc.type) }} · {{ acc.currency }}</p>
                </div>
                <BaseBadge variant="neutral" size="sm">Inactive</BaseBadge>
              </li>
            </ul>
          </div>
        </details>
      </BaseCard>
    </template>

    <!-- Add / Edit modal -->
    <Transition name="modal">
      <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" :aria-label="editTarget ? 'Edit account' : 'Add account'">
        <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="closeModal" />
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 class="text-base font-semibold text-navy-800">{{ editTarget ? 'Edit account' : 'Add account' }}</h2>
            <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="closeModal">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <BaseAlert v-if="formApiError" variant="error">{{ formApiError }}</BaseAlert>
            <BaseInput v-model="form.name" label="Account name" placeholder="e.g. Main Checking" required :error="fieldErr('name')" @blur="touched.name = true" />
            <div class="grid grid-cols-2 gap-4">
              <BaseSelect v-model="form.type" label="Type" required :options="typeOptions" :error="fieldErr('type')" @blur="touched.type = true" />
              <BaseInput v-model="form.currency" label="Currency" placeholder="KES" required :error="fieldErr('currency')" @blur="touched.currency = true" />
            </div>
            <BaseInput v-model="form.balance" label="Opening balance" type="number" placeholder="e.g. 50000" hint="Use a negative value for credit card debt. Amount in KES." />
            <BaseInput v-model="form.institution" label="Institution" placeholder="e.g. Equity Bank, Safaricom M-Pesa" />
          </div>
          <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <BaseButton variant="secondary" @click="closeModal">Cancel</BaseButton>
            <BaseButton variant="primary" :loading="formLoading" @click="handleSave">
              {{ editTarget ? 'Save changes' : 'Add account' }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Deactivate confirm -->
    <DeleteConfirmModal
      :open="!!deactivateTarget"
      title="Deactivate account"
      :message="deactivateTarget ? 'Deactivate &quot;' + deactivateTarget.name + '&quot;? It will be hidden from dropdowns but transaction history is preserved.' : ''"
      :loading="deactivateLoading"
      @close="closeDeactivate"
      @confirm="handleDeactivate"
    />

  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
