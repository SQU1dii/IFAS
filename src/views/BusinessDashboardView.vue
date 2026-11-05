<script setup>
/**
 * BusinessDashboardView — F4
 *
 * Sections:
 *   1. KPI cards: income, expenses, net profit, net margin %, open alerts
 *   2. Open alerts panel (dismiss / mark reviewed)
 *   3. Income vs Expenses trend (6-month bar chart)
 *   4. Top expense categories (ranked list + doughnut)
 *   5. Budget vs Actual (table)
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useUiStore }        from '@/stores/ui'
import workspaceService      from '@/services/workspaceService'
import intelligenceService   from '@/services/intelligenceService'
import { formatCurrency, formatPercent } from '@/utils/format'
import { resolvePreset, rangeToIso, previousRange } from '@/utils/date'

import PageHeader              from '@/components/common/PageHeader.vue'
import BaseCard                from '@/components/common/BaseCard.vue'
import BaseAlert               from '@/components/common/BaseAlert.vue'
import BaseBadge               from '@/components/common/BaseBadge.vue'
import BaseButton              from '@/components/common/BaseButton.vue'
import BaseSpinner             from '@/components/common/BaseSpinner.vue'
import EmptyState              from '@/components/common/EmptyState.vue'
import SummaryCard             from '@/components/dashboard/SummaryCard.vue'
import IncomeExpenseChart      from '@/components/charts/IncomeExpenseChart.vue'
import SpendingByCategoryChart from '@/components/charts/SpendingByCategoryChart.vue'

const ws  = useWorkspaceStore()
const ui  = useUiStore()

const loading  = ref(false)
const error    = ref('')
const data     = ref(null)

// ── Date range from topbar picker ───────────────────────
const currentRange = computed(() => {
  if (ui.rangePreset === 'custom' && ui.customRange) return ui.customRange
  return rangeToIso(resolvePreset(ui.rangePreset))
})

const presetLabel = computed(() => ({
  this_month: 'This Month', last_month: 'Last Month',
  last_3_months: 'Last 3 Months', this_quarter: 'This Quarter',
  this_year: 'This Year', all_time: 'All Time',
}[ui.rangePreset] ?? 'Selected Period'))

async function load() {
  if (!ws.wsId) return
  loading.value = true; error.value = ''
  try {
    data.value = await workspaceService.getBusinessDashboard(ws.wsId, currentRange.value)
  } catch (e) {
    error.value = e?.message ?? 'Failed to load dashboard.'
  } finally { loading.value = false }
}

onMounted(load)
watch(() => ui.rangePreset, load)
watch(() => ws.wsId, load)

// ── Alerts ───────────────────────────────────────────────
const alertsLoading = ref(false)

async function dismissAlert(alertId) {
  alertsLoading.value = true
  try {
    await intelligenceService.updateAlert(alertId, 'dismiss')
    if (data.value?.recent_alerts) {
      data.value.recent_alerts = data.value.recent_alerts.filter((a) => a.id !== alertId)
    }
    if (data.value) data.value.open_alerts = Math.max(0, (data.value.open_alerts ?? 1) - 1)
  } catch { /* non-critical */ } finally { alertsLoading.value = false }
}

async function reviewAlert(alertId) {
  try {
    await intelligenceService.updateAlert(alertId, 'review')
    const alert = data.value?.recent_alerts?.find((a) => a.id === alertId)
    if (alert) alert.status = 'reviewed'
  } catch { /* non-critical */ }
}

const severityBadge = { high: 'red', medium: 'amber', low: 'blue' }

// ── KPI helpers ──────────────────────────────────────────
const summary = computed(() => data.value ?? {})
const netProfitColor = computed(() =>
  (data.value?.net_profit ?? 0) >= 0 ? 'green' : 'red'
)
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <PageHeader
      title="Business Dashboard"
      :subtitle="`${ws.active?.name ?? ''} · ${presetLabel}`"
    />

    <BaseAlert v-if="error" variant="error" dismissible @dismiss="error = ''">{{ error }}</BaseAlert>

    <!-- ── 1. KPI cards ─────────────────────────────────── -->
    <section aria-label="Business KPIs">
      <div class="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <SummaryCard label="Total Income"  icon="income"  color="green"
          :value="loading ? '—' : formatCurrency(summary.total_income ?? 0)"
          :change="summary.period_changes?.income ?? null" :loading="loading" />
        <SummaryCard label="Total Expenses" icon="expenses" color="red"
          :value="loading ? '—' : formatCurrency(summary.total_expenses ?? 0)"
          :change="summary.period_changes?.expenses ?? null" :loading="loading" />
        <SummaryCard label="Net Profit" icon="net" :color="netProfitColor"
          :value="loading ? '—' : formatCurrency(summary.net_profit ?? 0)"
          :change="summary.period_changes?.net_profit ?? null" :loading="loading"
          subtitle="Income − Expenses" />
        <SummaryCard label="Net Margin" icon="savings" color="purple"
          :value="loading ? '—' : formatPercent(summary.net_margin_pct ?? 0)"
          :loading="loading" subtitle="Net ÷ Income" />
        <!-- Alert count card -->
        <div class="card-pad flex items-center gap-3 col-span-2 xl:col-span-1">
          <span :class="['shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ring-1', (summary.open_alerts ?? 0) > 0 ? 'bg-rose-50 ring-rose-100' : 'bg-emerald-50 ring-emerald-100']">
            <svg :class="['h-5 w-5', (summary.open_alerts ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-600']" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </span>
          <div>
            <p class="muted">Open alerts</p>
            <p :class="['text-2xl font-bold mt-0.5', (summary.open_alerts ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-700']">
              {{ loading ? '—' : (summary.open_alerts ?? 0) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 2. Open alerts ────────────────────────────────── -->
    <section v-if="!loading && data?.recent_alerts?.length" aria-label="Open alerts">
      <BaseCard no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <h2 class="section-title">Open Alerts</h2>
          <RouterLink to="/intelligence" class="text-xs text-emerald-600 hover:underline">View all →</RouterLink>
        </div>
        <ul class="divide-y divide-slate-100" role="list">
          <li
            v-for="alert in data.recent_alerts"
            :key="alert.id"
            class="flex items-start gap-3 px-5 py-3.5"
          >
            <BaseBadge :variant="severityBadge[alert.severity] ?? 'neutral'" size="sm" class="mt-0.5 shrink-0">
              {{ alert.severity }}
            </BaseBadge>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-navy-800">{{ alert.title }}</p>
              <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">{{ alert.description }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <BaseButton v-if="alert.status === 'open'" variant="ghost" size="sm" @click="reviewAlert(alert.id)">
                Review
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="dismissAlert(alert.id)">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </BaseButton>
            </div>
          </li>
        </ul>
      </BaseCard>
    </section>

    <!-- ── 3 + 4. Charts ─────────────────────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Income vs Expenses bar -->
      <BaseCard class="lg:col-span-2" no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 class="section-title">Income vs Expenses Trend</h2>
          <p class="muted mt-0.5">Last 6 months · transfers excluded</p>
        </div>
        <div class="p-4">
          <IncomeExpenseChart :series="data?.monthly_series ?? []" :loading="loading" />
        </div>
      </BaseCard>

      <!-- Top categories doughnut -->
      <BaseCard no-pad>
        <div class="px-5 pt-4 pb-2 border-b border-slate-100">
          <h2 class="section-title">Top Expense Categories</h2>
        </div>
        <div class="px-4 pt-4">
          <SpendingByCategoryChart :categories="data?.top_expense_categories ?? []" :loading="loading" />
        </div>
        <div v-if="!loading && data?.top_expense_categories?.length" class="px-5 pb-3 mt-2 space-y-1.5">
          <div v-for="(cat, i) in data.top_expense_categories" :key="cat.name" class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs text-slate-400 w-4 shrink-0">{{ i + 1 }}</span>
              <span class="text-xs font-medium text-navy-700 truncate">{{ cat.name }}</span>
            </div>
            <span class="text-xs font-semibold text-navy-800 tabular-nums shrink-0">{{ formatCurrency(cat.amount) }}</span>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- ── 5. Budget vs Actual ───────────────────────────── -->
    <BaseCard v-if="!loading && data?.budget_vs_actual?.length" no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Budget vs Actual</h2>
        <p class="muted mt-0.5">Current period spending against budget limits</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" aria-label="Budget vs actual">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Budget</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actual</th>
              <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Variance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="b in data.budget_vs_actual" :key="b.category_name" class="hover:bg-slate-50 transition-colors">
              <td class="px-5 py-3 font-medium text-navy-700">{{ b.category_name }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-navy-700">{{ formatCurrency(b.budget) }}</td>
              <td class="px-5 py-3 text-right tabular-nums font-medium" :class="b.actual > b.budget ? 'text-rose-600' : 'text-navy-700'">{{ formatCurrency(b.actual) }}</td>
              <td class="px-5 py-3 text-right tabular-nums font-semibold" :class="b.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                {{ b.variance >= 0 ? '+' : '' }}{{ formatCurrency(b.variance) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

  </div>
</template>
