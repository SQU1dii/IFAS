<script setup>
/**
 * AnalyticsView — five interactive chart sections.
 *
 * Sections (tab-navigable):
 *   1. Income vs Expenses  — grouped bar, month-by-month
 *   2. Cash Flow           — monthly net + cumulative running balance (line)
 *   3. Spending by Category— doughnut + per-category trend lines
 *   4. Budget Performance  — planned vs actual per budget (multi-line)
 *   5. Savings Trends      — per-goal cumulative balance (multi-line)
 *
 * Filters (shared across all sections):
 *   • Date range      — from / to date pickers (independent of topbar)
 *   • Months          — 3 / 6 / 12 months lookback for trend charts
 *   • Category        — narrows Spending section to one category
 *
 * The frontend displays what the service returns — it never recalculates
 * totals or derives financial figures from raw transactions.
 */
import { ref, computed, watch, onMounted, reactive } from 'vue'
import analyticsService          from '@/services/analyticsService'
import authService               from '@/services/authService'
import { formatCurrency, formatPercent } from '@/utils/format'
import { resolvePreset, rangeToIso } from '@/utils/date'
import { useUiStore }            from '@/stores/ui'

import PageHeader              from '@/components/common/PageHeader.vue'
import BaseCard                from '@/components/common/BaseCard.vue'
import BaseAlert               from '@/components/common/BaseAlert.vue'
import BaseButton              from '@/components/common/BaseButton.vue'
import BaseSelect              from '@/components/common/BaseSelect.vue'
import BaseSpinner             from '@/components/common/BaseSpinner.vue'
import EmptyState              from '@/components/common/EmptyState.vue'
import IncomeExpenseChart      from '@/components/charts/IncomeExpenseChart.vue'
import SpendingByCategoryChart from '@/components/charts/SpendingByCategoryChart.vue'
import TrendLineChart          from '@/components/charts/TrendLineChart.vue'

const ui = useUiStore()

// ── Sections ────────────────────────────────────────────────
const SECTIONS = [
  { id: 'income-expense', label: 'Income vs Expenses',   icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { id: 'cash-flow',      label: 'Cash Flow',            icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5' },
  { id: 'categories',     label: 'Spending by Category', icon: 'M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z' },
  { id: 'budgets',        label: 'Budget Performance',   icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'savings',        label: 'Savings Trends',       icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0' },
]
const activeSection = ref('income-expense')

// ── Filters ─────────────────────────────────────────────────
// Date range (independent of topbar — analytics has its own filters)
const now     = new Date()
const filters = reactive({
  from:       new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10),
  to:         now.toISOString().slice(0, 10),
  months:     6,
  category_id: '',
})

const monthOptions = [
  { value: 3,  label: 'Last 3 months'  },
  { value: 6,  label: 'Last 6 months'  },
  { value: 12, label: 'Last 12 months' },
]

const categories = ref([])
const categoryOptions = computed(() => [
  { value: '', label: 'All categories' },
  ...categories.value.filter((c) => c.type === 'expense').map((c) => ({ value: c.id, label: c.name })),
])

onMounted(async () => {
  try { categories.value = await authService.getCategories() } catch { /* non-critical */ }
  fetchAll()
})

// ── Per-section data ─────────────────────────────────────────
const incomeExpenseData = ref(null)
const cashFlowData      = ref(null)
const categoryData      = ref(null)
const budgetPerfData    = ref(null)
const savingsTrendData  = ref(null)

const loading = reactive({ incomeExpense: false, cashFlow: false, categories: false, budgets: false, savings: false })
const errors  = reactive({ incomeExpense: '', cashFlow: '', categories: '', budgets: '', savings: '' })

async function fetchSection(key, fn, target) {
  loading[key] = true; errors[key] = ''
  try   { target.value = await fn() }
  catch (e) { errors[key] = e?.message ?? 'Failed to load.' }
  finally   { loading[key] = false }
}

async function fetchAll() {
  const p = { from: filters.from, to: filters.to, months: filters.months }
  const catP = { ...p, category_id: filters.category_id || undefined }

  await Promise.all([
    fetchSection('incomeExpense', () => analyticsService.getMonthly({ months: filters.months, ...catP }), incomeExpenseData),
    fetchSection('cashFlow',      () => analyticsService.getCashFlow({ months: filters.months }),          cashFlowData),
    fetchSection('categories',    () => analyticsService.getCategories(catP),                              categoryData),
    fetchSection('budgets',       () => analyticsService.getBudgetPerformance({ months: filters.months }), budgetPerfData),
    fetchSection('savings',       () => analyticsService.getSavingsTrends(),                              savingsTrendData),
  ])
}

// Refetch when filters change (debounce date inputs slightly)
let debounceTimer = null
watch(() => [filters.months, filters.category_id], () => fetchAll())
watch(() => [filters.from, filters.to], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchAll, 400)
})

// ── Chart data builders ──────────────────────────────────────

// Section 1: Income vs Expenses — reuse IncomeExpenseChart (same prop shape)
const incomeExpenseSeries = computed(() => incomeExpenseData.value ?? [])

// Section 2: Cash Flow — monthly net + cumulative
const cashFlowSeries = computed(() => {
  const d = cashFlowData.value
  if (!d) return { series: [], labels: [] }
  const labels = d.monthly.map((m) => m.label)
  return {
    labels,
    series: [
      {
        label: 'Monthly Net',
        data:  d.monthly.map((m) => m.net),
        color: '#10b981',
        fill:  true,
        tension: 0.35,
      },
      {
        label: 'Cumulative',
        data:  d.cumulative_series.map((m) => m.cumulative),
        color: '#3b82f6',
        fill:  false,
        tension: 0.3,
      },
    ],
  }
})

// Section 3: Category doughnut + trend lines
const catDoughnut = computed(() => categoryData.value?.by_category ?? [])

const catTrendSeries = computed(() => {
  const trends = categoryData.value?.category_trends ?? []
  const labels = trends[0]?.series.map((s) => s.label) ?? []
  const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16', '#fb923c']
  const series = trends.slice(0, 6).map((t, i) => ({
    label:   t.name,
    data:    t.series.map((s) => s.amount),
    color:   PALETTE[i % PALETTE.length],
    tension: 0.3,
  }))
  return { labels, series }
})

// Section 4: Budget performance — one line per budget
const budgetPerfSeries = computed(() => {
  const data = budgetPerfData.value ?? []
  if (!data.length) return { series: [], labels: [] }
  const labels = data[0].series.map((s) => s.label)
  const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4']
  const series = data.map((b, i) => ({
    label:  b.category_name,
    data:   b.series.map((s) => s.spent),
    color:  PALETTE[i % PALETTE.length],
    tension: 0.3,
  }))
  // Add limit reference lines (dashed) for each budget
  const limitSeries = data.map((b, i) => ({
    label:   b.category_name + ' limit',
    data:    b.series.map(() => b.limit),
    color:   PALETTE[i % PALETTE.length],
    dashed:  true,
    tension: 0,
  }))
  return { labels, series: [...series, ...limitSeries] }
})

// Section 5: Savings trends — one line per goal
const savingsTrendSeries = computed(() => {
  const data = savingsTrendData.value ?? []
  if (!data.length) return { series: [], labels: [] }
  const allLabels = [...new Set(data.flatMap((g) => g.series.map((s) => s.label)))]
  const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
  const series = data.map((g, i) => {
    const labelToBalance = Object.fromEntries(g.series.map((s) => [s.label, s.balance]))
    return {
      label:   g.goal_name,
      data:    allLabels.map((l) => labelToBalance[l] ?? null),
      color:   PALETTE[i % PALETTE.length],
      fill:    false,
      tension: 0.3,
    }
  })
  return { labels: allLabels, series }
})
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader title="Analytics" subtitle="Interactive charts for all your financial data" />

    <!-- ── Filter bar ──────────────────────────────────────── -->
    <BaseCard class="flex flex-wrap items-end gap-4">
      <div class="flex items-center gap-2">
        <label class="field-label whitespace-nowrap">From</label>
        <input v-model="filters.from" type="date" class="input w-auto" aria-label="From date" />
      </div>
      <div class="flex items-center gap-2">
        <label class="field-label whitespace-nowrap">To</label>
        <input v-model="filters.to" type="date" class="input w-auto" aria-label="To date" />
      </div>
      <div class="w-40">
        <BaseSelect v-model.number="filters.months" :options="monthOptions" aria-label="Months lookback" />
      </div>
      <div class="w-48">
        <BaseSelect
          v-model="filters.category_id"
          :options="categoryOptions"
          aria-label="Filter by category"
        />
      </div>
      <BaseButton variant="secondary" size="sm" @click="fetchAll">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        Refresh
      </BaseButton>
    </BaseCard>

    <!-- ── Section tabs ────────────────────────────────────── -->
    <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Analytics sections">
      <button
        v-for="s in SECTIONS" :key="s.id"
        type="button"
        role="tab"
        :aria-selected="activeSection === s.id"
        :class="[
          'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition',
          activeSection === s.id
            ? 'bg-navy-800 text-white border-navy-800'
            : 'bg-white text-navy-600 border-slate-200 hover:bg-slate-50',
        ]"
        @click="activeSection = s.id"
      >
        <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" :d="s.icon" />
        </svg>
        {{ s.label }}
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 1 — Income vs Expenses                     -->
    <!-- ═══════════════════════════════════════════════════ -->
    <BaseCard v-if="activeSection === 'income-expense'" no-pad role="tabpanel">
      <div class="px-5 pt-5 pb-3 border-b border-slate-100">
        <h2 class="section-title">Income vs Expenses</h2>
        <p class="muted mt-0.5">Monthly comparison · transfers excluded</p>
      </div>
      <BaseAlert v-if="errors.incomeExpense" variant="error" class="m-4">{{ errors.incomeExpense }}</BaseAlert>
      <div class="p-5">
        <IncomeExpenseChart :series="incomeExpenseSeries" :loading="loading.incomeExpense" />
      </div>
      <!-- Monthly summary table -->
      <div v-if="!loading.incomeExpense && incomeExpenseSeries.length" class="border-t border-slate-100 overflow-x-auto">
        <table class="w-full text-sm" aria-label="Monthly income vs expenses">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Income</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Expenses</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Net</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="m in [...incomeExpenseSeries].reverse()" :key="m.label" class="hover:bg-slate-50 transition-colors">
              <td class="px-5 py-2.5 font-medium text-navy-700">{{ m.label }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums text-emerald-700">{{ formatCurrency(m.income) }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums text-rose-600">{{ formatCurrency(m.expenses) }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums font-semibold" :class="m.net >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ m.net >= 0 ? '+' : '' }}{{ formatCurrency(m.net) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 2 — Cash Flow                              -->
    <!-- ═══════════════════════════════════════════════════ -->
    <BaseCard v-if="activeSection === 'cash-flow'" no-pad role="tabpanel">
      <div class="px-5 pt-5 pb-3 border-b border-slate-100">
        <h2 class="section-title">Cash Flow</h2>
        <p class="muted mt-0.5">Monthly net (Income − Expenses) and cumulative running balance · transfers excluded</p>
      </div>
      <BaseAlert v-if="errors.cashFlow" variant="error" class="m-4">{{ errors.cashFlow }}</BaseAlert>
      <div class="p-5">
        <TrendLineChart
          :series="cashFlowSeries.series"
          :labels="cashFlowSeries.labels"
          height="h-72"
          :loading="loading.cashFlow"
        />
      </div>
      <!-- Cumulative table -->
      <div v-if="!loading.cashFlow && cashFlowData?.cumulative_series?.length" class="border-t border-slate-100 overflow-x-auto">
        <table class="w-full text-sm" aria-label="Cumulative cash flow">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Monthly Net</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cumulative</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="(m, i) in [...(cashFlowData?.cumulative_series ?? [])].reverse()" :key="m.month" class="hover:bg-slate-50 transition-colors">
              <td class="px-5 py-2.5 font-medium text-navy-700">{{ m.label }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums font-medium"
                :class="cashFlowData.monthly[cashFlowData.monthly.length - 1 - i]?.net >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                {{ formatCurrency(cashFlowData.monthly[cashFlowData.monthly.length - 1 - i]?.net ?? 0) }}
              </td>
              <td class="px-5 py-2.5 text-right tabular-nums font-semibold"
                :class="m.cumulative >= 0 ? 'text-navy-800' : 'text-rose-600'">
                {{ formatCurrency(m.cumulative) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 3 — Spending by Category                   -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeSection === 'categories'" class="space-y-4" role="tabpanel">
      <BaseAlert v-if="errors.categories" variant="error">{{ errors.categories }}</BaseAlert>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Doughnut -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 class="section-title">Category Breakdown</h2>
            <p class="muted mt-0.5">Share of total expenses by category</p>
          </div>
          <div class="p-5">
            <SpendingByCategoryChart :categories="catDoughnut" :loading="loading.categories" />
          </div>
          <!-- Ranked list -->
          <div v-if="!loading.categories && catDoughnut.length" class="border-t border-slate-100 px-5 py-3 space-y-2">
            <div v-for="(cat, i) in catDoughnut.slice(0, 7)" :key="cat.name" class="flex items-center gap-3">
              <span class="text-xs text-slate-400 w-4 shrink-0">{{ i + 1 }}</span>
              <span class="text-xs font-medium text-navy-700 flex-1 truncate">{{ cat.name }}</span>
              <span class="text-xs font-semibold text-navy-800 tabular-nums shrink-0">{{ formatCurrency(cat.amount) }}</span>
              <span class="text-xs text-slate-400 tabular-nums w-12 text-right shrink-0">
                {{ catDoughnut.length ? formatPercent((cat.amount / catDoughnut.reduce((s, c) => s + c.amount, 0)) * 100) : '' }}
              </span>
            </div>
          </div>
        </BaseCard>

        <!-- Category trend lines -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 class="section-title">Category Trends</h2>
            <p class="muted mt-0.5">Monthly spending per category (top 6)</p>
          </div>
          <div class="p-5">
            <TrendLineChart
              :series="catTrendSeries.series"
              :labels="catTrendSeries.labels"
              height="h-64"
              :loading="loading.categories"
            />
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 4 — Budget Performance                     -->
    <!-- ═══════════════════════════════════════════════════ -->
    <BaseCard v-if="activeSection === 'budgets'" no-pad role="tabpanel">
      <div class="px-5 pt-5 pb-3 border-b border-slate-100">
        <h2 class="section-title">Budget Performance</h2>
        <p class="muted mt-0.5">Actual spending vs budget limit per month · dashed lines are limits</p>
      </div>
      <BaseAlert v-if="errors.budgets" variant="error" class="m-4">{{ errors.budgets }}</BaseAlert>
      <EmptyState v-if="!loading.budgets && !budgetPerfSeries.series.length" title="No budget data" message="Create budgets to see performance charts." icon="chart" />
      <div v-else class="p-5">
        <TrendLineChart
          :series="budgetPerfSeries.series"
          :labels="budgetPerfSeries.labels"
          height="h-80"
          :loading="loading.budgets"
        />
      </div>
      <!-- Budget summary table -->
      <div v-if="!loading.budgets && budgetPerfData?.length" class="border-t border-slate-100 overflow-x-auto">
        <table class="w-full text-sm" aria-label="Budget performance summary">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
              <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Period</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Limit</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Spent</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Peak Spent</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="b in budgetPerfData" :key="b.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-5 py-2.5 font-medium text-navy-700">{{ b.category_name }}</td>
              <td class="px-5 py-2.5 text-slate-500 capitalize hidden sm:table-cell">{{ b.period }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums text-navy-700">{{ formatCurrency(b.limit) }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums font-medium"
                :class="(b.series.reduce((s, m) => s + m.spent, 0) / b.series.length) > b.limit ? 'text-rose-600' : 'text-navy-700'">
                {{ formatCurrency(b.series.reduce((s, m) => s + m.spent, 0) / b.series.length) }}
              </td>
              <td class="px-5 py-2.5 text-right tabular-nums font-semibold"
                :class="Math.max(...b.series.map((m) => m.spent)) > b.limit ? 'text-rose-600' : 'text-navy-700'">
                {{ formatCurrency(Math.max(...b.series.map((m) => m.spent))) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 5 — Savings Trends                         -->
    <!-- ═══════════════════════════════════════════════════ -->
    <BaseCard v-if="activeSection === 'savings'" no-pad role="tabpanel">
      <div class="px-5 pt-5 pb-3 border-b border-slate-100">
        <h2 class="section-title">Savings Trends</h2>
        <p class="muted mt-0.5">Cumulative balance per savings goal over time</p>
      </div>
      <BaseAlert v-if="errors.savings" variant="error" class="m-4">{{ errors.savings }}</BaseAlert>
      <EmptyState v-if="!loading.savings && !savingsTrendSeries.series.length" title="No savings data" message="Add contributions to your savings goals to see trends." icon="savings" />
      <div v-else class="p-5">
        <TrendLineChart
          :series="savingsTrendSeries.series"
          :labels="savingsTrendSeries.labels"
          height="h-72"
          :loading="loading.savings"
          :show-legend="true"
        />
      </div>
      <!-- Goals summary -->
      <div v-if="!loading.savings && savingsTrendData?.length" class="border-t border-slate-100 overflow-x-auto">
        <table class="w-full text-sm" aria-label="Savings goals summary">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Goal</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Current</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Target</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="g in savingsTrendData" :key="g.goal_id" class="hover:bg-slate-50 transition-colors">
              <td class="px-5 py-2.5 font-medium text-navy-700">{{ g.goal_name }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums text-emerald-700">{{ formatCurrency(g.current_amount) }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums text-navy-700">{{ formatCurrency(g.target_amount) }}</td>
              <td class="px-5 py-2.5 text-right tabular-nums font-semibold text-navy-800">
                {{ g.target_amount > 0 ? formatPercent(Math.min(100, (g.current_amount / g.target_amount) * 100)) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

  </div>
</template>
