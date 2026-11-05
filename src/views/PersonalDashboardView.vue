<script setup>
/**
 * PersonalDashboardView — F3
 *
 * Personal financial overview:
 *   1. KPI cards (income, expenses, net cash flow, savings rate)
 *   2. Income vs Expenses bar + Spending by Category doughnut
 *   3. Net Cash Flow trend + Budget utilization
 *   4. Recent transactions + Savings goals
 *   5. Insights panel
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useUiStore }       from '@/stores/ui'
import dashboardService     from '@/services/dashboardService'
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

const loading  = ref(true)
const apiError = ref('')
const data     = ref(null)

const currentRange = computed(() => {
  if (ui.rangePreset === 'custom' && ui.customRange) return ui.customRange
  return rangeToIso(resolvePreset(ui.rangePreset))
})

const comparisonRange = computed(() => rangeToIso(previousRange(resolvePreset(ui.rangePreset))))

const presetLabel = computed(() => ({
  this_month: 'This Month', last_month: 'Last Month',
  last_3_months: 'Last 3 Months', this_quarter: 'This Quarter',
  this_year: 'This Year', all_time: 'All Time', custom: 'Custom Range',
}[ui.rangePreset] ?? 'Selected Period'))

async function fetchDashboard() {
  loading.value = true; apiError.value = ''
  try {
    data.value = await dashboardService.getOverview(currentRange.value, comparisonRange.value)
  } catch (err) {
    apiError.value = err?.message ?? 'Failed to load dashboard data. Please refresh.'
  } finally { loading.value = false }
}

onMounted(fetchDashboard)
watch(() => ui.rangePreset, fetchDashboard)
watch(() => ui.customRange, fetchDashboard, { deep: true })

const summary = computed(() => data.value?.summary ?? null)

const netLabel = computed(() => {
  if (!summary.value) return '—'
  const v = summary.value.net_cash_flow
  return `${v >= 0 ? '+' : ''}${formatCurrency(v)}`
})
const netColor = computed(() => !summary.value ? 'blue' : summary.value.net_cash_flow >= 0 ? 'green' : 'red')
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <PageHeader title="Dashboard" :subtitle="`Financial overview · ${presetLabel}`" />

    <BaseAlert v-if="apiError" variant="error" dismissible @dismiss="apiError = ''">{{ apiError }}</BaseAlert>

    <!-- KPI summary cards -->
    <section aria-label="Summary metrics">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard label="Total Income"
          :value="loading ? '—' : formatCurrency(summary?.total_income ?? 0)"
          :change="summary?.period_changes?.income ?? null"
          icon="income" color="green" :loading="loading"
          :subtitle="`Transfers excluded · ${presetLabel}`" />
        <SummaryCard label="Total Expenses"
          :value="loading ? '—' : formatCurrency(summary?.total_expenses ?? 0)"
          :change="summary?.period_changes?.expenses ?? null"
          icon="expenses" color="red" :loading="loading"
          :subtitle="`Transfers excluded · ${presetLabel}`" />
        <SummaryCard label="Net Cash Flow"
          :value="loading ? '—' : netLabel"
          :change="summary?.period_changes?.net_cash_flow ?? null"
          icon="net" :color="netColor" :loading="loading"
          subtitle="Income − Expenses (transfers excluded)" />
        <SummaryCard label="Savings Rate"
          :value="loading ? '—' : formatPercent(summary?.savings_rate ?? 0)"
          icon="savings" color="purple" :loading="loading"
          subtitle="Net Cash Flow ÷ Total Income" />
      </div>
    </section>

    <!-- Charts row -->
    <section aria-label="Spending charts">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BaseCard class="lg:col-span-2" no-pad>
          <div class="px-5 pt-5 pb-3">
            <h2 class="section-title">Income vs Expenses</h2>
            <p class="muted mt-0.5">Monthly comparison · last 7 months</p>
          </div>
          <div class="px-4 pb-5">
            <IncomeExpenseChart :series="data?.monthly_series ?? []" :loading="loading" />
          </div>
        </BaseCard>
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-3">
            <h2 class="section-title">Spending by Category</h2>
            <p class="muted mt-0.5">{{ presetLabel }}</p>
          </div>
          <div class="px-4 pb-5">
            <SpendingByCategoryChart :categories="data?.spending_by_category ?? []" :loading="loading" />
          </div>
          <template v-if="!loading && data?.spending_by_category?.length">
            <div class="border-t border-slate-100 px-5 py-3 space-y-2">
              <div v-for="(cat, i) in data.spending_by_category.slice(0, 5)" :key="cat.name"
                class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs text-slate-400 w-4 shrink-0">{{ i + 1 }}</span>
                  <span class="text-xs font-medium text-navy-700 truncate">{{ cat.name }}</span>
                </div>
                <span class="text-xs font-semibold text-navy-800 tabular-nums shrink-0">{{ formatCurrency(cat.amount) }}</span>
              </div>
            </div>
          </template>
        </BaseCard>
      </div>
    </section>

    <!-- Cash flow + Budgets -->
    <section aria-label="Cash flow and budgets">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-3">
            <h2 class="section-title">Monthly Net Cash Flow</h2>
            <p class="muted mt-0.5">Income − Expenses · transfers excluded</p>
          </div>
          <div class="px-4 pb-5">
            <NetCashFlowChart :series="data?.monthly_series ?? []" :loading="loading" />
          </div>
        </BaseCard>
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-1 flex items-center justify-between">
            <div>
              <h2 class="section-title">Budget Utilization</h2>
              <p class="muted mt-0.5">Current month spending vs limits</p>
            </div>
            <RouterLink to="/budgets" class="text-xs font-medium text-emerald-600 hover:underline shrink-0">Edit</RouterLink>
          </div>
          <div class="px-5 pb-3">
            <BudgetUtilization :budgets="data?.budget_utilization ?? []" :loading="loading" />
          </div>
        </BaseCard>
      </div>
    </section>

    <!-- Transactions + Savings -->
    <section aria-label="Transactions and savings">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-1 flex items-center justify-between">
            <div>
              <h2 class="section-title">Recent Transactions</h2>
              <p class="muted mt-0.5">Last 6 entries</p>
            </div>
            <RouterLink to="/transactions" class="text-xs font-medium text-emerald-600 hover:underline shrink-0">View all</RouterLink>
          </div>
          <div class="px-5 pb-3">
            <RecentTransactions :transactions="data?.recent_transactions ?? []" :loading="loading" />
          </div>
        </BaseCard>
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-1 flex items-center justify-between">
            <div>
              <h2 class="section-title">Savings Goals</h2>
              <p class="muted mt-0.5">Progress toward targets</p>
            </div>
            <RouterLink to="/savings" class="text-xs font-medium text-emerald-600 hover:underline shrink-0">Manage</RouterLink>
          </div>
          <div class="px-5 pb-3">
            <SavingsOverview :goals="data?.savings_goals ?? []" :loading="loading" />
          </div>
        </BaseCard>
      </div>
    </section>

    <!-- Insights -->
    <section aria-label="Insights and alerts">
      <BaseCard no-pad>
        <div class="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
          <svg class="h-[18px] w-[18px] text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <div>
            <h2 class="section-title">Insights &amp; Alerts</h2>
            <p class="muted mt-0.5">Based on actual records · {{ presetLabel }}</p>
          </div>
        </div>
        <div class="p-5">
          <InsightsPanel :insights="data?.insights ?? []" :loading="loading" :period="presetLabel" />
        </div>
      </BaseCard>
    </section>

  </div>
</template>
