<script setup>
/**
 * BaseSpinner — accessible loading indicator.
 * The `label` is announced to screen readers but hidden visually.
 */
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v),
  },
  label: { type: String, default: 'Loading…' },
})

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-12 w-12' }
</script>

<template>
  <span role="status" :aria-label="label" class="inline-flex items-center justify-center">
    <svg
      :class="['animate-spin text-emerald-600', sizeMap[size]]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <span class="sr-only">{{ label }}</span>
  </span>
</template>
