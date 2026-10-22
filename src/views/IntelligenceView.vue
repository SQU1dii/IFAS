<script setup>
/**
 * IntelligenceView — Financial Intelligence dashboard.
 *
 * Five sections (tab-navigable):
 *   1. Spending Patterns   — per-category avg/trend/observation (rule_based)
 *   2. Unusual Transactions— flagged for review (never "fraud"), z-score based
 *   3. Forecast            — projected income/expenses (estimates, dashed lines)
 *   4. Budget Recommendations — from the insights engine (rule_based)
 *   5. Savings Opportunities  — positive/savings insights from the engine
 *
 * Visual contract (enforced throughout):
 *   • is_estimate: true  → purple "Estimate" pill + italicised values
 *   • is_estimate: false → no extra marker (actual record or rule-based fact)
 *   • source label shown on every card ('rule_based' | 'model')
 *   • Forecast dashed lines + uncertainty range always visible
 *   • disclaimer string rendered verbatim beneath every forecast
 *   • insufficient_data → EmptyState (never fabricated data)
 *   • Empty service response → EmptyState (never hidden silently)
 *   • Anomalies framed as "Transactions for review", not fraud
 */
import { ref, computed, onMounted, reactive } from 'vue'
import intelligenceService from '@/services/intelligenceService'
import { formatCurrency, formatPercent, formatDate } from '@/utils/format'
import { resolvePreset, rangeToIso } from '@/utils/date'

import PageHeader    from '@/components/common/PageHeader.vue'
import BaseCard      from '@/components/common/BaseCard.vue'
import BaseAlert     from '@/components/common/BaseAlert.vue'
import BaseButton    from '@/components/common/BaseButton.vue'
import BaseBadge     from '@/components/common/BaseBadge.vue'
import BaseProgress  from '@/components/common/BaseProgress.vue'
import BaseSpinner   from '@/components/common/BaseSpinner.vue'
import EmptyState    from '@/components/common/EmptyState.vue'
import TrendLineChart from '@/components/charts/TrendLineChart.vue'

// ── Default period (this month) ─────────────────────────────
const { start, end } = rangeToIso(resolvePreset('this_month'))
const from = ref(start)
const to   = ref(end)

// ── Sections ────────────────────────────────────────────────
const SECTIONS = [
  { id: 'patterns',         label: 'Spending Patterns',       icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { id: 'anomalies',        label: 'Unusual Transactions',    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  { id: 'forecast',         label: 'Forecast',                icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' },
  { id: 'budget-recs',      label: 'Budget Recommendations',  icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'savings-ops',      label: 'Savings Opportunities',   icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z' },
]
const activeSection = ref('patterns')

// ── Data stores ─────────────────────────────────────────────
const patternsData  = ref(null)
const anomaliesData = ref(null)
const forecastData  = ref(null)
const insightsData  = ref(null)   // used by budget-recs + savings-ops sections

const loading = reactive({ patterns: false, anomalies: false, forecast: false, insights: false })
const errors  = reactive({ patterns: '',    anomalies: '',    forecast: '',    insights: ''    })

async function fetchSection(key, fn, target) {
  loading[key] = true; errors[key] = ''
  try   { target.value = await fn() }
  catch (e) { errors[key] = e?.message ?? 'Failed to load.' }
  finally   { loading[key] = false }
}

function fetchAll() {
  const p = { from: from.value, to: to.value }
  fetchSection('patterns',  () => intelligenceService.getSpendingPatterns({ months: 6 }), patternsData)
  fetchSection('anomalies', () => intelligenceService.getAnomalies(p),                     anomaliesData)
  fetchSection('forecast',  () => intelligenceService.getForecast({ horizon_months: 3 }),  forecastData)
  fetchSection('insights',  () => intelligenceService.getInsights(p),                      insightsData)
}

onMounted(fetchAll)

// ── Source badge helper ──────────────────────────────────────
const SOURCE = {
  rule_based: { variant: 'blue',   label: 'Rule-based' },
  model:      { variant: 'purple', label: 'ML model'   },
}
function sourceBadge(s) { return SOURCE[s] ?? SOURCE.rule_based }

// ── Trend arrow helper ───────────────────────────────────────
const TREND = {
  increasing: { icon: '↑', class: 'text-rose-600',    label: 'Increasing' },
  decreasing: { icon: '↓', class: 'text-emerald-600', label: 'Decreasing' },
  stable:     { icon: '→', class: 'text-slate-500',   label: 'Stable'     },
}
function trendInfo(t) { return TREND[t] ?? TREND.stable }

// ── Insight type styles (shared with InsightsPanel design) ──
const INSIGHT_STYLE = {
  positive: { wrap: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-500', title: 'text-emerald-800', body: 'text-emerald-700' },
  warning:  { wrap: 'bg-amber-50  border-amber-200',   icon: 'text-amber-500',   title: 'text-amber-800',  body: 'text-amber-700'  },
  alert:    { wrap: 'bg-rose-50   border-rose-200',    icon: 'text-rose-500',    title: 'text-rose-800',   body: 'text-rose-700'   },
  info:     { wrap: 'bg-blue-50   border-blue-200',    icon: 'text-blue-500',    title: 'text-blue-800',   body: 'text-blue-700'   },
}
const INSIGHT_ICON = {
  'trending-up':   'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  'trending-down': 'M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181',
  'alert':         'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  'info':          'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
}

// ── Filtered insight helpers ─────────────────────────────────
const budgetInsights = computed(() =>
  (insightsData.value ?? []).filter((i) => ['alert', 'warning'].includes(i.type))
)
const savingsInsights = computed(() =>
  (insightsData.value ?? []).filter((i) => ['positive', 'info'].includes(i.type))
)

// ── Forecast chart series ────────────────────────────────────
const forecastSeries = computed(() => {
  const d = forecastData.value
  if (!d || d.insufficient_data || !d.forecast?.length) return { labels: [], series: [] }
  const labels = d.forecast.map((f) => f.label)
  return {
    labels,
    series: [
      {
        label:  'Projected Income',
        data:   d.forecast.map((f) => f.projected_income),
        color:  '#10b981',
        fill:   true,
        dashed: true,
        tension: 0.3,
      },
      {
        label:  'Projected Expenses',
        data:   d.forecast.map((f) => f.projected_expenses),
        color:  '#f43f5e',
        fill:   false,
        dashed: true,
        tension: 0.3,
      },
    ],
  }
})
</script>

<template>
  <div class="space-y-5 animate-fade-in">

    <PageHeader
      title="Financial Intelligence"
      subtitle="Spending patterns, unusual activity, and forward-looking estimates"
    />

    <!-- Period filter (shared context) -->
    <BaseCard class="flex flex-wrap items-end gap-4">
      <div class="flex items-center gap-2">
        <label class="field-label whitespace-nowrap">Analysis period — From</label>
        <input v-model="from" type="date" class="input w-auto" aria-label="Period start" />
      </div>
      <div class="flex items-center gap-2">
        <label class="field-label whitespace-nowrap">To</label>
        <input v-model="to" type="date" class="input w-auto" aria-label="Period end" />
      </div>
      <BaseButton variant="secondary" size="sm" @click="fetchAll">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        Refresh
      </BaseButton>
    </BaseCard>

    <!-- Section tabs -->
    <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Intelligence sections">
      <button
        v-for="s in SECTIONS" :key="s.id"
        type="button" role="tab"
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
    <!--  Section 1 — Spending Patterns                      -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeSection === 'patterns'" role="tabpanel" class="space-y-4">
      <BaseAlert v-if="errors.patterns" variant="error">{{ errors.patterns }}</BaseAlert>
      <div v-if="loading.patterns" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>
      <EmptyState
        v-else-if="!patternsData?.length"
        title="No spending patterns found"
        message="Not enough transaction history to analyse spending patterns. Add more transactions and try again."
        icon="chart"
      />
      <template v-else>
        <p class="text-xs text-slate-400">
          Based on the last 6 months of expense transactions · source labeled on each card
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <BaseCard v-for="p in patternsData" :key="p.category_id" class="space-y-3">
            <!-- Header -->
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-semibold text-navy-800">{{ p.category_name }}</h3>
              <div class="flex items-center gap-1.5 shrink-0">
                <BaseBadge :variant="sourceBadge(p.source).variant" size="sm">
                  {{ sourceBadge(p.source).label }}
                </BaseBadge>
              </div>
            </div>

            <!-- Stats row -->
            <div class="grid grid-cols-2 gap-3 text-center">
              <div class="bg-slate-50 rounded-xl py-2.5">
                <p class="text-xs text-slate-500">Total spent</p>
                <p class="text-base font-bold text-navy-800 mt-0.5 tabular-nums">{{ formatCurrency(p.total_spent) }}</p>
              </div>
              <div class="bg-slate-50 rounded-xl py-2.5">
                <p class="text-xs text-slate-500">Avg / month</p>
                <p class="text-base font-bold text-navy-800 mt-0.5 tabular-nums">{{ formatCurrency(p.avg_monthly) }}</p>
              </div>
            </div>

            <!-- Trend indicator -->
            <div class="flex items-center gap-2">
              <span :class="['text-lg font-bold', trendInfo(p.trend).class]" aria-hidden="true">
                {{ trendInfo(p.trend).icon }}
              </span>
              <span :class="['text-xs font-semibold', trendInfo(p.trend).class]">
                {{ trendInfo(p.trend).label }}
              </span>
            </div>

            <!-- Observation -->
            <p class="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2.5">
              {{ p.observation }}
            </p>
          </BaseCard>
        </div>
      </template>
    </div>


    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 2 — Unusual Transactions (for review)      -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeSection === 'anomalies'" role="tabpanel" class="space-y-4">
      <BaseAlert v-if="errors.anomalies" variant="error">{{ errors.anomalies }}</BaseAlert>
      <div v-if="loading.anomalies" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>
      <EmptyState
        v-else-if="!anomaliesData?.length"
        title="No unusual transactions found"
        message="No transactions in this period deviate significantly from your typical spending patterns."
        icon="search"
      />
      <template v-else>
        <!-- Framing note — explicitly NOT fraud detection -->
        <BaseAlert variant="info">
          <strong>Transactions for review</strong> — these entries are significantly higher than your
          typical spending in their category. This is for your awareness only, not a fraud alert.
          Review them to confirm they are expected.
        </BaseAlert>

        <BaseCard no-pad>
          <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <h2 class="section-title">Transactions for Review</h2>
            <BaseBadge variant="amber" size="sm">{{ anomaliesData.length }} flagged</BaseBadge>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Unusual transactions for review">
              <thead>
                <tr class="border-b border-slate-100">
                  <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Category avg</th>
                  <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Above avg</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="a in anomaliesData" :key="a.id"
                  class="hover:bg-amber-50/30 transition-colors"
                >
                  <td class="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{{ formatDate(a.date) }}</td>
                  <td class="px-5 py-3">
                    <p class="font-medium text-navy-800 truncate max-w-[160px]">{{ a.description }}</p>
                    <p class="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{{ a.flag_reason }}</p>
                  </td>
                  <td class="px-5 py-3 text-slate-600 hidden md:table-cell">{{ a.category_name }}</td>
                  <td class="px-5 py-3 text-right font-semibold tabular-nums text-rose-600 whitespace-nowrap">
                    {{ formatCurrency(a.amount) }}
                  </td>
                  <td class="px-5 py-3 text-right tabular-nums text-slate-500 hidden sm:table-cell">
                    {{ formatCurrency(a.category_avg) }}
                  </td>
                  <td class="px-5 py-3 text-right hidden sm:table-cell">
                    <BaseBadge variant="amber" size="sm">+{{ a.deviation_pct }}%</BaseBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </template>
    </div>


    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 3 — Forecast (ESTIMATES, clearly labeled)  -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeSection === 'forecast'" role="tabpanel" class="space-y-4">
      <BaseAlert v-if="errors.forecast" variant="error">{{ errors.forecast }}</BaseAlert>
      <div v-if="loading.forecast" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>

      <!-- Insufficient data -->
      <EmptyState
        v-else-if="forecastData?.insufficient_data"
        title="Not enough data to forecast"
        :message="forecastData.message ?? 'Add more transactions over several months before a forecast can be generated.'"
        icon="chart"
      />

      <template v-else-if="forecastData">
        <!-- Prominent estimate disclaimer -->
        <div class="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3.5" role="note">
          <svg class="h-5 w-5 text-purple-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-purple-800">
              Estimates only — based on {{ forecastData.based_on_months }}-month trend
            </p>
            <p class="text-xs text-purple-700 mt-0.5 leading-relaxed">{{ forecastData.disclaimer }}</p>
          </div>
        </div>

        <!-- Forecast chart — dashed lines = estimates -->
        <BaseCard no-pad>
          <div class="px-5 pt-5 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <h2 class="section-title">Projected Income &amp; Expenses</h2>
              <!-- Estimate pill on every chart heading -->
              <span class="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09z" />
                </svg>
                All values are estimates
              </span>
            </div>
            <p class="muted mt-0.5">Dashed lines indicate projected (not actual) figures</p>
          </div>
          <div class="p-5">
            <TrendLineChart
              :series="forecastSeries.series"
              :labels="forecastSeries.labels"
              height="h-64"
              :loading="false"
            />
          </div>
        </BaseCard>

        <!-- Forecast table with uncertainty ranges -->
        <BaseCard no-pad>
          <div class="px-5 pt-4 pb-2 border-b border-slate-100">
            <h2 class="section-title">Monthly Projections</h2>
            <p class="muted mt-0.5">Uncertainty range shown — actual results will vary</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Monthly forecast projections">
              <thead>
                <tr class="border-b border-slate-100">
                  <th class="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Month</th>
                  <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Income</th>
                  <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Expenses</th>
                  <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Net</th>
                  <th class="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Uncertainty</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="f in forecastData.forecast" :key="f.month"
                  class="hover:bg-purple-50/30 transition-colors"
                >
                  <td class="px-5 py-3 font-medium text-navy-700">
                    <div class="flex items-center gap-2">
                      {{ f.label }}
                      <!-- Estimate pill per row -->
                      <span class="text-xs text-purple-600 italic font-medium">(est.)</span>
                    </div>
                  </td>
                  <td class="px-5 py-3 text-right tabular-nums italic text-emerald-700">
                    {{ formatCurrency(f.projected_income) }}
                  </td>
                  <td class="px-5 py-3 text-right tabular-nums italic text-rose-600">
                    {{ formatCurrency(f.projected_expenses) }}
                  </td>
                  <td class="px-5 py-3 text-right tabular-nums italic font-semibold"
                    :class="f.projected_net >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                    {{ f.projected_net >= 0 ? '+' : '' }}{{ formatCurrency(f.projected_net) }}
                  </td>
                  <td class="px-5 py-3 text-right hidden sm:table-cell">
                    <BaseBadge variant="purple" size="sm">±{{ f.uncertainty_pct }}%</BaseBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="px-5 py-3 border-t border-slate-100">
            <p class="text-xs text-slate-400 italic">
              ⚠ Estimates only. Uncertainty increases with each projected month.
              These figures should not be used as financial plans without professional advice.
            </p>
          </div>
        </BaseCard>
      </template>
    </div>


    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 4 — Budget Recommendations                 -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeSection === 'budget-recs'" role="tabpanel" class="space-y-4">
      <BaseAlert v-if="errors.insights" variant="error">{{ errors.insights }}</BaseAlert>
      <div v-if="loading.insights" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>
      <EmptyState
        v-else-if="!budgetInsights.length"
        title="No budget recommendations"
        message="Your budgets are all on track for this period. Check back after more spending is recorded."
        icon="chart"
      />
      <template v-else>
        <p class="text-xs text-slate-400">
          Based on actual transaction records for the selected period ·
          all items are <strong>rule-based observations</strong>, not predictions
        </p>
        <div class="space-y-3">
          <article
            v-for="insight in budgetInsights" :key="insight.id"
            :class="['rounded-xl border px-4 py-4 flex gap-3 items-start animate-slide-up', INSIGHT_STYLE[insight.type]?.wrap ?? 'bg-slate-50 border-slate-200']"
          >
            <svg
              :class="['h-5 w-5 shrink-0 mt-0.5', INSIGHT_STYLE[insight.type]?.icon ?? 'text-slate-400']"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="INSIGHT_ICON[insight.icon] ?? INSIGHT_ICON.info" />
            </svg>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <p :class="['text-sm font-semibold', INSIGHT_STYLE[insight.type]?.title ?? 'text-navy-800']">
                  {{ insight.title }}
                </p>
                <BaseBadge :variant="sourceBadge(insight.source).variant" size="sm">
                  {{ sourceBadge(insight.source).label }}
                </BaseBadge>
              </div>
              <p :class="['text-sm leading-relaxed', INSIGHT_STYLE[insight.type]?.body ?? 'text-slate-600']">
                {{ insight.message }}
              </p>
              <p v-if="insight.period_from" class="text-xs opacity-60 mt-1.5">
                Period: {{ formatDate(insight.period_from) }} – {{ formatDate(insight.period_to) }}
              </p>
            </div>
          </article>
        </div>
      </template>
    </div>


    <!-- ═══════════════════════════════════════════════════ -->
    <!--  Section 5 — Savings Opportunities                  -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="activeSection === 'savings-ops'" role="tabpanel" class="space-y-4">
      <BaseAlert v-if="errors.insights" variant="error">{{ errors.insights }}</BaseAlert>
      <div v-if="loading.insights" class="flex justify-center py-16"><BaseSpinner size="lg" /></div>
      <EmptyState
        v-else-if="!savingsInsights.length"
        title="No savings opportunities identified"
        message="No positive patterns or savings opportunities were found for this period. Add more transactions over time to improve insight quality."
        icon="savings"
      />
      <template v-else>
        <p class="text-xs text-slate-400">
          Observations based on actual records · source labeled on each item ·
          estimates (if any) are marked with a purple pill
        </p>
        <div class="space-y-3">
          <article
            v-for="insight in savingsInsights" :key="insight.id"
            :class="['rounded-xl border px-4 py-4 flex gap-3 items-start animate-slide-up', INSIGHT_STYLE[insight.type]?.wrap ?? 'bg-slate-50 border-slate-200']"
          >
            <svg
              :class="['h-5 w-5 shrink-0 mt-0.5', INSIGHT_STYLE[insight.type]?.icon ?? 'text-slate-400']"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="INSIGHT_ICON[insight.icon] ?? INSIGHT_ICON.info" />
            </svg>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <!-- Estimate pill — only shown when is_estimate is true -->
                <span
                  v-if="insight.is_estimate"
                  class="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded"
                >
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09z" />
                  </svg>
                  Estimate
                </span>
                <p :class="['text-sm font-semibold', INSIGHT_STYLE[insight.type]?.title ?? 'text-navy-800']">
                  {{ insight.title }}
                </p>
                <BaseBadge :variant="sourceBadge(insight.source).variant" size="sm">
                  {{ sourceBadge(insight.source).label }}
                </BaseBadge>
              </div>
              <p :class="['text-sm leading-relaxed', INSIGHT_STYLE[insight.type]?.body ?? 'text-slate-600']">
                {{ insight.message }}
              </p>
              <p v-if="insight.uncertainty" class="text-xs opacity-60 mt-1 italic">
                {{ insight.uncertainty }}
              </p>
              <p v-if="insight.period_from" class="text-xs opacity-60 mt-1">
                Period: {{ formatDate(insight.period_from) }} – {{ formatDate(insight.period_to) }}
              </p>
            </div>
          </article>
        </div>
      </template>
    </div>

  </div>
</template>
