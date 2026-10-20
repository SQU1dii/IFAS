<script setup>
/**
 * DashboardView — the main financial overview.
 *
 * Layout (top → bottom):
 *   1. KPI summary cards (income, expenses, net cash flow, savings rate)
 *   2. Income vs Expenses bar chart  |  Spending by Category doughnut
 *   3. Net Cash Flow trend (line)    |  Budget utilization list
 *   4. Recent transactions           |  Savings goals overview
 *   5. Insights & alerts panel
 *
 * Net Cash Flow is defined and displayed as:
 *   Total Income − Total Expenses
 * Transfers between accounts are excluded from both totals because they
 * are not real income or real spending — only money moving between your
 * own accounts.
 *
 * Period comparison: if the previous period has income > 0 the dashboard
 * shows a % change arrow on each KPI. The comparison is computed from the
 * same window length shifted back in time (see utils/date.js).
 *
 * No financial data is hardcoded here. All values come from
 * dashboardService, which reads from either the mock service
 * (VITE_USE_MOCK=true) or the real Express API.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useUiStore }           from '@/stores/ui'
import dashboardService         from '@/services/dashboardService'
import { resolvePreset, rangeToIso, previousRange } from '@/utils/date'
import { formatCurrency, formatPercent } from '@/utils/format'

import PageHeader              from '@/components/common/PageHeader.vue'
import BaseCard                from '@/components/common/BaseCard.vue'
import BaseAlert               from '@/components/common/BaseAlert.vue'
import SummaryCard             from '@/components/dashboard/SummaryCard.vue'
import IncomeExpenseChart      from '@/components/charts/IncomeExpenseChart.vue'
import SpendingByCategoryChart from '@/components/charts/SpendingByCategoryChart.vue'
import NetCashFlowChart        from '@/components/charts/NetCashFlowChart.vue'
import RecentTransactions      from '@/components/dashboard/RecentTransactions.vue'
import BudgetUtilization       from '@/components/dashboard/BudgetUtilization.vue'
import SavingsOverview         from '@/components/dashboard/SavingsOverview.vue'
import InsightsPanel           from '@/components/dashboard/InsightsPanel.vue'

const ui = useUiStore()

// ── Data state ────────────────────────────────────────────
const loading  = ref(true)
const apiError = ref('')
const data     = ref(null)

// ── Derived range (reacts to the topbar date-range picker) ─
const currentRange = computed(() => {
  if (ui.rangePreset === 'custom' && ui.customRange) {
    return ui.customRange
  }
  const resolved = resolvePreset(ui.rangePreset)
  return rangeToIso(resolved)
})

const comparisonRange = computed(() => {
  const resolved = resolvePreset(ui.rangePreset)
  return rangeToIso(previousRange(resolved))
})

const presetLabel = computed(() => {
  const LABELS = {
    this_month: 'This Month', last_month: 'Last Month',
    last_3_months: 'Last 3 Months', this_quarter: 'This Quarter',
    this_year: 'This Year', all_time: 'All Time', custom: 'Custom Range',
  }
  return LABELS[ui.rangePreset] ?? 'Selected Period'
})

// ── Fetch ─────────────────────────────────────────────────
async function fetchDashboard() {
  loading.value  = true
  apiError.value = ''
  try {
    data.value = await dashboardService.getDashboard(
      currentRange.value,
      comparisonRange.value
    )
  } catch (err) {
    apiError.value = err?.message ?? 'Failed to load dashboard data. Please refresh.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
watch(() => ui.rangePreset, fetchDashboard)
watch(() => ui.customRange, fetchDashboard, { deep: true })

// ── Derived summary values ────────────────────────────────
const summary = computed(() => data.value?.summary ?? null)

const netLabel = computed(() => {
  if (!summary.value) return '—'
  const v = summary.value.netCashFlow
  const sign = v >= 0 ? '+' : ''
  return `${sign}${formatCurrency(v)}`
})

// Net cash flow card color: green when positive, red when negative.
const netColor = computed(() => {
  if (!summary.value) return 'blue'
  return summary.value.netCashFlow >= 0 ? 'green' : 'red'
})
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <PageHeader
      title="Dashboard"
      :subtitle="`Financial overview · ${presetLabel}`"
    />

    <!-- API error banner -->
    <BaseAlert v-if="apiError" variant="error" dismissible @dismiss="apiError = ''">
      {{ apiError }}
    </BaseAlert>

    <!-- ── 1. KPI summary cards ─────────────────────────── -->
    <section aria-label="Summary metrics">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <SummaryCard
          label="Total Income"
          :value="loading ? '—' : formatCurrency(summary?.totalIncome ?? 0)"
          :change="summary?.changes?.income ?? null"
          icon="income"
          color="green"
          :loading="loading"
          :subtitle="`Transfers excluded · ${presetLabel}`"
        />

        <SummaryCard
          label="Total Expenses"
          :value="loading ? '—' : formatCurrency(summary?.totalExpenses ?? 0)"
          :change="summary?.changes?.expenses ?? null"
          icon="expenses"
          color="red"
          :loading="loading"
          :subtitle="`Transfers excluded · ${presetLabel}`"
        />

        <!-- Net Cash Flow: Income − Expenses (label shown in subtitle) -->
        <SummaryCard
          label="Net Cash Flow"
          :value="loading ? '—' : netLabel"
          :change="summary?.changes?.netCashFlow ?? null"
          icon="net"
          :color="netColor"
          :loading="loading"
          subtitle="Income − Expenses (transfers excluded)"
        />

        <SummaryCard
          label="Savings Rate"
          :value="loading ? '—' : formatPercent(summary?.savingsRate ?? 0)"
          :change="null"
          icon="savings"
          color="purple"
          :loading="loading"
          subtitle="Net Cash Flow ÷ Total Income"
        />

      </div>
    </section>

    <!-- ── 2. Income vs Expenses  +  Spending by Category ── -->
    <section aria-label="Spending charts">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Income vs Expenses bar chart (spans 2 of 3 columns) -->
        <BaseCard class="lg:col-span-2" no-pad>
          <div class="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 class="section-title">Income vs Expenses</h2>
              <p class="muted mt-0.5">Monthly comparison · last 7 months</p>
            </div>
          </div>
          <div class="px-4 pb-5">
            <IncomeExpenseChart
              :series="data?.monthlySeries ?? []"
              :loading="loading"
            />
          </div>
        </BaseCard>

        <!-- Spending by category doughnut -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-3">
            <h2 class="section-title">Spending by Category</h2>
            <p class="muted mt-0.5">{{ presetLabel }}</p>
          </div>
          <div class="px-4 pb-5">
            <SpendingByCategoryChart
              :categories="data?.spendingByCategory ?? []"
              :loading="loading"
            />
          </div>

          <!-- Ranked list below chart for accessibility and easy scanning -->
          <template v-if="!loading && data?.spendingByCategory?.length">
            <div class="border-t border-slate-100 px-5 py-3 space-y-2">
              <div
                v-for="(cat, i) in (data.spendingByCategory ?? []).slice(0, 5)"
                :key="cat.name"
                class="flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs text-slate-400 w-4 shrink-0">{{ i + 1 }}</span>
                  <span class="text-xs font-medium text-navy-700 truncate">{{ cat.name }}</span>
                </div>
                <span class="text-xs font-semibold text-navy-800 shrink-0 tabular-nums">
                  {{ formatCurrency(cat.amount) }}
                </span>
              </div>
            </div>
          </template>
        </BaseCard>

      </div>
    </section>

    <!-- ── 3. Net Cash Flow trend  +  Budget utilization ─── -->
    <section aria-label="Cash flow and budgets">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Net Cash Flow line chart -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-3">
            <h2 class="section-title">Monthly Net Cash Flow</h2>
            <p class="muted mt-0.5">Income − Expenses per month · transfers excluded</p>
          </div>
          <div class="px-4 pb-5">
            <NetCashFlowChart
              :series="data?.monthlySeries ?? []"
              :loading="loading"
            />
          </div>
        </BaseCard>

        <!-- Budget utilization -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-1 flex items-center justify-between">
            <div>
              <h2 class="section-title">Budget Utilization</h2>
              <p class="muted mt-0.5">Current month spending vs limits</p>
            </div>
            <RouterLink
              to="/budgets"
              class="text-xs font-medium text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded shrink-0"
            >
              Edit budgets
            </RouterLink>
          </div>
          <div class="px-5 pb-3">
            <BudgetUtilization
              :budgets="data?.budgets ?? []"
              :loading="loading"
            />
          </div>
        </BaseCard>

      </div>
    </section>

    <!-- ── 4. Recent transactions  +  Savings goals ─────── -->
    <section aria-label="Transactions and savings">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Recent transactions -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-1 flex items-center justify-between">
            <div>
              <h2 class="section-title">Recent Transactions</h2>
              <p class="muted mt-0.5">Last 6 entries across all accounts</p>
            </div>
            <RouterLink
              to="/transactions"
              class="text-xs font-medium text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded shrink-0"
            >
              View all
            </RouterLink>
          </div>
          <div class="px-5 pb-3">
            <RecentTransactions
              :transactions="data?.recentTransactions ?? []"
              :loading="loading"
            />
          </div>
        </BaseCard>

        <!-- Savings goals -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-1 flex items-center justify-between">
            <div>
              <h2 class="section-title">Savings Goals</h2>
              <p class="muted mt-0.5">Progress toward your targets</p>
            </div>
            <RouterLink
              to="/savings"
              class="text-xs font-medium text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded shrink-0"
            >
              Manage
            </RouterLink>
          </div>
          <div class="px-5 pb-3">
            <SavingsOverview
              :goals="data?.savingsGoals ?? []"
              :loading="loading"
            />
          </div>
        </BaseCard>

      </div>
    </section>

    <!-- ── 5. Insights & alerts ──────────────────────────── -->
    <section aria-label="Insights and alerts">
      <BaseCard no-pad>
        <div class="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <svg class="h-4.5 w-4.5 h-[18px] w-[18px] text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
          <div>
            <h2 class="section-title">Insights &amp; Alerts</h2>
            <p class="muted mt-0.5">Based on actual transaction records · {{ presetLabel }}</p>
          </div>
        </div>
        <div class="p-5">
          <InsightsPanel
            :insights="data?.insights ?? []"
            :loading="loading"
            :period="presetLabel"
          />
        </div>
      </BaseCard>
    </section>

  </div>
</template>
