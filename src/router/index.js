import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Routes
 *
 * Auth pages render directly (no layout). All authenticated pages are
 * children of AppLayout so they share the sidebar + topbar shell.
 *
 * Phase 1 ships: login, register, forgot-password, dashboard.
 * Later phases fill in the remaining views (shown as "coming soon" stubs
 * so navigation works today).
 */
const routes = [
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
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
      // ── Phase 2 views (wired, not built yet) ──────────────────────────────
      { path: 'transactions', name: 'transactions', component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Transactions' } },
      { path: 'income',       name: 'income',       component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Income' } },
      { path: 'expenses',     name: 'expenses',     component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Expenses' } },
      { path: 'budgets',      name: 'budgets',      component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Budgets' } },
      { path: 'savings',      name: 'savings',      component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Savings Goals' } },
      // ── Phase 3 views (wired, not built yet) ──────────────────────────────
      { path: 'analytics',    name: 'analytics',    component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Analytics' } },
      { path: 'reports',      name: 'reports',      component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Reports' } },
      { path: 'intelligence', name: 'intelligence', component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Financial Intelligence' } },
      // ── Phase 4 views (wired, not built yet) ──────────────────────────────
      { path: 'profile',      name: 'profile',      component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Profile' } },
      { path: 'settings',     name: 'settings',     component: () => import('@/components/layout/ComingSoonView.vue'), meta: { title: 'Settings' } },
    ],
  },
  // Catch-all → dashboard if logged in, otherwise login.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

/**
 * Global guard:
 * - requiresAuth routes redirect to /login when unauthenticated.
 * - guestOnly routes redirect to / when already authenticated.
 */
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
