<script setup>
/**
 * CsvImportWizard — four-step CSV import flow with column mapping.
 *
 * Step 1 — Upload:     user selects a CSV file; we parse headers + first 5 rows client-side.
 * Step 2 — Map:        if headers don't match IFAS fields, show column mapping wizard.
 *                      User can save mapping as a bank template for future imports.
 * Step 3 — Preview:    send mapped rows to /transactions/import/preview;
 *                      show row-level errors; user can proceed with valid rows only.
 * Step 4 — Result:     show how many rows were imported.
 *
 * Required CSV columns: date, description, amount, type, account_id
 * Optional:             category_id, destination_account_id, notes
 *
 * The backend is always the authority on what's valid — client parsing is
 * just a convenience to surface obvious errors quickly.
 */
import { ref, computed } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseAlert  from '@/components/common/BaseAlert.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import transactionService from '@/services/transactionService'
import CsvColumnMappingWizard from '@/components/transactions/CsvColumnMappingWizard.vue'

const emit = defineEmits(['done', 'close'])

const step       = ref(1)  // 1=upload, 2=map, 3=preview, 4=result
const file       = ref(null)
const parseError = ref('')
const loading    = ref(false)
const apiError   = ref('')
const preview    = ref(null)  // { preview: Row[], total, valid }
const result     = ref(null)  // { imported, transactions }

// Parsed CSV data (before mapping)
const rawHeaders   = ref([])
const rawRows      = ref([])
const rawSampleRows = ref([])

// Column mapping state
const columnMapping = ref({})
const savedTemplate = ref(null)
const showMappingStep = ref(false)

// Import ID from backend
const importId    = ref(null)

const IFAS_REQUIRED = ['date', 'description', 'amount', 'type', 'account_id']
const IFAS_ALL = [...IFAS_REQUIRED, 'category_id', 'destination_account_id', 'notes']

// ── Helpers ────────────────────────────────────────────────────
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('File must have a header row and at least one data row.')

  // Proper CSV field parser — handles quoted fields containing commas and quotes.
  function parseRow(line) {
    const fields = []
    let current  = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch   = line[i]
      const next = line[i + 1]
      if (inQuotes) {
        if (ch === '"' && next === '"') { current += '"'; i++ }  // escaped quote
        else if (ch === '"')            { inQuotes = false }     // closing quote
        else                            { current += ch }
      } else {
        if (ch === '"')   { inQuotes = true }
        else if (ch === ',') { fields.push(current.trim()); current = '' }
        else              { current += ch }
      }
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseRow(lines[0]).map((h) => h.trim())
  const rows = lines.slice(1).filter((l) => l.trim()).map((line) => {
    const vals = parseRow(line)
    const row  = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })

  return { headers, rows }
}

function headersMatchIfas(headers) {
  const lower = headers.map(h => h.toLowerCase())
  return IFAS_REQUIRED.every(req => lower.includes(req.toLowerCase()))
}

async function handleUpload() {
  if (!file.value) { parseError.value = 'Please select a CSV file.'; return }
  loading.value  = true
  parseError.value = ''
  apiError.value   = ''

  try {
    const text = await file.value.text()
    const { headers, rows } = parseCsv(text)

    rawHeaders.value = headers
    rawRows.value = rows
    rawSampleRows.value = rows.slice(0, 5)

    // Check if headers already match IFAS fields
    if (headersMatchIfas(headers)) {
      // Direct to preview step
      const res = await transactionService.importPreview(rows)
      preview.value = res
      importId.value = res.import_id ?? null
      step.value = 3
      showMappingStep.value = false
    } else {
      // Need column mapping step
      // Check for saved template matching these headers
      const template = findMatchingTemplate(headers)
      if (template) {
        savedTemplate.value = template
        columnMapping.value = { ...template.mapping }
      }
      showMappingStep.value = true
      step.value = 2
    }
  } catch (err) {
    if (typeof err === 'string' || err instanceof Error) {
      parseError.value = err.message ?? String(err)
    } else {
      apiError.value = err?.message ?? 'Preview failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

function findMatchingTemplate(headers) {
  // In a real app, this would come from a backend API or localStorage
  // For now, check localStorage for saved templates
  try {
    const stored = localStorage.getItem('ifas_csv_templates')
    if (stored) {
      const templates = JSON.parse(stored)
      // Match by exact header set
      return templates.find(t => JSON.stringify(t.headers.sort()) === JSON.stringify(headers.sort()))
    }
  } catch {}
  return null
}

function onMappingContinue(mapping) {
  columnMapping.value = mapping
  savedTemplate.value = null

  // Transform raw rows using the mapping
  const mappedRows = rawRows.value.map(row => {
    const mapped = {}
    for (const [ifasField, csvHeader] of Object.entries(mapping)) {
      mapped[ifasField] = row[csvHeader] ?? ''
    }
    return mapped
  })

  // Send to backend for validation
  loading.value = true
  apiError.value = ''
  transactionService.importPreview(mappedRows)
    .then(res => {
      preview.value = res
      importId.value = res.import_id ?? null
      step.value = 3
    })
    .catch(err => {
      apiError.value = err?.message ?? 'Preview failed. Please try again.'
    })
    .finally(() => {
      loading.value = false
    })
}

function onMappingSaveTemplate(payload) {
  // Save to localStorage
  try {
    const stored = localStorage.getItem('ifas_csv_templates')
    const templates = stored ? JSON.parse(stored) : []
    templates.push({
      ...payload,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem('ifas_csv_templates', JSON.stringify(templates))
    savedTemplate.value = payload
  } catch (e) {
    console.warn('Failed to save CSV template:', e)
  }
}

function onMappingBack() {
  step.value = 1
  showMappingStep.value = false
  rawHeaders.value = []
  rawRows.value = []
  rawSampleRows.value = []
  columnMapping.value = {}
  savedTemplate.value = null
}

// ── Step 3: Preview helpers ────────────────────────────────────
const validRows   = computed(() => preview.value?.preview.filter((r) => r.valid) ?? [])
const invalidRows = computed(() => preview.value?.preview.filter((r) => !r.valid) ?? [])

async function handleConfirm() {
  if (!validRows.value.length) return
  loading.value = true
  apiError.value = ''
  try {
    result.value = await transactionService.importConfirm(importId.value, validRows.value)
    step.value = 4
  } catch (err) {
    apiError.value = err?.message ?? 'Import failed. Please try again.'
  } finally {
    loading.value = false
  }
}

function reset() {
  step.value = 1
  file.value = null
  parseError.value = ''
  apiError.value = ''
  preview.value = null
  result.value = null
  importId.value = null
  rawHeaders.value = []
  rawRows.value = []
  rawSampleRows.value = []
  columnMapping.value = {}
  savedTemplate.value = null
  showMappingStep.value = false
}

const TEMPLATE_HEADERS = 'date,description,amount,type,account_id,category_id,destination_account_id,notes'
const TEMPLATE_EXAMPLE = '2025-10-01,Naivas Supermarket,3500,expense,acc-equity,cat-groceries,,Weekly groceries'

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = 'ifas-import-template.csv'; a.click()
  URL.revokeObjectURL(a.href)
}

function downloadRejected() {
  if (!preview.value?.preview) return
  const rejected = preview.value.preview.filter((r) => !r.valid)
  if (!rejected.length) return

  const headers = ['date', 'description', 'amount', 'type', 'account_id', 'category_id', 'destination_account_id', 'notes', 'rejection_reasons']
  const rows = rejected.map((r) => [
    r.data.date         ?? '',
    r.data.description  ?? '',
    r.data.amount       ?? '',
    r.data.type         ?? '',
    r.data.account_id   ?? '',
    r.data.category_id  ?? '',
    r.data.destination_account_id ?? '',
    r.data.notes        ?? '',
    r.errors.map((e) => e.message).join('; '),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'ifas-import-rejected.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <Transition name="modal">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Import transactions from CSV"
    >
      <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="emit('close')" />

      <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <h2 class="text-base font-semibold text-navy-800">Import transactions</h2>
            <!-- Step indicators -->
            <div class="flex items-center gap-1.5" aria-label="Step progress">
              <span
                v-for="s in [1,2,3,4]" :key="s"
                :class="['h-1.5 rounded-full transition-all', s === step ? 'w-6 bg-emerald-500' : s < step ? 'w-3 bg-emerald-300' : 'w-3 bg-slate-200']"
              />
            </div>
          </div>
          <button type="button" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" aria-label="Close" @click="emit('close')">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 max-h-[65vh] overflow-y-auto scrollbar-thin">

          <!-- ── Step 1: Upload ──────────────────────────── -->
          <template v-if="step === 1">
            <p class="text-sm text-slate-500 mb-4">
              Upload a CSV file with your transactions. The first row must be a header row.
            </p>

            <BaseAlert v-if="parseError" variant="error" class="mb-4">{{ parseError }}</BaseAlert>
            <BaseAlert v-if="apiError"   variant="error" class="mb-4">{{ apiError }}</BaseAlert>

            <!-- Required columns -->
            <div class="bg-slate-50 rounded-xl p-4 mb-4 text-xs">
              <p class="font-semibold text-navy-700 mb-1.5">Required columns</p>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="col in ['date', 'description', 'amount', 'type', 'account_id']" :key="col"
                  class="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono text-navy-700">{{ col }}</span>
              </div>
              <p class="font-semibold text-navy-700 mt-2.5 mb-1.5">Optional columns</p>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="col in ['category_id', 'destination_account_id', 'notes']" :key="col"
                  class="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono text-navy-700">{{ col }}</span>
              </div>
              <p class="mt-2 text-slate-500">
                <strong>type</strong> must be <code class="font-mono bg-white px-1 rounded">income</code>,
                <code class="font-mono bg-white px-1 rounded">expense</code>, or
                <code class="font-mono bg-white px-1 rounded">transfer</code>.
                Transfers must have <code class="font-mono bg-white px-1 rounded">destination_account_id</code>
                and no <code class="font-mono bg-white px-1 rounded">category_id</code>.
                Amounts must be positive.
              </p>
            </div>

            <!-- File input -->
            <label class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition" for="csv-upload">
              <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <div class="text-center">
                <p class="text-sm font-medium text-navy-700">
                  {{ file ? file.name : 'Click to select a CSV file' }}
                </p>
                <p class="text-xs text-slate-400 mt-0.5">CSV files only · max 5 MB</p>
              </div>
              <input id="csv-upload" type="file" accept=".csv,text/csv" class="sr-only" @change="onFileChange" />
            </label>
          </template>

          <!-- ── Step 2: Column Mapping ──────────────────── -->
          <template v-else-if="step === 2 && showMappingStep">
            <CsvColumnMappingWizard
              :headers="rawHeaders"
              :sample-rows="rawSampleRows"
              :saved-template="savedTemplate"
              @continue="onMappingContinue"
              @back="onMappingBack"
              @save-template="onMappingSaveTemplate"
            />
          </template>

          <!-- ── Step 3: Preview ────────────────────────── -->
          <template v-else-if="step === 3">
            <BaseAlert v-if="apiError" variant="error" class="mb-4">{{ apiError }}</BaseAlert>

            <div class="flex items-center justify-between mb-3">
              <p class="text-sm text-slate-600">
                <strong class="text-emerald-700">{{ validRows.length }}</strong> valid,
                <strong :class="invalidRows.length ? 'text-rose-600' : 'text-slate-700'">{{ invalidRows.length }}</strong> with errors
                ({{ preview.total }} rows total)
              </p>
              <BaseAlert v-if="invalidRows.length" variant="warning" class="text-xs py-1 px-2">
                Invalid rows will be skipped.
              </BaseAlert>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b border-slate-200">
                    <th class="px-3 py-2 text-left text-slate-500 font-semibold">#</th>
                    <th class="px-3 py-2 text-left text-slate-500 font-semibold">Date</th>
                    <th class="px-3 py-2 text-left text-slate-500 font-semibold">Description</th>
                    <th class="px-3 py-2 text-right text-slate-500 font-semibold">Amount</th>
                    <th class="px-3 py-2 text-left text-slate-500 font-semibold">Type</th>
                    <th class="px-3 py-2 text-left text-slate-500 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="r in preview.preview"
                    :key="r.row"
                    :class="!r.valid ? 'bg-rose-50' : ''"
                  >
                    <td class="px-3 py-2 text-slate-400">{{ r.row }}</td>
                    <td class="px-3 py-2 font-mono text-slate-700">{{ r.data.date }}</td>
                    <td class="px-3 py-2 text-navy-800 max-w-[140px] truncate">{{ r.data.description }}</td>
                    <td class="px-3 py-2 text-right font-mono text-navy-700">KSh {{ Number(r.data.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 }) }}</td>
                    <td class="px-3 py-2 text-slate-600 capitalize">{{ r.data.type }}</td>
                    <td class="px-3 py-2">
                      <span v-if="r.valid" class="text-emerald-600 font-medium">✓ Valid</span>
                      <span v-else class="text-rose-600 font-medium">
                        ✕ {{ r.errors.map(e => e.message).join('; ') }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- ── Step 4: Result ─────────────────────────── -->
          <template v-else>
            <div class="flex flex-col items-center py-8 text-center gap-3">
              <span class="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg class="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <p class="text-lg font-bold text-navy-800">Import complete</p>
              <p class="text-sm text-slate-500">
                <strong class="text-navy-700">{{ result.imported }}</strong> transaction{{ result.imported !== 1 ? 's' : '' }} imported successfully.
              </p>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <BaseButton v-if="step === 1" variant="ghost" size="sm" @click="downloadTemplate">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" /></svg>
            Download template
          </BaseButton>
          <div v-else />

          <div class="flex gap-3">
            <template v-if="step === 1">
              <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
              <BaseButton variant="primary" :loading="loading" @click="handleUpload">
                Parse & Preview
              </BaseButton>
            </template>
            <template v-else-if="step === 3">
              <BaseButton variant="secondary" @click="step = showMappingStep ? 2 : 1">Back</BaseButton>
              <BaseButton v-if="invalidRows.length" variant="ghost" size="sm" @click="downloadRejected">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" /></svg>
                Download rejected ({{ invalidRows.length }})
              </BaseButton>
              <BaseButton variant="primary" :loading="loading" :disabled="!validRows.length" @click="handleConfirm">
                Import {{ validRows.length }} row{{ validRows.length !== 1 ? 's' : '' }}
              </BaseButton>
            </template>
            <template v-else>
              <BaseButton variant="secondary" @click="reset">Import more</BaseButton>
              <BaseButton variant="primary" @click="emit('done')">Done</BaseButton>
            </template>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>