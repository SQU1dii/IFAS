<script setup>
/**
 * TheTopbar — the horizontal bar at the top of every authenticated page.
 *
 * Left:   hamburger (mobile) + current page title
 * Center: date-range preset picker
 * Right:  notification bell + profile dropdown (logout, profile, settings)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { RANGE_PRESETS } from '@/utils/date'
import { formatRelativeTime } from '@/utils/format'

const ui = useUiStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const pageTitle = computed(() => route.meta?.title ?? 'IFAS')

// ── Date-range picker ────────────────────────────────────
const rangeOpen = ref(false)

function selectPreset(key) {
  ui.setRangePreset(key)
  rangeOpen.value = false
}

const currentPresetLabel = computed(
  () => RANGE_PRESETS.find((p) => p.key === ui.rangePreset)?.label ?? 'Custom'
)

// ── Notifications ────────────────────────────────────────
const notifOpen = ref(false)
const unread = computed(() => ui.unreadCount)

function openNotifications() {
  notifOpen.value = !notifOpen.value
  profileOpen.value = false
  rangeOpen.value = false
}

function markAllRead() {
  ui.markAllRead()
}

onMounted(() => ui.loadNotifications())

// ── Profile dropdown ─────────────────────────────────────
const profileOpen = ref(false)

function toggleProfile() {
  profileOpen.value = !profileOpen.value
  notifOpen.value = false
  rangeOpen.value = false
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

// Close all dropdowns when clicking outside.
function handleOutsideClick(e) {
  if (!e.target.closest('[data-topbar-dropdown]')) {
    rangeOpen.value = false
    notifOpen.value = false
    profileOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleOutsideClick, true))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick, true))

const notifTypeStyle = {
  warning:  'text-amber-500',
  positive: 'text-emerald-500',
  info:     'text-blue-500',
  alert:    'text-rose-500',
}
</script>

<template>
  <header class="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 flex items-center px-4 sm:px-6 gap-3 shrink-0">

    <!-- ── Hamburger (mobile) ── -->
    <button
      type="button"
      class="lg:hidden shrink-0 p-1.5 rounded-lg text-navy-500 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      aria-label="Open navigation menu"
      @click="ui.toggleMobileMenu()"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>

    <!-- ── Page title ── -->
    <h2 class="text-base font-semibold text-navy-800 truncate flex-1 min-w-0">
      {{ pageTitle }}
    </h2>

    <!-- ── Date-range picker ── -->
    <div class="relative" data-topbar-dropdown>
      <button
        type="button"
        class="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-navy-700 hover:bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        aria-haspopup="listbox"
        :aria-expanded="rangeOpen"
        @click.stop="rangeOpen = !rangeOpen; notifOpen = false; profileOpen = false"
      >
        <svg class="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        {{ currentPresetLabel }}
        <svg class="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <Transition name="dropdown">
        <div
          v-if="rangeOpen"
          role="listbox"
          class="absolute right-0 mt-1.5 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50"
          aria-label="Date range"
        >
          <button
            v-for="preset in RANGE_PRESETS"
            :key="preset.key"
            type="button"
            role="option"
            :aria-selected="ui.rangePreset === preset.key"
            :class="[
              'w-full text-left px-3.5 py-2 text-sm transition',
              ui.rangePreset === preset.key
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-navy-700 hover:bg-slate-50',
            ]"
            @click.stop="selectPreset(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>
      </Transition>
    </div>

    <!-- ── Notification bell ── -->
    <div class="relative shrink-0" data-topbar-dropdown>
      <button
        type="button"
        class="relative flex items-center justify-center h-9 w-9 rounded-lg text-navy-500 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        :aria-label="`Notifications${unread > 0 ? `, ${unread} unread` : ''}`"
        :aria-expanded="notifOpen"
        @click.stop="openNotifications"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span
          v-if="unread > 0"
          class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
          aria-hidden="true"
        />
      </button>

      <Transition name="dropdown">
        <div
          v-if="notifOpen"
          class="absolute right-0 mt-1.5 w-80 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50"
          role="dialog"
          aria-label="Notifications"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p class="text-sm font-semibold text-navy-800">Notifications</p>
            <button
              v-if="unread > 0"
              type="button"
              class="text-xs text-emerald-600 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
              @click="markAllRead"
            >Mark all read</button>
          </div>
          <ul class="divide-y divide-slate-100 max-h-72 overflow-y-auto scrollbar-thin">
            <li
              v-for="n in ui.notifications"
              :key="n.id"
              :class="['px-4 py-3 flex gap-3 items-start cursor-pointer hover:bg-slate-50 transition', !n.is_read && 'bg-slate-50']"
              @click="ui.markRead(n.id)"
            >
              <span :class="['mt-0.5 shrink-0', notifTypeStyle[n.type] ?? 'text-slate-400']">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" opacity="0.2" />
                  <circle cx="10" cy="10" r="4" />
                </svg>
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-navy-800">{{ n.title }}</p>
                <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">{{ n.body }}</p>
                <p class="text-xs text-slate-400 mt-1">{{ formatRelativeTime(n.created_at) }}</p>
              </div>
              <span v-if="!n.is_read" class="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-emerald-500" aria-label="Unread" />
            </li>
          </ul>
          <div class="px-4 py-2.5 border-t border-slate-100 text-center">
            <button type="button" class="text-xs text-emerald-600 hover:underline">View all</button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Profile dropdown ── -->
    <div class="relative shrink-0" data-topbar-dropdown>
      <button
        type="button"
        class="flex items-center gap-2 h-9 rounded-lg px-2 hover:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        :aria-expanded="profileOpen"
        aria-haspopup="menu"
        aria-label="Account menu"
        @click.stop="toggleProfile"
      >
        <span class="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {{ auth.initials }}
        </span>
        <span class="hidden sm:block text-sm font-medium text-navy-700 max-w-[120px] truncate">
          {{ auth.user?.name?.split(' ')[0] || 'Account' }}
        </span>
        <svg class="h-3.5 w-3.5 text-slate-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <Transition name="dropdown">
        <div
          v-if="profileOpen"
          role="menu"
          class="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50"
        >
          <!-- User info header -->
          <div class="px-3.5 py-2.5 border-b border-slate-100">
            <p class="text-sm font-semibold text-navy-800 truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-slate-500 truncate">{{ auth.user?.email }}</p>
          </div>

          <RouterLink
            to="/profile"
            role="menuitem"
            class="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-navy-700 hover:bg-slate-50 transition"
            @click="profileOpen = false"
          >
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Profile
          </RouterLink>

          <RouterLink
            to="/settings"
            role="menuitem"
            class="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-navy-700 hover:bg-slate-50 transition"
            @click="profileOpen = false"
          >
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </RouterLink>

          <div class="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition"
              @click="logout"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </Transition>
    </div>

  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
