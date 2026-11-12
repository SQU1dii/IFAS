<script setup>
/**
 * MpesaImportWizard — 4-step M-Pesa PDF statement import wizard.
 *
 * Step 1 — Upload
 *   User selects a PDF. If the file is password-protected (which all
 *   official M-Pesa statements are), they enter their ID/passport number.
 *
 * Step 2 — Extracting
 *   pdfjs-dist loads the PDF, decrypts it, and extracts raw text.
 *   The mpesaParser converts the text into structured transaction rows.
 *   Shows a summary: period, customer name, row counts.
 *
 * Step 3 — Preview & Category Mapping
 *   Every parsed row is shown in a table. The type badge and auto-guessed
 *   category can be changed per row before import. Rows can be excluded.
 *   Transfers are shown with source → destination.
 *
 * Step 4 — Result
 *   Shows how many transactions were imported and links to the
 *   Transactions page.
 *
 * Notes
 * ─────
 * • The M-Pesa account is pre-selected as "M-Pesa" (acc-mpesa).
 *   If the user has no account with that id, they can pick one.
 * • No data is sent anywhere during steps 1–3. The import only fires
 *   in step 3 when the user clicks Confirm.
 * • Wrong password → pdfjs throws PasswordException → shown as a clear
 *   error message.
 */
import { ref, computed, reactive } from 'vue'
import { extractTextFromPdf, parseMpesaText } from '@/utils/mpesaParser'
import transactionService from '@/services/transactionService'
import { formatCurrency, formatDate } from '@/utils/format'
import { useWorkspaceStore } from '@/stores/workspace'

import BaseButton  from '@/components/common/BaseButton.vue'
import BaseAlert   from '@/components/common/BaseAlert.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import BaseBadge   from '@/components/common/BaseBadge.vue'
import BaseInput   from '@/components/common/BaseInput.vue'
import BaseSelect  from '@/components/common/BaseSelect.vue'

const emit = defineEmits(['done', 'close'])

const props = defineProps({
  categories: { type: Array, default: () => [] },
  accounts:   { type: Array, default: () => [] },
})

const ws = useWorkspaceStore()

// ── Step state ────────────────────────────────────────────
const step    = ref(1)   // 1=upload, 2=extracting, 3=preview, 4=result
const error   = ref('')
const loading = ref(false)

// ── Step 1: upload ────────────────────────────────────────
const file     = ref(null)
const password = ref('')
const showPass = ref(false)

function onFileChange(e) {
  file.value  = e.target.files[0] ?? null
  error.value = ''
}

async function handleExtract() {
  if (!file.value) { error.value = 'Please select an M-Pesa PDF statement.'; return }
  loading.value = true; error.value = ''; step.value = 2

  try {
    const rawText = await extractTextFromPdf(file.value, password.value)
    parsed.value  = parseMpesaText(rawText)

    if (!parsed.value.transactions.length) {
      error.value = 'No transactions were found in this PDF. Make sure it is a valid M-Pesa statement and try again.'
      step.value  = 1
      return
    }

    // Build editable rows for the preview step
    rows.value = parsed.value.transactions.map((t, i) => ({
      ...t,
      _id:      i,
      _include: true,
      _catId:   t.category_id   ?? '',
      _catName: t.category_name ?? '',
      _accountId: t.account_id  ?? defaultAccount.value,
    }))

    step.value = 3
  } catch (err) {
    const msg = err?.message ?? ''
    if (msg.toLowerCase().includes('password') || err?.name === 'PasswordException' || err?.code === 1) {
      error.value = 'Incorrect password. M-Pesa statements are protected with your ID/Passport number.'
      step.value  = 1
    } else {
      error.value = `Failed to read the PDF: ${msg || 'unknown error'}. Make sure it is an M-Pesa statement PDF.`
      step.value  = 1
    }
  } finally {
    loading.value = false
  }
}

// ── Step 2: parsed data ───────────────────────────────────
const parsed = ref(null)   // { transactions, summary, meta }
const rows   = ref([])     // editable preview rows

const defaultAccount = computed(() => {
  const mpesa = props.accounts.find((a) =>
    a.type === 'mobile_money' || a.name?.toLowerCase().includes('m-pesa')
  )
  return mpesa?.id ?? (props.accounts[0]?.id ?? '')
})

// ── Step 3: preview helpers ───────────────────────────────
const selectedRows = computed(() => rows.value.filter((r) => r._include))
const skippedRows  = computed(() => rows.value.filter((r) => !r._include))

const categoryOptions = computed(() => [
  { value: '', label: '— Select category —' },
  ...props.categories.map((c) => ({ value: c.id, label: c.name })),
])

const accountOptions = computed(() =>
  props.accounts
    .filter((a) => a.is_active !== false)
    .map((a) => ({ value: a.id, label: a.name }))
)

const typeOptions = [
  { value: 'income',   label: 'Income'   },
  { value: 'expense',  label: 'Expense'  },
  { value: 'transfer', label: 'Transfer' },
]

function typeBadge(type) {
  return { income: 'green', expense: 'red', transfer: 'blue' }[type] ?? 'neutral'
}

function toggleAll(include) {
  rows.value.forEach((r) => (r._include = include))
}

// Update category name when category_id changes in a row
function onCatChange(row, catId) {
  row._catId = catId
  const cat = props.categories.find((c) => c.id === catId)
  row._catName = cat?.name ?? ''
  row.category_id   = catId   || null
  row.category_name = cat?.name ?? null
}

// ── Step 3 → confirm import ───────────────────────────────
const importLoading = ref(false)
const importError   = ref('')
const importResult  = ref(null)

async function handleConfirm() {
  if (!selectedRows.value.length) {
    importError.value = 'No rows selected for import.'
    return
  }

  importLoading.value = true; importError.value = ''

  // Build payloads in the IFAS transaction shape
  const payloads = selectedRows.value.map((r) => ({
    date:                      r.date,
    description:               r.description,
    amount:                    r.amount,
    type:                      r.type,
    category_id:               r.type !== 'transfer' ? (r._catId || null) : null,
    account_id:                r._accountId || defaultAccount.value,
    destination_account_id:    r.type === 'transfer' ? null : null,
    notes:                     r.notes,
  }))

  try {
    // Use the existing CSV import endpoint (same two-step flow):
    // step 1: preview (we pass already-parsed rows as the "rows" array)
    const previewRes = await transactionService.importPreview(payloads)
    // step 2: confirm
    const confirmRes = await transactionService.importConfirm(
      previewRes.import_id ?? 'mpesa',
      previewRes.preview?.filter((r) => r.valid) ?? payloads.map((p, i) => ({ row: i + 1, data: p, valid: true, errors: [] }))
    )
    importResult.value = { imported: confirmRes.imported ?? selectedRows.value.length }
    step.value = 4
  } catch (e) {
    importError.value = e?.message ?? 'Import failed. Please try again.'
  } finally {
    importLoading.value = false
  }
}

// ── Step 4: done ──────────────────────────────────────────
function reset() {
  step.value = 1; file.value = null; password.value = ''
  error.value = ''; parsed.value = null; rows.value = []
  importResult.value = null; importError.value = ''
}
</script>

<template>
  <Transition name="modal">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Import M-Pesa statement"
    >
      <div class="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" @click="emit('close')" />

      <div class="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh]">

        <!-- ── Header ──────────────────────────────────────── -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div class="flex items-center gap-3">
            <!-- M-Pesa logo colour dot -->
            <span class="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">M</span>
            <div>
              <h2 class="text-base font-semibold text-navy-800">Import M-Pesa Statement</h2>
              <p class="text-xs text-slate-500 mt-0.5">Official Safaricom PDF statement</p>
            </div>
            <!-- Step dots -->
            <div class="flex items-center gap-1.5 ml-2" aria-label="Step progress">
              <span v-for="s in [1,2,3,4]" :key="s"
                :class="['h-1.5 rounded-full transition-all', s === step ? 'w-6 bg-emerald-500' : s < step ? 'w-3 bg-emerald-300' : 'w-3 bg-slate-200']" />
            </div>
          </div>
          <button type="button"
            class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            aria-label="Close" @click="emit('close')">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- ── Body ───────────────────────────────────────── -->
        <div class="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">

          <!-- Global error -->
          <BaseAlert v-if="error" variant="error" class="mb-4" dismissible @dismiss="error = ''">{{ error }}</BaseAlert>

          <!-- ══ Step 1: Upload ════════════════════════════ -->
          <template v-if="step === 1">
            <p class="text-sm text-slate-600 mb-4 leading-relaxed">
              Select the M-Pesa PDF statement emailed to you by Safaricom.
              It is password-protected — enter your <strong>ID or Passport number</strong> as the password.
            </p>

            <!-- How to get statement -->
            <div class="bg-slate-50 rounded-xl p-4 mb-5 text-xs text-slate-600 space-y-1.5">
              <p class="font-semibold text-navy-700 mb-2">How to get your M-Pesa statement</p>
              <p>📱 <strong>M-Pesa App:</strong> Home → M-Pesa Statements → Export Statements</p>
              <p>📞 <strong>USSD:</strong> Dial <code class="bg-white px-1 rounded border border-slate-200">*334#</code> → My Account → M-Pesa Statement</p>
              <p>📧 The statement will be emailed as a password-protected PDF.</p>
            </div>

            <!-- File upload zone -->
            <label for="mpesa-pdf-upload"
              class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-green-500 hover:bg-green-50/20 transition">
              <div class="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-navy-700">
                  {{ file ? file.name : 'Click to select M-Pesa PDF' }}
                </p>
                <p class="text-xs text-slate-400 mt-0.5">PDF files only · max 10 MB</p>
              </div>
              <input id="mpesa-pdf-upload" type="file" accept=".pdf,application/pdf" class="sr-only" @change="onFileChange" />
            </label>

            <!-- Password field -->
            <div class="mt-4 field">
              <label class="field-label" for="mpesa-password">
                Statement password
                <span class="text-slate-400 font-normal ml-1">(ID / Passport number)</span>
              </label>
              <div class="relative">
                <input
                  id="mpesa-password"
                  v-model="password"
                  :type="showPass ? 'text' : 'password'"
                  class="input pr-11"
                  placeholder="e.g. 12345678"
                  autocomplete="off"
                />
                <button type="button"
                  :aria-label="showPass ? 'Hide password' : 'Show password'"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
                  @click="showPass = !showPass">
                  <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path v-if="!showPass" stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </button>
              </div>
              <p class="field-hint">Leave blank if the PDF has no password.</p>
            </div>
          </template>

          <!-- ══ Step 2: Extracting ════════════════════════ -->
          <template v-else-if="step === 2">
            <div class="flex flex-col items-center justify-center py-16 gap-5">
              <BaseSpinner size="xl" label="Reading PDF…" />
              <div class="text-center">
                <p class="text-sm font-semibold text-navy-800">Reading your statement…</p>
                <p class="text-xs text-slate-500 mt-1">Extracting and parsing transaction data from the PDF.</p>
              </div>
            </div>
          </template>

          <!-- ══ Step 3: Preview & category mapping ════════ -->
          <template v-else-if="step === 3 && parsed">

            <!-- Statement metadata -->
            <div class="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-xs">
              <div class="flex flex-wrap gap-x-6 gap-y-1 text-green-800">
                <span v-if="parsed.meta.customer_name">
                  <strong>Customer:</strong> {{ parsed.meta.customer_name }}
                </span>
                <span v-if="parsed.summary.period_from">
                  <strong>Period:</strong> {{ formatDate(parsed.summary.period_from) }} – {{ formatDate(parsed.summary.period_to) }}
                </span>
                <span><strong>Total rows:</strong> {{ parsed.summary.total }}</span>
                <span class="text-emerald-700"><strong>Paid in:</strong> {{ formatCurrency(parsed.summary.total_paid_in) }}</span>
                <span class="text-rose-600"><strong>Withdrawn:</strong> {{ formatCurrency(parsed.summary.total_withdrawn) }}</span>
              </div>
            </div>

            <!-- Import error -->
            <BaseAlert v-if="importError" variant="error" class="mb-4" dismissible @dismiss="importError = ''">{{ importError }}</BaseAlert>

            <!-- Row counts + select all -->
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div class="flex items-center gap-2 text-xs text-slate-500">
                <span class="text-emerald-600 font-medium">{{ selectedRows.length }} selected</span>
                <span>·</span>
                <span>{{ skippedRows.length }} excluded</span>
                <span>·</span>
                <span class="text-green-700">{{ parsed.summary.income_count }} income</span>
                <span>·</span>
                <span class="text-rose-600">{{ parsed.summary.expense_count }} expenses</span>
                <span>·</span>
                <span class="text-blue-600">{{ parsed.summary.transfer_count }} transfers</span>
              </div>
              <div class="flex gap-1.5">
                <BaseButton variant="ghost" size="sm" @click="toggleAll(true)">Select all</BaseButton>
                <BaseButton variant="ghost" size="sm" @click="toggleAll(false)">Deselect all</BaseButton>
              </div>
            </div>

            <!-- Preview table -->
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table class="w-full text-xs" aria-label="M-Pesa transactions preview">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200">
                    <th class="px-3 py-2.5 text-left"><input type="checkbox" aria-label="Toggle all" @change="toggleAll($event.target.checked)" class="rounded" /></th>
                    <th class="px-3 py-2.5 text-left text-slate-500 font-semibold uppercase tracking-wide">Date</th>
                    <th class="px-3 py-2.5 text-left text-slate-500 font-semibold uppercase tracking-wide">Description</th>
                    <th class="px-3 py-2.5 text-left text-slate-500 font-semibold uppercase tracking-wide">Type</th>
                    <th class="px-3 py-2.5 text-left text-slate-500 font-semibold uppercase tracking-wide">Category</th>
                    <th class="px-3 py-2.5 text-right text-slate-500 font-semibold uppercase tracking-wide">Paid In</th>
                    <th class="px-3 py-2.5 text-right text-slate-500 font-semibold uppercase tracking-wide">Withdrawn</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="row in rows"
                    :key="row._id"
                    :class="['transition-colors', !row._include ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50']"
                  >
                    <!-- Include toggle -->
                    <td class="px-3 py-2.5">
                      <input
                        type="checkbox"
                        v-model="row._include"
                        :aria-label="'Include ' + row.description"
                        class="rounded"
                      />
                    </td>
                    <!-- Date -->
                    <td class="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">{{ row.date }}</td>
                    <!-- Description -->
                    <td class="px-3 py-2.5 max-w-[200px]">
                      <p class="font-medium text-navy-800 truncate" :title="row.description">{{ row.description }}</p>
                      <p v-if="row.type === 'transfer' && row.destination_account_name" class="text-slate-400 truncate">
                        → {{ row.destination_account_name }}
                      </p>
                    </td>
                    <!-- Type selector -->
                    <td class="px-3 py-2.5">
                      <select
                        v-model="row.type"
                        class="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white text-navy-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        :aria-label="'Type for ' + row.description"
                      >
                        <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                      </select>
                    </td>
                    <!-- Category selector -->
                    <td class="px-3 py-2.5">
                      <template v-if="row.type === 'transfer'">
                        <span class="text-slate-400 italic text-xs">N/A</span>
                      </template>
                      <template v-else>
                        <select
                          :value="row._catId"
                          class="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white text-navy-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[160px]"
                          :aria-label="'Category for ' + row.description"
                          @change="onCatChange(row, $event.target.value)"
                        >
                          <option value="">— Pick category —</option>
                          <option
                            v-for="cat in categories.filter((c) => c.type !== 'transfer')"
                            :key="cat.id"
                            :value="cat.id"
                          >
                            {{ cat.name }}
                          </option>
                        </select>
                        <span v-if="!row._catId" class="text-amber-500 ml-1 text-[10px]">⚠</span>
                      </template>
                    </td>
                    <!-- Paid In -->
                    <td class="px-3 py-2.5 text-right tabular-nums">
                      <span v-if="row._raw.paid_in > 0" class="text-emerald-600 font-semibold">
                        {{ formatCurrency(row._raw.paid_in) }}
                      </span>
                      <span v-else class="text-slate-300">—</span>
                    </td>
                    <!-- Withdrawn -->
                    <td class="px-3 py-2.5 text-right tabular-nums">
                      <span v-if="row._raw.withdrawn > 0" class="text-rose-600 font-semibold">
                        {{ formatCurrency(row._raw.withdrawn) }}
                      </span>
                      <span v-else class="text-slate-300">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="text-xs text-slate-400 mt-2">
              ⚠ Rows without a category will be imported as uncategorised. You can assign categories later in the Transactions page.
            </p>
          </template>

          <!-- ══ Step 4: Result ════════════════════════════ -->
          <template v-else-if="step === 4">
            <div class="flex flex-col items-center py-10 text-center gap-4">
              <span class="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <p class="text-xl font-bold text-navy-800">Import complete</p>
                <p class="text-sm text-slate-500 mt-1">
                  <strong class="text-navy-700">{{ importResult?.imported }}</strong>
                  M-Pesa transaction{{ importResult?.imported !== 1 ? 's' : '' }} imported successfully.
                </p>
              </div>
            </div>
          </template>

        </div><!-- /body -->

        <!-- ── Footer ──────────────────────────────────────── -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">

          <div>
            <!-- Step 1: how-to link -->
            <a v-if="step === 1"
              href="https://www.safaricom.co.ke/personal/m-pesa/do-more-with-m-pesa/m-pesa-statement"
              target="_blank" rel="noopener"
              class="text-xs text-emerald-600 hover:underline">
              How to get my statement ↗
            </a>
          </div>

          <div class="flex gap-3">
            <!-- Step 1 -->
            <template v-if="step === 1">
              <BaseButton variant="secondary" @click="emit('close')">Cancel</BaseButton>
              <BaseButton variant="primary" :loading="loading" :disabled="!file" @click="handleExtract">
                Read statement
              </BaseButton>
            </template>

            <!-- Step 3 -->
            <template v-else-if="step === 3">
              <BaseButton variant="secondary" @click="step = 1; parsed = null; rows = []">Back</BaseButton>
              <BaseButton
                variant="primary"
                :loading="importLoading"
                :disabled="!selectedRows.length"
                @click="handleConfirm"
              >
                Import {{ selectedRows.length }} transaction{{ selectedRows.length !== 1 ? 's' : '' }}
              </BaseButton>
            </template>

            <!-- Step 4 -->
            <template v-else-if="step === 4">
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
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
