import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore }      from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

/**
 * Route meta flags
 * ─────────────────
 * guestOnly       true  → redirect to dashboard if already logged in
 * requiresAuth    true  → redirect to /login if not authenticated
 * requiresWs      true  → redirect to /workspaces if no active workspace
 * permission      string → check useWorkspaceStore().can(permission);
 *                          show NotPermitted page if denied
 * wsTypes         string[] → restrict route to specific workspace types
 *                            (PERSONAL | BUSINESS | ORGANIZATION)
 */

const routes = [
  // ── Guest-only auth pages ──────────────────────────────────────────────
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true, title: 'Sign in' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guestOnly: true, title: 'Create account' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { guestOnly: true, title: 'Reset password' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { guestOnly: true, title: 'Set new password' },
  },

  // ── Workspace selection (authenticated but no active workspace) ─────────
  {
    path: '/workspaces',
    name: 'workspaces',
    component: () => import('@/views/WorkspaceSelectionView.vue'),
    meta: { requiresAuth: true, title: 'Select workspace' },
  },

  // ── App shell — requires auth AND an active workspace ──────────────────
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true, requiresWs: true },
    children: [

      // ── Dashboard (type-aware — renders the right dashboard for the ws type)
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Dashboard', permission: 'transactions.read' },
      },

      // ── Transactions ─────────────────────────────────────────────────────
      {
        path: 'transactions',
        name: 'transactions',
        component: () => import('@/views/TransactionsView.vue'),
        meta: { title: 'Transactions', permission: 'transactions.read' },
      },
      {
        path: 'income',
        name: 'income',
        component: () => import('@/views/IncomeView.vue'),
        meta: { title: 'Income', permission: 'transactions.read' },
      },
      {
        path: 'expenses',
        name: 'expenses',
        component: () => import('@/views/ExpensesView.vue'),
        meta: { title: 'Expenses', permission: 'transactions.read' },
      },

      // ── Accounts & categories ────────────────────────────────────────────
      {
        path: 'accounts',
        name: 'accounts',
        component: () => import('@/views/AccountsView.vue'),
        meta: { title: 'Accounts', permission: 'transactions.read' },
      },

      // ── Budgets ──────────────────────────────────────────────────────────
      {
        path: 'budgets',
        name: 'budgets',
        component: () => import('@/views/BudgetsView.vue'),
        meta: { title: 'Budgets', permission: 'budgets.read' },
      },

      // ── Savings goals (Personal only) ────────────────────────────────────
      {
        path: 'savings',
        name: 'savings',
        component: () => import('@/views/SavingsView.vue'),
        meta: {
          title: 'Savings Goals',
          permission: 'budgets.read',
          wsTypes: ['PERSONAL'],
        },
      },

      // ── Analytics ────────────────────────────────────────────────────────
      {
        path: 'analytics',
        name: 'analytics',
        component: () => import('@/views/AnalyticsView.vue'),
        meta: { title: 'Analytics', permission: 'reports.read' },
      },

      // ── Reports ──────────────────────────────────────────────────────────
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/views/ReportsView.vue'),
        meta: { title: 'Reports', permission: 'reports.read' },
      },

      // ── Financial Intelligence ────────────────────────────────────────────
      {
        path: 'intelligence',
        name: 'intelligence',
        component: () => import('@/views/IntelligenceView.vue'),
        meta: { title: 'Financial Intelligence', permission: 'reports.read' },
      },

      // ── AI Financial Assistant (F8) ───────────────────────────────────────
      {
        path: 'assistant',
        name: 'assistant',
        component: () => import('@/views/AssistantView.vue'),
        meta: { title: 'AI Assistant' },
      },

      // ── Members & Roles (Business + Org) ─────────────────────────────────
      {
        path: 'members',
        name: 'members',
        component: () => import('@/views/MembersView.vue'),
        meta: {
          title: 'Members & Roles',
          permission: 'members.read',
          wsTypes: ['BUSINESS', 'ORGANIZATION'],
        },
      },

      // ── Departments (Organization only) ──────────────────────────────────
      {
        path: 'departments',
        name: 'departments',
        component: () => import('@/views/DepartmentsView.vue'),
        meta: {
          title: 'Departments',
          permission: 'departments.read',
          wsTypes: ['ORGANIZATION'],
        },
      },

      // ── Settings ─────────────────────────────────────────────────────────
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: 'Settings' },
      },

      // ── Not permitted ─────────────────────────────────────────────────────
      {
        path: 'not-permitted',
        name: 'not-permitted',
        component: () => import('@/views/NotPermittedView.vue'),
        meta: { title: 'Not permitted' },
      },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const ws   = useWorkspaceStore()

  // 1. Guest-only: redirect authenticated users away from login/register.
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return ws.wsId
      ? { name: 'dashboard' }
      : { name: 'workspaces' }
  }

  // 2. Requires auth: send unauthenticated users to login.
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 3. Requires active workspace: send to workspace selection if none set.
  if (to.meta.requiresWs && auth.isLoggedIn && !ws.wsId) {
    return { name: 'workspaces' }
  }

  // 4. Workspace type restriction.
  if (to.meta.wsTypes && ws.wsType && !to.meta.wsTypes.includes(ws.wsType)) {
    return { name: 'not-permitted' }
  }

  // 5. Permission check — server is the real authority; this is UI gating only.
  if (to.meta.permission && !ws.can(to.meta.permission)) {
    return { name: 'not-permitted' }
  }

  return true
})

export default router
