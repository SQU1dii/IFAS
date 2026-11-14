<script setup>
/**
 * MockDataBanner — shown when VITE_USE_MOCK=true.
 * Dismissed for the session by clicking the × button.
 */
import { ref } from 'vue'

const isMock    = import.meta.env.VITE_USE_MOCK === 'true'
const dismissed = ref(false)
</script>

<template>
  <div
    v-if="isMock && !dismissed"
    class="flex items-center justify-between gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-center gap-2">
      <svg class="h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span>
        <strong class="font-semibold">Demo mode — sample data only.</strong>
        No backend required. All figures are illustrative and not real financial data.
        To connect the real API, start the backend on port 4000 and set
        <code class="font-mono bg-amber-100 px-1 rounded">VITE_USE_MOCK=false</code>
        in <code class="font-mono bg-amber-100 px-1 rounded">.env</code>.
      </span>
    </div>
    <button
      type="button"
      class="shrink-0 p-0.5 rounded text-amber-500 hover:text-amber-800 hover:bg-amber-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      aria-label="Dismiss notice"
      @click="dismissed = true"
    >
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
