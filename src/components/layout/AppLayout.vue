<script setup>
/**
 * AppLayout — the authenticated shell.
 *
 * Desktop (lg+): fixed sidebar on the left, main content shifts right.
 * Mobile/tablet: sidebar hidden behind a drawer, triggered by the topbar
 * hamburger button.
 *
 * The sidebar collapse state lives in the UI store so any component can
 * read/toggle it without prop-drilling.
 */
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import TheSidebar from './TheSidebar.vue'
import TheTopbar from './TheTopbar.vue'
import MockDataBanner from '@/components/common/MockDataBanner.vue'

const ui = useUiStore()
const route = useRoute()

// Close the mobile drawer on navigation.
watch(() => route.path, () => {
  ui.closeMobileMenu()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- ── Mobile backdrop ──────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="ui.mobileMenuOpen"
        class="fixed inset-0 z-30 bg-navy-900/40 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
        @click="ui.closeMobileMenu()"
      />
    </Transition>

    <!-- ── Sidebar ──────────────────────────────────────── -->
    <TheSidebar />

    <!-- ── Main column ──────────────────────────────────── -->
    <div
      :class="[
        'flex flex-col flex-1 min-w-0 transition-all duration-300',
        // On desktop, offset the main area by the sidebar width.
        ui.sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64',
      ]"
    >
      <!-- Mock-data ribbon (development only) -->
      <MockDataBanner />

      <!-- Topbar -->
      <TheTopbar />

      <!-- Page content -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
