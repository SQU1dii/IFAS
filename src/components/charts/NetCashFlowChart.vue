<script setup>
/**
 * NetCashFlowChart — line chart showing the monthly net cash flow trend.
 *
 * Net cash flow = income − expenses (transfers excluded).
 * Points above zero are rendered in emerald; below in rose via a gradient.
 *
 * Receives the same `series` prop as IncomeExpenseChart.
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
  series: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

// Build a canvas gradient at chart-creation time via the Chart.js scriptable API.
function buildGradient(ctx, chartArea) {
  const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)')
  grad.addColorStop(1, 'rgba(16, 185, 129, 0.01)')
  return grad
}

const chartData = computed(() => ({
  labels: props.series.map((s) => s.label),
  datasets: [
    {
      label: 'Net Cash Flow',
      data: props.series.map((s) => s.net),
      borderColor: '#10b981',
      borderWidth: 2,
      pointBackgroundColor: '#10b981',
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.35,
      fill: true,
      backgroundColor(context) {
        const { chart } = context
        const { ctx, chartArea } = chart
        if (!chartArea) return 'rgba(16,185,129,0.1)'
        return buildGradient(ctx, chartArea)
      },
    },
  ],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont: { family: 'Inter', size: 12, weight: '600' },
      bodyFont: { family: 'Inter', size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => {
          const v = ctx.parsed.y
          const sign = v >= 0 ? '+' : ''
          return ` Net: ${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(148,163,184,0.15)' },
      ticks: {
        font: { family: 'Inter', size: 11 },
        color: '#94a3b8',
        callback: (v) => `$${(v / 1000).toFixed(0)}k`,
      },
      border: { display: false },
    },
  },
}
</script>

<template>
  <div class="relative h-48">
    <div v-if="loading" class="absolute inset-0 flex items-center px-4">
      <div class="w-full h-1.5 bg-slate-200 rounded animate-pulse" />
    </div>
    <Line v-else :data="chartData" :options="options" aria-label="Monthly net cash flow line chart" role="img" />
  </div>
</template>
