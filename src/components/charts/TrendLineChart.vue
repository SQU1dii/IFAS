<script setup>
/**
 * TrendLineChart — reusable multi-line / single-line Chart.js component.
 *
 * Used by AnalyticsView (cash-flow, budget trends, savings trends) and
 * IntelligenceView (forecast projection with uncertainty bands).
 *
 * Props
 * ─────
 * series     Array of dataset descriptors:
 *   [{
 *     label:      string           // legend label
 *     data:       number[]         // y-values aligned to labels[]
 *     color:      string           // CSS hex / rgba
 *     fill:       boolean          // area fill under the line (default false)
 *     dashed:     boolean          // dashed line for estimates (default false)
 *     tension:    number           // line smoothness 0–1 (default 0.35)
 *   }]
 * labels     string[]   x-axis labels (shared across all series)
 * height     string     CSS height class, e.g. 'h-64' (default 'h-64')
 * loading    boolean
 * yPrefix    string     prefix for tooltip y values, e.g. '$'
 * showLegend boolean    show/hide the Chart.js legend (default true)
 * yFormat    Function   optional custom y-axis formatter
 *
 * Dashed series are rendered with a dashed stroke so estimates are
 * visually distinct from actual data — required by the Intelligence contract.
 */
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps({
  series:     { type: Array,    default: () => [] },
  labels:     { type: Array,    default: () => [] },
  height:     { type: String,   default: 'h-64'   },
  loading:    { type: Boolean,  default: false     },
  yPrefix:    { type: String,   default: '$'       },
  showLegend: { type: Boolean,  default: true      },
  yFormat:    { type: Function, default: null      },
})

// Build gradient fills per dataset at draw time.
function makeGradient(ctx, chartArea, color) {
  const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  // Extract base color and add transparency
  grad.addColorStop(0, color.startsWith('#') ? hexAlpha(color, 0.25) : color.replace(/[\d.]+\)$/, '0.25)'))
  grad.addColorStop(1, color.startsWith('#') ? hexAlpha(color, 0.01) : color.replace(/[\d.]+\)$/, '0.01)'))
  return grad
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s) => ({
    label:               s.label,
    data:                s.data,
    borderColor:         s.color ?? '#10b981',
    borderWidth:         s.dashed ? 2 : 2,
    borderDash:          s.dashed ? [6, 4] : [],
    pointBackgroundColor: s.color ?? '#10b981',
    pointRadius:         s.dashed ? 4 : 3,
    pointHoverRadius:    5,
    tension:             s.tension ?? 0.35,
    fill:                s.fill ? true : false,
    backgroundColor(context) {
      if (!s.fill) return 'transparent'
      const { chart } = context
      const { ctx, chartArea } = chart
      if (!chartArea) return 'transparent'
      return makeGradient(ctx, chartArea, s.color ?? '#10b981')
    },
  })),
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: props.showLegend,
      position: 'top',
      align: 'end',
      labels: {
        boxWidth: 12,
        boxHeight: 3,
        borderRadius: 2,
        useBorderRadius: true,
        font: { family: 'Inter', size: 12 },
        color: '#475569',
        generateLabels(chart) {
          // Mark dashed datasets in the legend with an italic style.
          const defaults = ChartJS.defaults.plugins.legend.labels.generateLabels(chart)
          defaults.forEach((item, i) => {
            if (props.series[i]?.dashed) {
              item.text = `${item.text} (est.)`
              item.fontStyle = 'italic'
            }
          })
          return defaults
        },
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont:  { family: 'Inter', size: 12, weight: '600' },
      bodyFont:   { family: 'Inter', size: 12 },
      padding:    10,
      cornerRadius: 8,
      callbacks: {
        label(ctx) {
          const v    = ctx.parsed.y
          const sign = v < 0 ? '-' : ''
          const fmt  = props.yFormat
            ? props.yFormat(v)
            : `${sign}${props.yPrefix}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          const est  = props.series[ctx.datasetIndex]?.dashed ? ' (estimate)' : ''
          return ` ${ctx.dataset.label}: ${fmt}${est}`
        },
      },
    },
  },
  scales: {
    x: {
      grid:   { display: false },
      ticks:  { font: { family: 'Inter', size: 11 }, color: '#94a3b8' },
      border: { display: false },
    },
    y: {
      grid:  { color: 'rgba(148,163,184,0.15)' },
      ticks: {
        font:     { family: 'Inter', size: 11 },
        color:    '#94a3b8',
        callback: props.yFormat
          ? props.yFormat
          : (v) => `${props.yPrefix}${(Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0))}`,
      },
      border: { display: false },
    },
  },
}))
</script>

<template>
  <div :class="['relative', height]">
    <!-- Skeleton -->
    <div v-if="loading" class="absolute inset-0 flex items-center px-4">
      <div class="w-full space-y-2">
        <div class="h-1.5 w-full bg-slate-200 rounded animate-pulse" />
        <div class="h-1.5 w-4/5  bg-slate-200 rounded animate-pulse" />
        <div class="h-1.5 w-full bg-slate-200 rounded animate-pulse" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!labels.length || !series.length"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
      <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
      </svg>
      No data available
    </div>

    <!-- Chart -->
    <Line
      v-else
      :data="chartData"
      :options="options"
      aria-label="Trend line chart"
      role="img"
    />
  </div>
</template>
