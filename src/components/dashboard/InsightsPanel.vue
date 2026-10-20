<script setup>
/**
 * InsightsPanel — renders the actionable insights returned by the
 * dashboard service. Each insight includes a type, title, and message.
 *
 * Rules enforced here:
 * - If insights is empty, an explicit empty state is shown (never silence).
 * - Insight cards are clearly distinct from prediction/estimate cards —
 *   predictions would carry an `isEstimate` flag and a visual marker.
 *   The mock service only produces observation-based insights (no
 *   fabricated forecasts), so all current items are shown as plain cards.
 * - The period the insight covers is included in the card where available.
 */
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps({
  insights: { type: Array,   default: () => [] },
  loading:  { type: Boolean, default: false },
  period:   { type: String,  default: '' }, // e.g. "This Month"
})

const typeStyle = {
  positive: { wrap: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-500', title: 'text-emerald-800', body: 'text-emerald-700' },
  warning:  { wrap: 'bg-amber-50  border-amber-200',   icon: 'text-amber-500',   title: 'text-amber-800',  body: 'text-amber-700'  },
  alert:    { wrap: 'bg-rose-50   border-rose-200',    icon: 'text-rose-500',    title: 'text-rose-800',   body: 'text-rose-700'   },
  info:     { wrap: 'bg-blue-50   border-blue-200',    icon: 'text-blue-500',    title: 'text-blue-800',   body: 'text-blue-700'   },
}

const iconPaths = {
  'trending-up':   'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  'trending-down': 'M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181',
  'alert':         'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  'info':          'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
}
</script>

<template>
  <div class="space-y-3">

    <!-- Skeleton -->
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-slate-100 animate-pulse" />
    </template>

    <!-- Empty — shown explicitly, never hidden silently -->
    <EmptyState
      v-else-if="!insights.length"
      title="No insights yet"
      message="Insights will appear here once there's enough transaction data for the selected period."
      icon="chart"
    />

    <!-- Insight cards -->
    <template v-else>
      <article
        v-for="insight in insights"
        :key="insight.id"
        :class="['rounded-xl border px-4 py-3.5 flex gap-3 items-start animate-slide-up', typeStyle[insight.type]?.wrap ?? 'bg-slate-50 border-slate-200']"
      >
        <!-- Icon -->
        <svg
          :class="['h-5 w-5 shrink-0 mt-0.5', typeStyle[insight.type]?.icon ?? 'text-slate-400']"
          fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[insight.icon] ?? iconPaths.info" />
        </svg>

        <div class="min-w-0 flex-1">
          <!-- Estimate label (for Phase 3 AI predictions — enforces visual distinction) -->
          <span
            v-if="insight.isEstimate"
            class="inline-flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded mb-1"
          >
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Estimate
          </span>

          <p :class="['text-sm font-semibold', typeStyle[insight.type]?.title ?? 'text-navy-800']">
            {{ insight.title }}
          </p>
          <p :class="['text-sm mt-0.5 leading-relaxed', typeStyle[insight.type]?.body ?? 'text-slate-600']">
            {{ insight.message }}
          </p>

          <!-- Period label -->
          <p v-if="period" class="text-xs opacity-60 mt-1">Period: {{ period }}</p>
          <p v-if="insight.uncertainty" class="text-xs opacity-60 mt-0.5 italic">
            {{ insight.uncertainty }}
          </p>
        </div>
      </article>
    </template>
  </div>
</template>
