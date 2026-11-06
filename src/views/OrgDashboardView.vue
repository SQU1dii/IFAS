<script setup>
/**
 * OrgDashboardView — F5
 *
 * Sections:
 *   1. KPI cards: total budget, total spent, remaining, utilisation %, open alerts
 *   2. Departments over/near threshold callout
 *   3. Departmental budget table with progress bars + department filter
 *   4. Spending trend by department (6-month line chart)
 *   5. Open alerts panel (dismiss / review)
 *   6. Members summary panel
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useUiStore }        from '@/stores/ui'
import workspaceService      from '@/services/workspaceService'
import intelligenceService   from '@/services/intelligenceService'
import { formatCurrency, formatPercent } from '@/utils/format'
import { resolvePreset, rangeToIso } from '@/utils/date'

import PageHeader       from '@/components/common/PageHeader.vue'
import BaseCard         from '@/components/common/BaseCard.vue'
import BaseAlert        from '@/components/common/BaseAlert.vue'
import BaseBadge        from '@/components/common/BaseBadge.vue'
import BaseButton       from '@/components/common/BaseButton.vue'
import BaseProgress     from '@/components/common/BaseProgress.vue'
import BaseSpinner      from '@/components/common/BaseSpinner.vue'
import EmptyState       from '@/components/common/EmptyState.vue'
import TrendLineChart   from '@/components/charts/TrendLineChart.vue'

const ws  = useWorkspaceStore()
const ui  = useUiStore()

const loading = ref(false)
const error   = ref('')
const data    = ref(null)
const members = ref([])

// Department filter (for the table and trend chart)
const deptFilter = ref('')

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
    data.value = await workspaceService.getOrgDashboard(ws.wsId, {
      ...currentRange.value,
      department: deptFilter.value || undefined,
    })
    // Load members for the members panel
    members.value = await workspaceService.listMembers(ws.wsId)
  } catch (e) {
    error.value = e?.message ?? 'Failed to load dashboard.'
  } finally { loading.value = false }
}

onMounted(load)
watch(() => ui.rangePreset, load)
watch(() => ws.wsId, load)
watch(deptFilter, load)

// ── Filtered departments ─────────────────────────────────
const filteredDepts = computed(() => {
  const depts = data.value?.departments ?? []
  if (!deptFilter.value) return depts
  return depts.filter((d) => d.id === deptFilter.value)
})

const deptOptions = computed(() =>
  (data.value?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))
)

// ── Trend chart for spending per department ──────────────
const trendSeries = computed(() => {
  const monthly = data.value?.monthly_series ?? []
  if (!monthly.length) return { series: [], labels: [] }
  const labels = monthly.map((m) => m.label)
  // In a real implementation the backend returns per-dept series.
  // In mock mode we synthesise one line for the workspace total.
  return {
    labels,
    series: [{
      label: 'Total Spending',
      data:  monthly.map((m) => m.expenses),
      color: '#3b82f6',
      fill: true,
    }],
  }
})

// ── Alerts ───────────────────────────────────────────────
async function dismissAlert(alertId) {
  try {
    await intelligenceService.updateAlert(alertId, 'dismiss')
    if (data.value?.recent_alerts) {
      data.value.recent_alerts = data.value.recent_alerts.filter((a) => a.id !== alertId)
    }
    if (data.value) data.value.open_alerts = Math.max(0, (data.value.open_alerts ?? 1) - 1)
  } catch { /* non-critical */ }
}

async function reviewAlert(alertId) {
  try {
    await intelligenceService.updateAlert(alertId, 'review')
    const a = data.value?.recent_alerts?.find((a) => a.id === alertId)
    if (a) a.status = 'reviewed'
  } catch { /* non-critical */ }
}

const severityBadge = { high: 'red', medium: 'amber', low: 'blue' }

const statusColor = { over: 'red', warning: 'amber', on_track: 'green' }
const statusLabel = { over: 'Over budget', warning: 'Near limit', on_track: 'On track' }
</script>

<template>
  <div class="space-y-6 animate-fade-in">

    <PageHeader
      title="Organisation Dashboard"
      :subtitle="`${ws.active?.name ?? ''} · ${presetLabel}`"
    />

    <BaseAlert v-if="error" variant="error" dismissible @dismiss="error = ''">{{ error }}</BaseAlert>

    <!-- ── 1. KPI cards ────────────────────────────────── -->
    <section aria-label="Organisation KPIs">
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">

        <div class="card-pad">
          <p class="muted">Total Budget</p>
          <p class="text-2xl font-bold text-navy-800 mt-1 tabular-nums">
            {{ loading ? '—' : formatCurrency(data?.total_budget ?? 0) }}
          </p>
        </div>

        <div class="card-pad">
          <p class="muted">Total Spent</p>
          <p class="text-2xl font-bold text-rose-600 mt-1 tabular-nums">
            {{ loading ? '—' : formatCurrency(data?.total_spent ?? 0) }}
          </p>
        </div>

        <div class="card-pad">
          <p class="muted">Remaining</p>
          <p class="text-2xl font-bold mt-1 tabular-nums"
            :class="(data?.total_remaining ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
            {{ loading ? '—' : formatCurrency(data?.total_remaining ?? 0) }}
          </p>
        </div>

        <div class="card-pad">
          <p class="muted">Utilisation</p>
          <p class="text-2xl font-bold text-navy-800 mt-1">
            {{ loading ? '—' : formatPercent(data?.utilization_pct ?? 0) }}
          </p>
          <BaseProgress
            v-if="!loading"
            :value="data?.utilization_pct ?? 0" :max="100"
            :color="(data?.utilization_pct ?? 0) >= 100 ? 'red' : (data?.utilization_pct ?? 0) >= 80 ? 'amber' : 'green'"
            size="sm" class="mt-2"
          />
        </div>

        <div class="card-pad flex items-center gap-3 col-span-2 lg:col-span-1">
          <span :class="['shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ring-1', (data?.open_alerts ?? 0) > 0 ? 'bg-rose-50 ring-rose-100' : 'bg-emerald-50 ring-emerald-100']">
            <svg :class="['h-5 w-5', (data?.open_alerts ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-600']" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </span>
          <div>
            <p class="muted">Open alerts</p>
            <p :class="['text-2xl font-bold mt-0.5', (data?.open_alerts ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-700']">
              {{ loading ? '—' : (data?.open_alerts ?? 0) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 2. Threshold callout ────────────────────────── -->
    <div v-if="!loading && ((data?.departments_over ?? 0) > 0 || (data?.departments_near ?? 0) > 0)" class="flex flex-wrap gap-3">
      <BaseAlert v-if="(data?.departments_over ?? 0) > 0" variant="error" class="flex-1 min-w-[240px]">
        <strong>{{ data.departments_over }} department{{ data.departments_over !== 1 ? 's' : '' }}</strong>
        {{ data.departments_over === 1 ? 'has' : 'have' }} exceeded their budget limit.
      </BaseAlert>
      <BaseAlert v-if="(data?.departments_near ?? 0) > 0" variant="warning" class="flex-1 min-w-[240px]">
        <strong>{{ data.departments_near }} department{{ data.departments_near !== 1 ? 's' : '' }}</strong>
        {{ data.departments_near === 1 ? 'is' : 'are' }} approaching their budget limit (≥ 80%).
      </BaseAlert>
    </div>

    <!-- ── 3. Department budget table ─────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="section-title">Departmental Budget</h2>
          <p class="muted mt-0.5">Budget allocation and spending per department</p>
        </div>
        <!-- Department filter -->
        <div class="flex items-center gap-2">
          <label class="text-xs text-slate-500 whitespace-nowrap" for="dept-filter">Filter:</label>
          <select
            id="dept-filter"
            v-model="deptFilter"
            class="input w-40 text-sm py-1.5"
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            <option v-for="d in deptOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-10"><BaseSpinner size="md" /></div>
      <EmptyState v-else-if="!filteredDepts.length" title="No departments" message="No departments match the current filter." icon="chart" />
      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="dept in filteredDepts"
          :key="dept.id"
          class="px-5 py-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-sm font-semibold text-navy-800 truncate">{{ dept.name }}</p>
              <BaseBadge :variant="statusColor[dept.status] ?? 'neutral'" size="sm">
                {{ statusLabel[dept.status] ?? dept.status }}
              </BaseBadge>
            </div>
            <span class="text-xs text-slate-400 shrink-0">Head: {{ dept.head_name || '—' }}</span>
          </div>

          <BaseProgress
            :value="dept.spent" :max="dept.budget"
            :color="statusColor[dept.status] ?? 'green'"
            size="md"
          />

          <div class="flex flex-wrap justify-between mt-1.5 gap-x-4 text-xs">
            <span class="text-slate-500 tabular-nums">
              {{ formatCurrency(dept.spent) }} of {{ formatCurrency(dept.budget) }}
            </span>
            <span class="font-medium tabular-nums" :class="dept.remaining < 0 ? 'text-rose-600' : 'text-slate-500'">
              {{ dept.remaining >= 0
                ? formatCurrency(dept.remaining) + ' remaining'
                : formatCurrency(Math.abs(dept.remaining)) + ' over budget' }}
            </span>
            <span class="text-slate-400">{{ formatPercent(dept.utilization_pct ?? 0) }} used</span>
          </div>
        </div>
      </div>

      <div v-if="!loading && filteredDepts.length" class="px-5 py-3 border-t border-slate-100">
        <RouterLink to="/departments" class="text-xs font-medium text-emerald-600 hover:underline">
          Manage departments →
        </RouterLink>
      </div>
    </BaseCard>

    <!-- ── 4. Spending trend ────────────────────────────── -->
    <BaseCard no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100">
        <h2 class="section-title">Spending Trend</h2>
        <p class="muted mt-0.5">6-month expense trend</p>
      </div>
      <div class="p-5">
        <TrendLineChart
          :series="trendSeries.series"
          :labels="trendSeries.labels"
          height="h-56"
          :loading="loading"
        />
      </div>
    </BaseCard>

    <!-- ── 5. Open alerts ────────────────────────────────── -->
    <BaseCard v-if="!loading && data?.recent_alerts?.length" no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
        <h2 class="section-title">Open Alerts</h2>
        <RouterLink to="/intelligence" class="text-xs text-emerald-600 hover:underline">View all →</RouterLink>
      </div>
      <ul class="divide-y divide-slate-100" role="list">
        <li v-for="alert in data.recent_alerts" :key="alert.id"
          class="flex items-start gap-3 px-5 py-3.5">
          <BaseBadge :variant="severityBadge[alert.severity] ?? 'neutral'" size="sm" class="mt-0.5 shrink-0">
            {{ alert.severity }}
          </BaseBadge>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-navy-800">{{ alert.title }}</p>
            <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">{{ alert.description }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <BaseButton v-if="alert.status === 'open'" variant="ghost" size="sm" @click="reviewAlert(alert.id)">Review</BaseButton>
            <BaseButton variant="ghost" size="sm" @click="dismissAlert(alert.id)">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </BaseButton>
          </div>
        </li>
      </ul>
    </BaseCard>

    <!-- ── 6. Members summary panel ───────────────────────── -->
    <BaseCard v-if="!loading && members.length" no-pad>
      <div class="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="section-title">Members</h2>
          <p class="muted mt-0.5">{{ members.length }} member{{ members.length !== 1 ? 's' : '' }} in this workspace</p>
        </div>
        <RouterLink to="/members" class="text-xs font-medium text-emerald-600 hover:underline shrink-0">Manage →</RouterLink>
      </div>
      <ul class="divide-y divide-slate-100" role="list">
        <li v-for="m in members.slice(0, 5)" :key="m.id" class="flex items-center gap-3 px-5 py-3">
          <span class="shrink-0 h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">
            {{ m.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-navy-800 truncate">{{ m.name }}</p>
            <p class="text-xs text-slate-400 truncate">{{ m.email }}</p>
          </div>
          <BaseBadge :variant="{ owner: 'purple', admin: 'blue', member: 'green', viewer: 'neutral' }[m.role] ?? 'neutral'" size="sm" class="capitalize shrink-0">
            {{ m.role }}
          </BaseBadge>
        </li>
      </ul>
      <div v-if="members.length > 5" class="px-5 py-2.5 border-t border-slate-100 text-center">
        <RouterLink to="/members" class="text-xs text-emerald-600 hover:underline">
          View all {{ members.length }} members →
        </RouterLink>
      </div>
    </BaseCard>

  </div>
</template>
