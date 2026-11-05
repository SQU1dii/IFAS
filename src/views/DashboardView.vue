<script setup>
/**
 * DashboardView — workspace-type router.
 *
 * Thin dispatcher that renders the correct dashboard component based on
 * the active workspace type:
 *
 *   PERSONAL     → PersonalDashboardView (F3)
 *   BUSINESS     → BusinessDashboardView (F4)
 *   ORGANIZATION → OrgDashboardView      (F5)
 *
 * Uses defineAsyncComponent so each sub-dashboard is its own lazy-loaded
 * chunk (the router already splits DashboardView, but this keeps the
 * three dashboards in separate chunks too).
 */
import { computed, defineAsyncComponent } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import BaseSpinner from '@/components/common/BaseSpinner.vue'

const ws = useWorkspaceStore()
const wsType = computed(() => ws.wsType)

// Lazy-loaded — each dashboard is its own JS chunk.
const PersonalDashboard = defineAsyncComponent(() => import('./PersonalDashboardView.vue'))
const BusinessDashboard  = defineAsyncComponent(() => import('./BusinessDashboardView.vue'))
const OrgDashboard       = defineAsyncComponent(() => import('./OrgDashboardView.vue'))
</script>

<template>
  <div>
    <!-- Show a spinner while the workspace is still loading -->
    <div v-if="!wsType" class="flex justify-center py-24">
      <BaseSpinner size="xl" label="Loading workspace…" />
    </div>

    <!-- Personal dashboard (F3) -->
    <PersonalDashboard v-else-if="wsType === 'PERSONAL'" />

    <!-- Business dashboard (F4) -->
    <BusinessDashboard v-else-if="wsType === 'BUSINESS'" />

    <!-- Organisation dashboard (F5) -->
    <OrgDashboard v-else-if="wsType === 'ORGANIZATION'" />

    <!-- Fallback -->
    <div v-else class="flex flex-col items-center justify-center min-h-[40vh] text-slate-400 text-sm">
      <p>Unknown workspace type: {{ wsType }}</p>
      <p class="text-xs mt-1">Try selecting a different workspace.</p>
    </div>
  </div>
</template>
