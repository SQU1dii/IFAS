<script setup>
/**
 * CsvColumnMappingWizard — Step 2 of the enhanced CSV import flow.
 *
 * Receives raw CSV headers and first 5 data rows from the backend,
 * lets the user map their bank's columns to IFAS fields,
 * and saves the mapping as a template for future imports from the same bank.
 */
import { ref, computed, watch } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseAlert  from '@/components/common/BaseAlert.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseInput  from '@/components/common/BaseInput.vue'

const emit = defineEmits(['back', 'continue', 'save-template'])

const props = defineProps({
  // Raw headers from the CSV file
  headers: { type: Array, required: true },
  // First 5 rows for preview
  sampleRows: { type: Array, required: true },
  // Previously saved template for this bank (if any)
  savedTemplate: { type: Object, default: null },
})

// ── IFAS required & optional fields ───────────────────────────
const IFAS_FIELDS = [
  { key: 'date',         label: 'Date',            required: true,  hint: 'Transaction date (YYYY-MM-DD or DD/MM/YYYY)' },
  { key: 'description',  label: 'Description',     required: true,  hint: 'Transaction description / narrative' },
  { key: 'amount',       label: 'Amount',          required: true,  hint: 'Transaction amount (positive number)' },
  { key: 'type',         label: 'Type',            required: true,  hint: 'income, expense, or transfer' },
  { key: 'account_id',   label: 'Account',         required: true,  hint: 'Source account ID or name' },
  { key: 'category_id',  label: 'Category',        required: false, hint: 'Category ID or name (optional)' },
  { key: 'destination_account_id', label: 'Destination Account', required: false, hint: 'Required for transfers only' },
  { key: 'notes',        label: 'Notes',           required: false, hint: 'Additional notes (optional)' },
]

// ── Mapping state ─────────────────────────────────────────────
const mapping = ref({})  // { ifasField: csvHeader }

// Initialize from saved template or auto-guess
function initMapping() {
  if (props.savedTemplate?.mapping) {
    mapping.value = { ...props.savedTemplate.mapping }
    return
  }

  // Auto-guess based on common header names
  const guesses = {
    date:         ['date', 'transaction date', 'trans date', 'value date', 'posting date'],
    description:  ['description', 'narrative', 'details', 'particulars', 'transaction details', 'memo'],
    amount:       ['amount', 'value', 'transaction amount', 'debit', 'credit', 'money in', 'money out', 'paid in', 'withdrawn'],
    type:         ['type', 'transaction type', 'dr/cr', 'debit/credit', 'in/out'],
    account_id:   ['account', 'account name', 'account number', 'from account', 'source account'],
    category_id:  ['category', 'category name', 'cat'],
    destination_account_id: ['destination account', 'to account', 'target account', 'beneficiary account'],
    notes:        ['notes', 'remarks', 'reference', 'ref', 'comment'],
  }

  const newMapping = {}
  for (const [ifasKey, keywords] of Object.entries(guesses)) {
    const found = props.headers.find(h => keywords.some(k => h.toLowerCase().includes(k)))
    if (found) newMapping[ifasKey] = found
  }
  mapping.value = newMapping
}

watch(() => props.headers, initMapping, { immediate: true })

// ── Computed ──────────────────────────────────────────────────
const mappedFields = computed(() => Object.keys(mapping.value))
const requiredFields = IFAS_FIELDS.filter(f => f.required).map(f => f.key)
const missingRequired = computed(() => requiredFields.filter(f => !mapping.value[f]))
const isComplete = computed(() => missingRequired.value.length === 0)

// Transformed sample rows for preview
const previewRows = computed(() => {
  return props.sampleRows.slice(0, 5).map(row => {
    const transformed = {}
    for (const field of IFAS_FIELDS) {
      const csvHeader = mapping.value[field.key]
      transformed[field.key] = csvHeader ? row[csvHeader] ?? '' : field.required ? '⚠ NOT MAPPED' : ''
    }
    return transformed
  })
})

// ── Actions ───────────────────────────────────────────────────
function updateMapping(ifasField, csvHeader) {
  mapping.value = { ...mapping.value, [ifasField]: csvHeader || undefined }
}

function handleContinue() {
  if (!isComplete.value) return
  emit('continue', mapping.value)
}

function handleSaveTemplate() {
  const bankName = prompt('Enter a name for this bank template (e.g., "Equity Bank", "KCB"):')
  if (!bankName?.trim()) return

  emit('save-template', {
    name: bankName.trim(),
    mapping: { ...mapping.value },
    headers: [...props.headers],
  })
}

function handleBack() {
  emit('back')
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-navy-800">Map CSV columns to IFAS fields</h3>
        <p class="text-sm text-slate-500 mt-0.5">
          Your CSV headers don't match IFAS exactly. Map each column below — we'll remember this for next time.
        </p>
      </div>
      <BaseButton variant="primary" size="sm" @click="handleSaveTemplate" :disabled="!isComplete">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.05A9.06 9.06 0 005.943 12.003a9.06 9.06 0 009.114 0M3.21 12.003a9.06 9.06 0 019.114 0 9.06 9.06 0 019.114 0m-18.228 0c0 2.86 1.43 5.546 3.816 7.05M21 12a9 9 0 00-9-9" /></svg>
        Save as template
      </BaseButton>
    </div>

    <!-- Mapping form -->
    <div class="bg-slate-50 rounded-xl p-5 space-y-4">
      <template v-for="field in IFAS_FIELDS" :key="field.key">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white rounded-lg border border-slate-200"
             :class="{ 'border-rose-300 bg-rose-50': field.required && !mapping[field.key] }">

          <!-- IFAS field label -->
          <div class="flex items-center gap-2 min-w-[160px] sm:w-40 flex-shrink-0">
            <label class="font-medium text-navy-700 text-sm">{{ field.label }}</label>
            <span v-if="field.required" class="text-rose-500 text-xs" aria-hidden="true">*</span>
          </div>

          <!-- Dropdown to select CSV header -->
          <BaseSelect
            v-model="mapping[field.key]"
            :options="[{ value: '', label: '— Select column —' }, ...props.headers.map(h => ({ value: h, label: h }))]"
            class="flex-1 min-w-0"
            :aria-label="'Map ' + field.label"
            placeholder="— Select column —"
          />

          <!-- Hint -->
          <div class="flex-1 min-w-0">
            <p class="text-xs text-slate-400">{{ field.hint }}</p>
            <p v-if="field.required && !mapping[field.key]" class="text-xs text-rose-600 mt-0.5">
              Required — please select a column
            </p>
          </div>

          <!-- Sample value from first row -->
          <div v-if="previewRows.length" class="text-right sm:w-48 flex-shrink-0">
            <span class="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded"
                  :class="{ 'text-rose-600 bg-rose-50': field.required && !mapping[field.key] }">
              {{ previewRows[0]?.[field.key] ?? '—' }}
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- Preview table -->
    <div v-if="previewRows.length" class="overflow-x-auto rounded-xl border border-slate-200">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200">
            <th class="px-3 py-2 text-left text-slate-500 font-semibold">#</th>
            <th v-for="field in IFAS_FIELDS" :key="field.key" class="px-3 py-2 text-left text-slate-500 font-semibold">
              {{ field.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="(row, i) in previewRows" :key="i">
            <td class="px-3 py-2 text-slate-400">{{ i + 1 }}</td>
            <td v-for="field in IFAS_FIELDS" :key="field.key" class="px-3 py-2">
              <span :class="field.required && !mapping[field.key] ? 'text-rose-600 font-medium' : 'text-navy-800'">
                {{ row[field.key] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="px-3 py-2 text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
        Showing first {{ Math.min(5, props.sampleRows.length) }} rows. {{ props.sampleRows.length }} rows total in file.
      </p>
    </div>

    <!-- Saved template notice -->
    <BaseAlert v-if="props.savedTemplate" variant="info" class="text-sm" dismissible>
      Using saved template: <strong>{{ props.savedTemplate.name }}</strong>
      <template #action>
        <button @click="mapping = {}" class="text-emerald-600 hover:underline text-xs">Clear template</button>
      </template>
    </BaseAlert>

    <!-- Missing required fields warning -->
    <BaseAlert v-if="missingRequired.length" variant="warning" class="text-sm">
      <strong>{{ missingRequired.length }} required field{{ missingRequired.length !== 1 ? 's' : '' }} not mapped:</strong>
      <ul class="list-disc list-inside mt-1 ml-2">
        <li v-for="f in missingRequired" :key="f">
          {{ IFAS_FIELDS.find(x => x.key === f)?.label }}
        </li>
      </ul>
    </BaseAlert>

    <!-- Footer actions -->
    <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
      <BaseButton variant="secondary" @click="handleBack">Back</BaseButton>
      <BaseButton variant="primary" :disabled="!isComplete" @click="handleContinue">
        Continue to Preview →
      </BaseButton>
    </div>
  </div>
</template>