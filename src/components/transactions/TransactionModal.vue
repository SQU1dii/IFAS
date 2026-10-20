<script setup>
/**
 * TransactionModal — add / edit a transaction.
 *
 * Type behaviour (per backend contract):
 *  • income / expense: show category, hide destination account
 *  • transfer:          hide category, show destination account
 *
 * Amounts are always stored as positive numbers; type determines direction.
 * Field-level errors from the API are surfaced next to each input.
 */
import { reactive, computed, watch, onMounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput  from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseAlert  from '@/components/common/BaseAlert.vue'
import { runRules, required, isPositiveNumber, isValidDate } from '@/utils/validation'

const props = defineProps({
  open:        { type: Boolean, default: false },
  transaction: { type: Object,  default: null  }, // null = create mode
  categories:  { type: Array,   default: () => [] },
  accounts:    { type: Array,   default: () => [] },
  loading:     { type: Boolean, default: false },
  apiError:    { type: String,  default: '' },
  fieldErrors: { type: Object,  default: () => ({}) },
})
const emit = defineEmits(['close', 'submit'])

// ── Form state ────────────────────────────────────────────
const blank = () => ({
  date: new Date().toISOString().slice(0, 10),
  description: '',
  amount: '',
  type: 'expense',
  category_id: '',
  account_id: '',
  destination_account_id: '',
  notes: '',
})
const form    = reactive(blank())
const touched = reactive({})

// Populate form when editing
watch(() => props.transaction, (t) => {
  if (t) Object.assign(form, { ...blank(), ...t, amount: String(t.amount ?? '') })
  else   Object.assign(form, blank())
  Object.keys(touched).forEach((k) => delete touched[k])
}, { immediate: true })

watch(() => props.open, (o) => {
  if (!o) { Object.assign(form, blank()); Object.keys(touched).forEach((k) => delete touched[k]) }
})

// Reset category when switching to/from transfer
watch(() => form.type, (t) => {
  if (t === 'transfer') form.category_id = ''
  else form.destination_account_id = ''
})

// ── Options ───────────────────────────────────────────────
const isTransfer = computed(() => form.type === 'transfer')

const categoryOpts = computed(() =>
  props.categories
    .filter((c) => form.type === 'income' ? c.type === 'income' : c.type === 'expense')
    .map((c) => ({ value: c.id, label: c.name }))
)
const accountOpts = computed(() =>
  props.accounts.filter((a) => a.is_active !== false).map((a) => ({ value: a.id, label: a.name }))
)
const destAccountOpts = computed(() =>
  props.accounts
    .filter((a) => a.is_active !== false && a.id !== form.account_id)
    .map((a) => ({ value: a.id, label: a.name }))
)

// ── Validation ────────────────────────────────────────────
const typeOptions = [
  { value: 'expense',  label: 'Expense'  },
  { value: 'income',   label: 'Income'   },
  { value: 'transfer', label: 'Transfer' },
]

const errors = computed(() => ({
  date:                   runRules(form.date,        [[required, 'Date is required'], [isValidDate, 'Enter a valid date']]),
  description:            runRules(form.description, [[required, 'Description is required']]),
  amount:                 runRules(form.amount,       [[required, 'Amount is required'], [isPositiveNumber, 'Enter a positive number']]),
  type:                   runRules(form.type,         [[required, 'Type is required']]),
  category_id:            !isTransfer.value ? runRules(form.category_id, [[required, 'Category is required']]) : null,
  account_id:             runRules(form.account_id,  [[required, 'Account is required']]),
  destination_account_id: isTransfer.value ? runRules(form.destination_account_id, [[required, 'Destination account is required']]) : null,
}))

const fieldErr = (f) => touched[f] ? (props.fieldErrors[f] || errors.value[f] || '') : ''
const isValid  = computed(() => Object.values(errors.value).every((e) => !e))

function touch(f)  { touched[f] = true }
function touchAll(){ Object.keys(errors.value).forEach((k) => (touched[k] = true)) }

function handleSubmit() {
  touchAll()
  if (!isValid.value) return
  const payload = {
    date:        form.date,
    description: form.description.trim(),
    amount:      parseFloat(form.amount),
    type:        form.type,
    category_id:            form.type !== 'transfer' ? form.category_id || null : null,
    account_id:             form.account_id,
    destination_account_id: form.type === 'transfer' ? form.destination_account_id || null : null,
    notes:       form.notes.trim(),
  }
  emit('submit', payload)
}

const title = computed(() => props.transaction ? 'Edit transaction' : 'Add transaction')
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      :aria-label="title"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="emit('close')" />

      <!-- Panel -->
      <div class="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 class="text-base font-semibold text-navy-800">{{ title }}</h2>
          <button
            type="button"
            class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            aria-label="Close dialog"
            @click="emit('close')"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <form novalidate class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin" @submit.prevent="handleSubmit">

          <BaseAlert v-if="apiError" variant="error" dismissible>{{ apiError }}</BaseAlert>

          <div class="grid grid-cols-2 gap-4">
            <BaseInput
              v-model="form.date"
              label="Date" type="date" required
              :error="fieldErr('date')"
              @blur="touch('date')"
            />
            <BaseSelect
              v-model="form.type"
              label="Type" required
              :options="typeOptions"
              :error="fieldErr('type')"
              @blur="touch('type')"
            />
          </div>

          <BaseInput
            v-model="form.description"
            label="Description" placeholder="e.g. Grocery Run"
            required :error="fieldErr('description')"
            @blur="touch('description')"
          />

          <div class="grid grid-cols-2 gap-4">
            <BaseInput
              v-model="form.amount"
              label="Amount" type="number" placeholder="0.00"
              min="0.01" step="0.01" required
              :error="fieldErr('amount')"
              @blur="touch('amount')"
            />

            <!-- Category (income & expense only) -->
            <BaseSelect
              v-if="!isTransfer"
              v-model="form.category_id"
              label="Category" required
              placeholder="Select category"
              :options="categoryOpts"
              :error="fieldErr('category_id')"
              @blur="touch('category_id')"
            />
          </div>

          <!-- Account -->
          <BaseSelect
            v-model="form.account_id"
            :label="isTransfer ? 'From account' : 'Account'"
            required placeholder="Select account"
            :options="accountOpts"
            :error="fieldErr('account_id')"
            @blur="touch('account_id')"
          />

          <!-- Destination account (transfer only) -->
          <BaseSelect
            v-if="isTransfer"
            v-model="form.destination_account_id"
            label="To account" required
            placeholder="Select destination"
            :options="destAccountOpts"
            :error="fieldErr('destination_account_id')"
            @blur="touch('destination_account_id')"
          />

          <div class="field">
            <label class="field-label">Notes <span class="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              v-model="form.notes"
              rows="2"
              class="input resize-none"
              placeholder="Optional note…"
            />
          </div>

        </form>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="loading" @click="handleSubmit">
            {{ transaction ? 'Save changes' : 'Add transaction' }}
          </BaseButton>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
