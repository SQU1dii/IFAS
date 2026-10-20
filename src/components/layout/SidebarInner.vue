<script setup>
/**
 * SidebarInner — the content of the sidebar (logo, nav list, profile row).
 * Used by both the desktop fixed sidebar and the mobile drawer in TheSidebar.
 */
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const ui   = useUiStore()
const auth = useAuthStore()

const props = defineProps({
  collapsed:   { type: Boolean, required: true },
  mobile:      { type: Boolean, required: true },
  navItems:    { type: Array,   required: true },
  bottomItems: { type: Array,   required: true },
  iconPaths:   { type: Object,  required: true },
  isActive:    { type: Function, required: true },
})

// Label used for collapsed icon-only links (tooltip on desktop).
function itemTitle(name) {
  return props.collapsed && !props.mobile ? name : undefined
}

// Whether the item label should render (hidden when collapsed on desktop).
function showLabel() {
  return !props.collapsed || props.mobile
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- ── Logo row + collapse / close button ──────────── -->
    <div
      class="flex items-center h-16 px-4 border-b border-navy-700 shrink-0"
      :class="collapsed && !mobile ? 'justify-center' : 'justify-between gap-2'"
    >
      <RouterLink
        to="/"
        class="flex items-center gap-2.5 min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <span class="shrink-0 h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center" aria-hidden="true">
          <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </span>
        <span v-if="showLabel()" class="text-white font-bold text-sm leading-tight truncate">IFAS</span>
      </RouterLink>

      <!-- Desktop collapse toggle -->
      <button
        v-if="!mobile"
        type="button"
        class="shrink-0 p-1.5 rounded-md text-navy-300 hover:text-white hover:bg-navy-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="ui.toggleSidebar()"
      >
        <svg
          class="h-4 w-4 transition-transform duration-300"
          :class="collapsed ? 'rotate-180' : ''"
          fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <!-- Mobile close button -->
      <button
        v-if="mobile"
        type="button"
        class="shrink-0 p-1.5 rounded-md text-navy-300 hover:text-white hover:bg-navy-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label="Close navigation menu"
        @click="ui.closeMobileMenu()"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- ── Main nav ─────────────────────────────────────── -->
    <nav
      class="flex-1 overflow-y-auto scrollbar-thin py-3 px-2"
      aria-label="Main navigation"
    >
      <ul class="space-y-0.5" role="list">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            :class="[
              'flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
              isActive(item)
                ? 'bg-emerald-600 text-white'
                : 'text-navy-300 hover:bg-navy-700 hover:text-white',
              collapsed && !mobile ? 'justify-center' : '',
            ]"
            :aria-current="isActive(item) ? 'page' : undefined"
            :title="itemTitle(item.name)"
          >
            <svg
              class="shrink-0 h-5 w-5"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[item.icon]" />
            </svg>
            <span v-if="showLabel()" class="truncate">{{ item.name }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- ── Bottom: settings + profile ──────────────────── -->
    <div class="border-t border-navy-700 py-3 px-2 space-y-0.5">

      <!-- Settings link(s) -->
      <RouterLink
        v-for="item in bottomItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all',
          'text-navy-300 hover:bg-navy-700 hover:text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
          collapsed && !mobile ? 'justify-center' : '',
        ]"
        :title="itemTitle(item.name)"
      >
        <svg class="shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" :d="iconPaths[item.icon]" />
        </svg>
        <span v-if="showLabel()">{{ item.name }}</span>
      </RouterLink>

      <!-- Profile summary row -->
      <RouterLink
        to="/profile"
        :class="[
          'flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all',
          'hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
          collapsed && !mobile ? 'justify-center' : '',
        ]"
        :title="itemTitle('Profile')"
      >
        <span
          class="shrink-0 h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold"
          aria-hidden="true"
        >
          {{ auth.initials }}
        </span>
        <span v-if="showLabel()" class="min-w-0">
          <span class="block text-sm font-medium text-white truncate">
            {{ auth.user?.name || 'My Account' }}
          </span>
          <span class="block text-xs text-navy-400 truncate">{{ auth.user?.email }}</span>
        </span>
      </RouterLink>

    </div>
  </div>
</template>
