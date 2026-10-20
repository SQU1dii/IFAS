<script setup>
/**
 * SummaryCard — one of the four KPI tiles at the top of the dashboard.
 *
 * Shows a labelled metric with an icon, optional period-over-period change
 * indicator, and a subtle loading skeleton while data is fetching.
 *
 * Props
 * ─────
 * label       string  Card heading (e.g. "Total Income")
 * value       string  Formatted value to display prominently
 * change      number|null  Percentage change vs previous period (null hides it)
 * icon        string  One of: income | expenses | net | savings
 * color       string  One of: green | red | blue | purple
 * loading     boolean Show skeleton instead of real data
 * subtitle    string  Optional small line below the value
 */
import { computed } from 'vue'

const props = defineProps({
  label:    { type: String,  required: true },
  value:    { type: String,  default: '—' },
  change:   { type: Number,  default: null },
  icon:     { type: String,  default: 'income' },
  color:    { type: String,  default: 'green' },
  loading:  { type: Boolean, default: false },
  subtitle: { type: String,  default: '' },
})

const colorMap = {
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  red:    { bg: 'bg-rose-50',    icon: 'text-rose-500',    ring: 'ring-rose-100'    },
  blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'ring-blue-100'    },
  purple: { bg: 'bg-purple-50',  icon: 'text-purple-600',  ring: 'ring-purple-100'  },
}

const c = computed(() => colorMap[props.color] ?? colorMap.green)

const changePositive = computed(() => props.change !== null && props.change > 0)
const changeNegative = computed(() => props.change !== null && props.change < 0)
const changeLabel    = computed(() => {
  if (props.change === null) return null
  const sign = props.change > 0 ? '+' : ''
  return `${sign}${props.change.toFixed(1)}% vs previous period`
})

const iconPaths = {
  income:   'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  expenses: 'M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181',
  net:      'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  savings:  'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}
</script>

<template>
  <div class="card-pad relative overflow-hidden">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-2 flex-1">
          <div class="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
          <div class="h-7 w-32 bg-slate-200 rounded animate-pulse" />
          <div class="h-3 w-20 bg-slate-200 rounded animate-pulse" />
        </div>
        <div class="h-11 w-11 rounded-xl bg-slate-200 animate-pulse shrink-0" />
      </div>
    </template>

    <!-- Real content -->
    <template v-else>
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-500 truncate">{{ label }}</p>
          <p class="mt-1 text-2xl font-bold text-navy-800 leading-none tracking-tight">
            {{ value }}
          </p>
          <p v-if="subtitle" class="mt-1 text-xs text-slate-400 truncate">{{ subtitle }}</p>

          <!-- Period comparison badge -->
          <div v-if="changeLabel" class="mt-2 flex items-center gap-1">
            <svg
              :class="['h-3.5 w-3.5', changePositive ? 'text-emerald-500' : changeNegative ? 'text-rose-500' : 'text-slate-400']"
              fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true"
            >
              <path
                stroke-linecap="round" stroke-linejoin="round"
                :d="changePositive ? 'M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18'
                  : changeNegative ? 'M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3'
                  : 'M5 12h14'"
              />
            </svg>
            <span
              :class="['text-xs font-medium', changePositive ? 'text-emerald-600' : changeNegative ? 'text-rose-600' : 'text-slate-500']"
            >
              {{ changeLabel }}
            </span>
          </div>
        </div>

        <!-- Icon bubble -->
        <div :class="['shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ring-1', c.bg, c.ring]">
          <svg :class="['h-5 w-5', c.icon]" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[icon] ?? iconPaths.income" />
          </svg>
        </div>
      </div>
    </template>
  </div>
</template>
