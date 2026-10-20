<script setup>
/**
 * LoadingOverlay — full-area dimmed overlay with a centered spinner.
 * Used on dashboard cards and views while data is fetching.
 * Wrap the target element in `position: relative` for it to work.
 */
import BaseSpinner from './BaseSpinner.vue'

defineProps({
  label: { type: String, default: 'Loading…' },
})
</script>

<template>
  <div
    class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[2px]"
    aria-live="polite"
  >
    <BaseSpinner size="lg" :label="label" />
  </div>
</template>
