<script setup>
/**
 * TransactionFilterBar — search + filter controls for all transaction views.
 *
 * Emits a single `filter` event with the current filter state whenever any
 * control changes, so the parent view only needs one handler.
 *
 * Props
 * ─────
 * modelValue  { search, type, category_id, account_id, from, to }
 * categories  Category[]  – from /categories
 * accounts    Account[]   – from /accounts (active only)
 * hidetype    Boolean     – hide the type selector (Income / Expenses views)
 */
import { reactive, watch } from 'vue'
import BaseInput  from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const props = defineProps({
  modelValue:  { type: Object,  default: () => ({}) },
  categories:  { type: Array,   default: () => [] },
  accounts:    { type: Array,   default: () => [] },
  hideType:    { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'search'])

const f = reactive({
  search:      props.modelValue.search      ?? '',
  type:        props.modelValue.type        ?? '',
  category_id: props.modelValue.category_id ?? '',
  account_id:  props.modelValue.account_id  ?? '',
  from:        props.modelValue.from        ?? '',
  to:          props.modelValue.to          ?? '',
})

// Emit on every change so the parent can decide whether to debounce.
watch(f, () => emit('update:modelValue', { ...f }), { deep: true })

function reset() {
  f.search = ''; f.type = ''; f.category_id = ''; f.account_id = ''; f.from = ''; f.to = ''
}

const typeOptions = [
  { value: 'income',   label: 'Income'   },
  { value: 'expense',  label: 'Expense'  },
  { value: 'transfer', label: 'Transfer' },
]

const categoryOptions = props.categories.map((c) => ({ value: c.id, label: c.name }))
const accountOptions  = props.accounts
  .filter((a) => a.is_active !== false)
  .map((a) => ({ value: a.id, label: a.name }))

const hasFilters = () => f.type || f.category_id || f.account_id || f.from || f.to
</script>

<template>
  <div class="card-pad space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

      <!-- Search -->
      <div class="sm:col-span-2 lg:col-span-1">
        <BaseInput
          v-model="f.search"
          placeholder="Search description…"
          aria-label="Search transactions"
        >
          <template #prefix>
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
            </svg>
          </template>
        </BaseInput>
      </div>

      <!-- Type (hidden when parent locks it) -->
      <BaseSelect
        v-if="!hideType"
        v-model="f.type"
        placeholder="All types"
        :options="typeOptions"
        aria-label="Filter by type"
      />

      <!-- Category -->
      <BaseSelect
        v-model="f.category_id"
        placeholder="All categories"
        :options="categoryOptions"
        aria-label="Filter by category"
      />

      <!-- Account -->
      <BaseSelect
        v-model="f.account_id"
        placeholder="All accounts"
        :options="accountOptions"
        aria-label="Filter by account"
      />
    </div>

    <!-- Date range row -->
    <div class="flex flex-wrap items-end gap-3">
      <div class="flex items-center gap-2">
        <label class="field-label whitespace-nowrap">From</label>
        <input v-model="f.from" type="date" class="input w-auto" aria-label="From date" />
      </div>
      <div class="flex items-center gap-2">
        <label class="field-label whitespace-nowrap">To</label>
        <input v-model="f.to" type="date" class="input w-auto" aria-label="To date" />
      </div>
      <BaseButton v-if="hasFilters()" variant="ghost" size="sm" @click="reset">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Clear filters
      </BaseButton>
    </div>
  </div>
</template>
