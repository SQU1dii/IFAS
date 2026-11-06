<script setup>
/**
 * SidebarInner — workspace-aware navigation.
 *
 * Nav items are filtered by:
 *   1. Workspace type  (PERSONAL | BUSINESS | ORGANIZATION)
 *   2. User permission (from the workspace store)
 *
 * The workspace switcher button at the top lets the user jump to
 * WorkspaceSelectionView without logging out.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore }        from '@/stores/ui'
import { useAuthStore }      from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const ui   = useUiStore()
const auth = useAuthStore()
const ws   = useWorkspaceStore()
const router = useRouter()

const props = defineProps({
  collapsed:   { type: Boolean, required: true },
  mobile:      { type: Boolean, required: true },
  isActive:    { type: Function, required: true },
})

// ── Workspace type badge colours ─────────────────────────────
const wsTypePill = computed(() => ({
  PERSONAL:     'bg-emerald-500/20 text-emerald-300',
  BUSINESS:     'bg-blue-500/20    text-blue-300',
  ORGANIZATION: 'bg-purple-500/20  text-purple-300',
}[ws.wsType] ?? 'bg-slate-700 text-slate-300'))

const wsTypeLabel = computed(() => ({
  PERSONAL: 'Personal', BUSINESS: 'Business', ORGANIZATION: 'Org',
}[ws.wsType] ?? ws.wsType))

// ── All possible nav items ───────────────────────────────────
// wsTypes: undefined = show in all; string[] = restrict to listed types
// permission: undefined = always show; string = hide if not permitted
const ALL_NAV = [
  { name: 'Dashboard',              to: '/',             icon: 'home',         exact: true },
  { name: 'Transactions',           to: '/transactions', icon: 'transactions', permission: 'transactions.read' },
  { name: 'Income',                 to: '/income',       icon: 'income',       permission: 'transactions.read' },
  { name: 'Expenses',               to: '/expenses',     icon: 'expenses',     permission: 'transactions.read' },
  { name: 'Accounts',               to: '/accounts',     icon: 'accounts',     permission: 'transactions.read' },
  { name: 'Categories',              to: '/categories',   icon: 'categories',   permission: 'transactions.read' },
  { name: 'Budgets',                to: '/budgets',      icon: 'budget',       permission: 'budgets.read' },
  // Savings — personal only
  { name: 'Savings Goals',          to: '/savings',      icon: 'savings',      permission: 'budgets.read', wsTypes: ['PERSONAL'] },
  { name: 'Analytics',              to: '/analytics',    icon: 'analytics',    permission: 'reports.read' },
  { name: 'Reports',                to: '/reports',      icon: 'reports',      permission: 'reports.read' },
  { name: 'Intelligence',           to: '/intelligence', icon: 'intelligence', permission: 'reports.read' },
  { name: 'AI Assistant',           to: '/assistant',    icon: 'assistant' },
  // Members — business + org only
  { name: 'Members',                to: '/members',      icon: 'members',      permission: 'members.read', wsTypes: ['BUSINESS', 'ORGANIZATION'] },
  // Departments — org only
  { name: 'Departments',            to: '/departments',  icon: 'departments',  permission: 'departments.read', wsTypes: ['ORGANIZATION'] },
]

const BOTTOM_NAV = [
  { name: 'Settings', to: '/settings', icon: 'settings' },
]

// Filter based on workspace type + permissions
const navItems = computed(() =>
  ALL_NAV.filter((item) => {
    if (item.wsTypes && ws.wsType && !item.wsTypes.includes(ws.wsType)) return false
    if (item.permission && !ws.can(item.permission)) return false
    return true
  })
)

// ── Icon paths (Heroicons outline 24px) ─────────────────────
const ICONS = {
  home:         'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  transactions: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  income:       'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  expenses:     'M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181',
  accounts:     'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
  categories:   'M3.75 9.776c.112-.017.227-.026.343-.026h15.814c.116 0 .231.009.343.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776',
  budget:       'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  savings:      'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0',
  analytics:    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  reports:      'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z',
  intelligence: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z',
  assistant:    'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  members:      'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  departments:  'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  settings:     'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
}

function itemTitle(name) {
  return props.collapsed && !props.mobile ? name : undefined
}
function showLabel() {
  return !props.collapsed || props.mobile
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- ── Header: logo + collapse ──────────────────────── -->
    <div
      class="flex items-center h-16 px-4 border-b border-navy-700 shrink-0"
      :class="props.collapsed && !props.mobile ? 'justify-center' : 'justify-between gap-2'"
    >
      <RouterLink to="/" class="flex items-center gap-2.5 min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
        <span class="shrink-0 h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center" aria-hidden="true">
          <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </span>
        <span v-if="showLabel()" class="text-white font-bold text-sm leading-tight truncate">IFAS</span>
      </RouterLink>

      <button v-if="!props.mobile" type="button"
        class="shrink-0 p-1.5 rounded-md text-navy-300 hover:text-white hover:bg-navy-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        :aria-label="props.collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="ui.toggleSidebar()">
        <svg class="h-4 w-4 transition-transform duration-300" :class="props.collapsed ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button v-if="props.mobile" type="button"
        class="shrink-0 p-1.5 rounded-md text-navy-300 hover:text-white hover:bg-navy-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label="Close navigation menu"
        @click="ui.closeMobileMenu()">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- ── Workspace switcher ────────────────────────────── -->
    <button
      type="button"
      class="mx-2 mt-2 flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-navy-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      :class="props.collapsed && !props.mobile ? 'justify-center' : ''"
      :title="props.collapsed && !props.mobile ? ws.active?.name : undefined"
      :aria-label="'Switch workspace, current: ' + (ws.active?.name ?? 'none')"
      @click="router.push({ name: 'workspaces' })"
    >
      <span class="shrink-0 h-7 w-7 rounded-lg bg-navy-700 flex items-center justify-center text-xs font-bold text-white">
        {{ (ws.active?.name ?? '?').charAt(0).toUpperCase() }}
      </span>
      <span v-if="showLabel()" class="flex-1 min-w-0 text-left">
        <span class="block text-xs font-semibold text-white truncate">{{ ws.active?.name ?? 'No workspace' }}</span>
        <span :class="['inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5', wsTypePill]">
          {{ wsTypeLabel }}
        </span>
      </span>
      <svg v-if="showLabel()" class="h-3.5 w-3.5 text-navy-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    </button>

    <!-- ── Main nav ──────────────────────────────────────── -->
    <nav class="flex-1 overflow-y-auto scrollbar-thin py-2 px-2" aria-label="Main navigation">
      <ul class="space-y-0.5" role="list">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            :class="[
              'flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
              props.isActive(item)
                ? 'bg-emerald-600 text-white'
                : 'text-navy-300 hover:bg-navy-700 hover:text-white',
              props.collapsed && !props.mobile ? 'justify-center' : '',
            ]"
            :aria-current="props.isActive(item) ? 'page' : undefined"
            :title="itemTitle(item.name)"
          >
            <svg class="shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" :d="ICONS[item.icon] ?? ICONS.home" />
            </svg>
            <span v-if="showLabel()" class="truncate">{{ item.name }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- ── Bottom: settings + profile ───────────────────── -->
    <div class="border-t border-navy-700 py-2 px-2 space-y-0.5">
      <RouterLink
        v-for="item in BOTTOM_NAV" :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all',
          'text-navy-300 hover:bg-navy-700 hover:text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
          props.collapsed && !props.mobile ? 'justify-center' : '',
        ]"
        :title="itemTitle(item.name)"
      >
        <svg class="shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" :d="ICONS[item.icon] ?? ICONS.settings" />
        </svg>
        <span v-if="showLabel()">{{ item.name }}</span>
      </RouterLink>

      <!-- Profile row -->
      <RouterLink
        to="/settings"
        :class="[
          'flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all',
          'hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
          props.collapsed && !props.mobile ? 'justify-center' : '',
        ]"
        :title="props.collapsed && !props.mobile ? 'Profile' : undefined"
      >
        <span class="shrink-0 h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">
          {{ auth.initials }}
        </span>
        <span v-if="showLabel()" class="min-w-0">
          <span class="block text-sm font-medium text-white truncate">{{ auth.user?.name ?? 'My Account' }}</span>
          <span class="block text-xs text-navy-400 truncate">{{ auth.user?.email }}</span>
        </span>
      </RouterLink>
    </div>

  </div>
</template>
