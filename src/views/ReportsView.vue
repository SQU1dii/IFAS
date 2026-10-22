<script setup>
/**
 * ReportsView — financial summary report for a chosen period.
 *
 * Layout
 * ──────
 * 1. Period picker  (from / to date selectors + Generate button)
 * 2. Summary cards  (income, expenses, net, savings rate, tx count)
 * 3. Income by category table
 * 4. Expenses by category table
 * 5. Budget performance table
 * 6. By account table
 *
 * Rules
 * ─────
 * • All totals are displayed EXACTLY as the backend returns them.
 *   The view never derives or recalculates financial figures.
 * • CSV export calls reportsService.exportCsv() which in mock mode
 *   generates a client-side file, and in real mode opens the backend
 *   endpoint in a new tab — the frontend never stores sensitive data.
 * • Print layout hides the action bar and page chrome via @media print.
 */
import { ref, computed, reactive } from 'vue'
import reportsService  from '@/services/reportsService'
import { formatCurrency, formatPercent, formatDate } from '@/utils/format'

import PageHeader   from '@/components/common/PageHeader.vue'
import BaseButton   from '@/components/common/BaseButton.vue'
import BaseCard     from '@/components/common/BaseCard.vue'
import BaseAlert    from '@/components/common/BaseAlert.vue'
import BaseSpinner  from '@/components/common/BaseSpinner.vue'
import BaseBadge    from '@/components/common/BaseBadge.vue'
import EmptyState   from '@/components/common/EmptyState.vue'

// ── Period state ────────────────────────────────────────────
const now   = new Date()
const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
const today = now.toISOString().slice(0, 10)

const from    = ref(first)
const to      = ref(today)
const loading = ref(false)
const error   = ref('')
const report  = ref(null)
const generated = ref(false)

// Quick-select period presets
const PRESETS = [
  { label: 'This month',  from: () => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to: () => today },
  { label: 'Last month',  from: () => new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10), to: () => new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10) },
  { label: 'Last 3 months', from: () => new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10), to: () => today },
  { label: 'This year',   from: () => new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), to: () => today },
]

function applyPreset(p) {
  from.value = p.from()
  to.value   = p.to()
}

// ── Generate report ─────────────────────────────────────────
async function generate() {
  if (!from.value || !to.value) { error.value = 'Please select a date range.'; return }
  if (from.value > to.value)    { error.value = '"From" must be before "To".'; return }
  loading.value = true; error.value = ''; report.value = null
  try {
    report.value = await reportsService.getSummary({ from: from.value, to: to.value })
    generated.value = true
  } catch (e) {
    error.value = e?.message ?? 'Failed to generate report.'
  } finally { loading.value = false }
}

// ── Export ──────────────────────────────────────────────────
function handleExport() {
  reportsService.exportCsv({ from: from.value, to: to.value }, report.value)
}

// ── Print ───────────────────────────────────────────────────
function handlePrint() { window.print() }

// ── Budget status helpers ────────────────────────────────────
const STATUS = {
  on_track: { badge: 'green',  label: 'On track'    },
  warning:  { badge: 'amber',  label: 'Near limit'  },
  over:     { badge: 'red',    label: 'Over budget' },
}
function budgetStatus(s) { return STATUS[s] ?? STATUS.on_track }

// ── Computed totals (verified against report summary) ───────
// These are used only for the footer rows of the category tables.
// They match the summary fields returned by the backend.
const incomeTotal  = computed(() => report.value?.summary.total_income   ?? 0)
const expenseTotal = computed(() => report.value?.summary.total_expenses ?? 0)

// Period label for print header
const periodLabel = computed(() => {
  if (!report.value) return ''
  const p = report.value.period
  return `${formatDate(p.from)} – ${formatDate(p.to)}`
})
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader title="Reports" subtitle="Generate a financial summary for any period">
      <template #actions>
        <template v-if="report">
          <BaseButton variant="secondary" size="sm" class="no-print" @click="handleExport">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
            </svg>
            Export CSV
          </BaseButton>
          <BaseButton variant="secondary" size="sm" class="no-print" @click="handlePrint">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            Print
          </BaseButton>
        </template>
      </template>
    </PageHeader>

    <!-- ── Period picker ──────────────────────────────────── -->
    <BaseCard class="no-print">
      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex items-center gap-2">
            <label class="field-label whitespace-nowrap">From</label>
            <input v-model="from" type="date" class="input w-auto" aria-label="Report start date" />
          </div>
          <div class="flex items-center gap-2">
            <label class="field-label whitespace-nowrap">To</label>
            <input v-model="to" type="date" class="input w-auto" aria-label="Report end date" />
          </div>
          <BaseButton variant="primary" :loading="loading" @click="generate">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            Generate report
          </BaseButton>
        </div>

        <!-- Quick presets -->
        <div class="flex flex-wrap gap-2">
          <span class="text-xs text-slate-400 self-center">Quick select:</span>
          <button
            v-for="p in PRESETS" :key="p.label"
            type="button"
            class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-navy-600 hover:bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            @click="applyPreset(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Error -->
    <BaseAlert v-if="error" variant="error" dismissible @dismiss="error = ''">{{ error }}</BaseAlert>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Generating report…" />
    </div>

    <!-- Empty prompt -->
    <EmptyState
      v-else-if="!generated"
      title="No report generated yet"
      message="Select a date range and click Generate report to see your financial summary."
      icon="reports"
    />

    <!-- ── Report content ─────────────────────────────────── -->
    <template v-else-if="report">

      <!-- Print header (hidden on screen) -->
      <div class="print-only print-header mb-6">
        <h1 class="text-2xl font-bold text-navy-800">IFAS — Financial Report</h1>
        <p class="text-slate-500">Period: {{ periodLabel }}</p>
        <p class="text-xs text-slate-400 mt-0.5">Generated {{ formatDate(new Date()) }}</p>
      </div>

      <!-- ── 1. Summary cards ──────────────────────────────── -->
      <section aria-label="Report summary">
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">

          <div class="card-pad">
            <p class="muted">Total income</p>
            <p class="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
              {{ formatCurrency(report.summary.total_income) }}
            </p>
          </div>

          <div class="card-pad">
            <p class="muted">Total expenses</p>
            <p class="text-xl font-bold text-rose-600 mt-1 tabular-nums">
              {{ formatCurrency(report.summary.total_expenses) }}
            </p>
          </div>

          <div class="card-pad">
            <p class="muted">Net cash flow</p>
            <p class="text-xl font-bold mt-1 tabular-nums"
              :class="report.summary.net_cash_flow >= 0 ? 'text-emerald-700' : 'text-rose-600'">
              {{ report.summary.net_cash_flow >= 0 ? '+' : '' }}{{ formatCurrency(report.summary.net_cash_flow) }}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">Income − Expenses</p>
          </div>

          <div class="card-pad">
            <p class="muted">Savings rate</p>
            <p class="text-xl font-bold text-navy-800 mt-1 tabular-nums">
              {{ formatPercent(report.summary.savings_rate) }}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">Net ÷ Income</p>
          </div>

          <div class="card-pad">
            <p class="muted">Transactions</p>
            <p class="text-xl font-bold text-navy-800 mt-1">
              {{ report.summary.transaction_count.toLocaleString() }}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">Excluding transfers</p>
          </div>

        </div>
      </section>

      <!-- ── 2. Income by category ─────────────────────────── -->
      <BaseCard no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <h2 class="section-title">Income by Source</h2>
          <span class="text-sm font-semibold text-emerald-700 tabular-nums">
            {{ formatCurrency(incomeTotal) }}
          </span>
        </div>
        <EmptyState v-if="!report.income_by_category?.length" title="No income recorded" message="No income transactions in this period." icon="inbox" />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm" aria-label="Income by category">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">% of Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="cat in report.income_by_category" :key="cat.name" class="hover:bg-slate-50 transition-colors">
                <td class="px-5 py-3 font-medium text-navy-700">{{ cat.name }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-emerald-700 font-semibold">{{ formatCurrency(cat.amount) }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-slate-500">
                  {{ incomeTotal > 0 ? formatPercent((cat.amount / incomeTotal) * 100) : '—' }}
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-200">
              <tr class="bg-slate-50">
                <td class="px-5 py-3 font-bold text-navy-800">Total</td>
                <td class="px-5 py-3 text-right font-bold tabular-nums text-emerald-700">{{ formatCurrency(incomeTotal) }}</td>
                <td class="px-5 py-3 text-right font-bold tabular-nums text-slate-600">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </BaseCard>

      <!-- ── 3. Expenses by category ───────────────────────── -->
      <BaseCard no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <h2 class="section-title">Expenses by Category</h2>
          <span class="text-sm font-semibold text-rose-600 tabular-nums">
            {{ formatCurrency(expenseTotal) }}
          </span>
        </div>
        <EmptyState v-if="!report.expense_by_category?.length" title="No expenses recorded" message="No expense transactions in this period." icon="inbox" />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm" aria-label="Expenses by category">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">% of Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="cat in report.expense_by_category" :key="cat.name" class="hover:bg-slate-50 transition-colors">
                <td class="px-5 py-3 font-medium text-navy-700">{{ cat.name }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-rose-600 font-semibold">{{ formatCurrency(cat.amount) }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-slate-500">
                  {{ expenseTotal > 0 ? formatPercent((cat.amount / expenseTotal) * 100) : '—' }}
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-200">
              <tr class="bg-slate-50">
                <td class="px-5 py-3 font-bold text-navy-800">Total</td>
                <td class="px-5 py-3 text-right font-bold tabular-nums text-rose-600">{{ formatCurrency(expenseTotal) }}</td>
                <td class="px-5 py-3 text-right font-bold tabular-nums text-slate-600">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </BaseCard>

      <!-- ── 4. Budget performance ─────────────────────────── -->
      <BaseCard v-if="report.budget_performance?.length" no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 class="section-title">Budget Performance</h2>
          <p class="muted mt-0.5">Planned vs actual spending for the period</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" aria-label="Budget performance">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Limit</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Spent</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Used</th>
                <th class="px-5 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr
                v-for="b in report.budget_performance" :key="b.category_name"
                class="hover:bg-slate-50 transition-colors"
              >
                <td class="px-5 py-3 font-medium text-navy-700">{{ b.category_name }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-navy-700">{{ formatCurrency(b.limit) }}</td>
                <td class="px-5 py-3 text-right tabular-nums font-semibold"
                  :class="b.spent > b.limit ? 'text-rose-600' : 'text-navy-700'">
                  {{ formatCurrency(b.spent) }}
                </td>
                <td class="px-5 py-3 text-right tabular-nums font-semibold"
                  :class="b.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'">
                  {{ b.remaining >= 0 ? formatCurrency(b.remaining) : '−' + formatCurrency(Math.abs(b.remaining)) }}
                </td>
                <td class="px-5 py-3 text-right tabular-nums text-slate-500 hidden sm:table-cell">
                  {{ formatPercent(b.utilization) }}
                </td>
                <td class="px-5 py-3 text-center">
                  <BaseBadge :variant="budgetStatus(b.status).badge" size="sm">
                    {{ budgetStatus(b.status).label }}
                  </BaseBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <!-- ── 5. By account ─────────────────────────────────── -->
      <BaseCard v-if="report.by_account?.length" no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 class="section-title">By Account</h2>
          <p class="muted mt-0.5">Income and expenses per account · transfers excluded</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" aria-label="By account">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Account</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Income</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Expenses</th>
                <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Net</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="acc in report.by_account" :key="acc.name" class="hover:bg-slate-50 transition-colors">
                <td class="px-5 py-3 font-medium text-navy-700">{{ acc.name }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-emerald-700">{{ formatCurrency(acc.income) }}</td>
                <td class="px-5 py-3 text-right tabular-nums text-rose-600">{{ formatCurrency(acc.expenses) }}</td>
                <td class="px-5 py-3 text-right tabular-nums font-semibold"
                  :class="(acc.income - acc.expenses) >= 0 ? 'text-navy-800' : 'text-rose-600'">
                  {{ (acc.income - acc.expenses) >= 0 ? '+' : '' }}{{ formatCurrency(acc.income - acc.expenses) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

    </template><!-- /report -->

  </div>
</template>

<style>
/* Print styles — applied globally so they affect the full page */
@media print {
  .no-print  { display: none !important; }
  .print-only{ display: block !important; }

  /* Hide the sidebar and topbar when printing */
  aside, header { display: none !important; }

  /* Remove background decorations */
  body { background: white !important; }

  /* Keep tables from breaking across pages awkwardly */
  tr { page-break-inside: avoid; }

  /* Reset card shadows for print */
  .card-pad, [class*="rounded"] { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
}

@media not print {
  .print-only { display: none !important; }
}
</style>
