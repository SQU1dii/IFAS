<script setup>
/**
 * TheSidebar — responsive navigation shell.
 * Nav items and workspace switcher live in SidebarInner.vue.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import SidebarInner from './SidebarInner.vue'

const ui    = useUiStore()
const route = useRoute()
const collapsed = computed(() => ui.sidebarCollapsed)

function isActive(item) {
  if (item.exact) return route.path === item.to
  return route.path === item.to || route.path.startsWith(item.to + '/')
}
</script>

<template>
  <!-- Desktop fixed sidebar -->
  <aside
    :class="[
      'hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-navy-800 transition-all duration-300',
      collapsed ? 'w-[72px]' : 'w-64',
    ]"
    :aria-label="collapsed ? 'Collapsed navigation' : 'Main navigation'"
  >
    <SidebarInner :collapsed="collapsed" :mobile="false" :is-active="isActive" />
  </aside>

  <!-- Mobile off-canvas drawer -->
  <Transition name="slide-left">
    <aside
      v-if="ui.mobileMenuOpen"
      class="lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-navy-800 flex flex-col shadow-2xl"
      aria-label="Main navigation"
    >
      <SidebarInner :collapsed="false" :mobile="true" :is-active="isActive" />
    </aside>
  </Transition>
</template>

<style scoped>
.slide-left-enter-active, .slide-left-leave-active { transition: transform 0.22s ease; }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(-100%); }
</style>
