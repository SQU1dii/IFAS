<script setup>
/**
 * BaseProgress — horizontal progress bar for budgets and savings goals.
 *
 * Color changes automatically:
 *   0–79 % → green (on track)
 *   80–99 % → amber (warning)
 *   100 %+  → red (over limit)
 *
 * The caller can override via `color` if the semantic auto-coloring is not
 * appropriate (e.g. savings goals always use green).
 */
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },   // 0–100+ (clamped visually to 100)
  max: { type: Number, default: 100 },
  color: { type: String, default: 'auto' },  // 'auto' | 'green' | 'amber' | 'red' | 'blue'
  size: { type: String, default: 'md' },     // 'sm' | 'md'
  showLabel: { type: Boolean, default: false },
})

const pct = computed(() => Math.min(100, Math.max(0, (props.value / props.max) * 100)))

const barColor = computed(() => {
  if (props.color !== 'auto') {
    return {
      green: 'bg-emerald-500',
      amber: 'bg-amber-400',
      red:   'bg-rose-500',
      blue:  'bg-blue-500',
    }[props.color] || 'bg-emerald-500'
  }
  if (pct.value >= 100) return 'bg-rose-500'
  if (pct.value >= 80)  return 'bg-amber-400'
  return 'bg-emerald-500'
})
</script>

<template>
  <div class="w-full">
    <div
      :class="[
        'w-full bg-slate-100 rounded-full overflow-hidden',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
      ]"
      role="progressbar"
      :aria-valuenow="Math.round(pct)"
      :aria-valuemin="0"
      :aria-valuemax="100"
    >
      <div
        :class="['h-full rounded-full transition-all duration-300', barColor]"
        :style="{ width: `${pct}%` }"
      />
    </div>
    <p v-if="showLabel" class="mt-1 text-xs text-slate-500 text-right">
      {{ Math.round(pct) }}%
    </p>
  </div>
</template>
