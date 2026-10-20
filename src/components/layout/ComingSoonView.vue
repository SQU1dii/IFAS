<script setup>
/**
 * ComingSoonView — temporary placeholder for Phase 2–4 views.
 * Shown for routes that exist in the router but haven't been built yet.
 * Delete and replace with the real view in later phases.
 */
import { useRoute } from 'vue-router'
const route = useRoute()
const title = route.meta?.title ?? 'This page'
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
    <div class="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 class="text-xl font-bold text-navy-800 mb-2">{{ title }}</h2>
    <p class="text-sm text-slate-500 max-w-sm">
      This section is coming in a later phase. Navigation, routing, and the layout are fully wired — the view content will be added in Phase 2 or 3.
    </p>
    <RouterLink
      to="/"
      class="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Back to Dashboard
    </RouterLink>
  </div>
</template>
