<script setup>
/**
 * DashboardView — workspace-type router.
 *
 * This view is a thin dispatcher. It renders the correct dashboard
 * component based on the active workspace type so the router only
 * needs one /dashboard route.
 *
 *   PERSONAL     → PersonalDashboard (existing F3 implementation)
 *   BUSINESS     → BusinessDashboardView (F4)
 *   ORGANIZATION → OrgDashboardView (F5)
 */
import { computed }          from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import BaseSpinner           from '@/components/common/BaseSpinner.vue'

const ws = useWorkspaceStore()
const wsType = computed(() => ws.wsType)
</script>

<template>
  <div>
    <!-- Show a spinner while the workspace is still loading -->
    <div v-if="!wsType" class="flex justify-center py-24">
      <BaseSpinner size="xl" label="Loading workspace…" />
    </div>

    <!-- Personal dashboard (original F3 implementation) -->
    <Suspense v-else-if="wsType === 'PERSONAL'">
      <component :is="() => import('./PersonalDashboardView.vue')" />
    </Suspense>

    <!-- Business dashboard F4 -->
    <Suspense v-else-if="wsType === 'BUSINESS'">
      <component :is="() => import('./BusinessDashboardView.vue')" />
    </Suspense>

    <!-- Organisation dashboard F5 -->
    <Suspense v-else-if="wsType === 'ORGANIZATION'">
      <component :is="() => import('./OrgDashboardView.vue')" />
    </Suspense>
  </div>
</template>
