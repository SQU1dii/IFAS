<script setup>
/**
 * SpendingByCategoryChart — doughnut chart showing how expenses break down
 * across categories in the selected period.
 *
 * Receives `categories` prop: [{ name, amount }, …] sorted by amount desc.
 */
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  categories: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

// A tasteful, accessible 10-colour palette that looks good on white.
const PALETTE = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#f43f5e', '#06b6d4', '#84cc16', '#fb923c',
  '#a78bfa', '#34d399',
]

const chartData = computed(() => ({
  labels: props.categories.map((c) => c.name),
  datasets: [
    {
      data: props.categories.map((c) => c.amount),
      backgroundColor: props.categories.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6,
    },
  ],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'right',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        borderRadius: 3,
        useBorderRadius: true,
        font: { family: 'Inter', size: 11 },
        color: '#475569',
        padding: 10,
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont: { family: 'Inter', size: 12, weight: '600' },
      bodyFont: { family: 'Inter', size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0
          return ` KSh ${ctx.parsed.toLocaleString('en-KE', { minimumFractionDigits: 0 })} (${pct}%)`
        },
      },
    },
  },
}
</script>

<template>
  <div class="relative h-56">
    <!-- Skeleton -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <div class="h-40 w-40 rounded-full border-[16px] border-slate-200 animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="!categories.length" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
      <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
      </svg>
      <p class="text-xs">No expense data for this period</p>
    </div>

    <!-- Chart -->
    <Doughnut v-else :data="chartData" :options="options" aria-label="Spending by category doughnut chart" role="img" />
  </div>
</template>
