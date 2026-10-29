<script setup>
/**
 * IncomeExpenseChart — grouped bar chart comparing income vs expenses per
 * month, built with Chart.js via vue-chartjs.
 *
 * Receives the `series` prop from the dashboard service:
 *   [{ label: 'Oct 24', income: 4500, expenses: 3200 }, …]
 */
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({
  series: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const chartData = computed(() => ({
  labels: props.series.map((s) => s.label),
  datasets: [
    {
      label: 'Income',
      data: props.series.map((s) => s.income),
      backgroundColor: 'rgba(16, 185, 129, 0.85)',  // emerald-500
      borderRadius: 5,
      borderSkipped: false,
    },
    {
      label: 'Expenses',
      data: props.series.map((s) => s.expenses),
      backgroundColor: 'rgba(244, 63, 94, 0.75)',   // rose-500
      borderRadius: 5,
      borderSkipped: false,
    },
  ],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        borderRadius: 3,
        useBorderRadius: true,
        font: { family: 'Inter', size: 12 },
        color: '#475569',
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont: { family: 'Inter', size: 12, weight: '600' },
      bodyFont: { family: 'Inter', size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: KSh ${ctx.parsed.y.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`,
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
      grid: { color: 'rgba(148,163,184,0.15)', drawBorder: false },
      ticks: {
        font: { family: 'Inter', size: 11 },
        color: '#94a3b8',
        callback: (v) => `KSh ${(v / 1000).toFixed(0)}k`,
      },
      border: { display: false },
    },
  },
}
</script>

<template>
  <div class="relative h-64">
    <!-- Skeleton -->
    <div v-if="loading" class="absolute inset-0 flex items-end gap-2 px-2 pb-2">
      <div v-for="i in 7" :key="i" class="flex-1 flex gap-0.5 items-end">
        <div :style="{ height: `${30 + Math.random() * 50}%` }" class="flex-1 bg-slate-200 rounded animate-pulse" />
        <div :style="{ height: `${20 + Math.random() * 40}%` }" class="flex-1 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>

    <!-- Chart -->
    <Bar v-else :data="chartData" :options="options" aria-label="Income vs Expenses bar chart" role="img" />
  </div>
</template>
