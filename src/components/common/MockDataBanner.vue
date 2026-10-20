<script setup>
/**
 * MockDataBanner — a clearly-labeled notice shown when VITE_USE_MOCK=true
 * is active. Displayed at the top of every authenticated view so there is
 * never any confusion between sample and real financial data.
 *
 * Rendered only when the env flag is set; disappears in production mode
 * without any code changes needed.
 */
const isMock = import.meta.env.VITE_USE_MOCK === 'true'
</script>

<template>
  <div
    v-if="isMock"
    class="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800"
    role="status"
    aria-live="polite"
  >
    <svg class="h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
    <span>
      <strong class="font-semibold">Mock data active.</strong>
      All figures shown are sample data for development only — set
      <code class="font-mono bg-amber-100 px-1 rounded">VITE_USE_MOCK=false</code>
      in <code class="font-mono bg-amber-100 px-1 rounded">.env</code> to connect to the real API.
    </span>
  </div>
</template>
