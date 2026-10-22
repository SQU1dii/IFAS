import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
    // The reset link in the email contains ?token=<jwt>
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { guestOnly: true, title: 'Set new password' },
  },

  // ── Authenticated shell ────────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      // ── Phase 1 ─────────────────────────────────────────────────────
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Dashboard' },
      },

      // ── Phase 2a ────────────────────────────────────────────────────
      {
        path: 'transactions',
        name: 'transactions',
        component: () => import('@/views/TransactionsView.vue'),
        meta: { title: 'Transactions' },
      },
      {
        path: 'income',
        name: 'income',
        component: () => import('@/views/IncomeView.vue'),
        meta: { title: 'Income' },
      },
      {
        path: 'expenses',
        name: 'expenses',
        component: () => import('@/views/ExpensesView.vue'),
        meta: { title: 'Expenses' },
      },
      {
        path: 'accounts',
        name: 'accounts',
        component: () => import('@/views/AccountsView.vue'),
        meta: { title: 'Accounts' },
      },

      // ── Phase 2b ────────────────────────────────────────────────────
      {
        path: 'budgets',
        name: 'budgets',
        component: () => import('@/views/BudgetsView.vue'),
        meta: { title: 'Budgets' },
      },
      {
        path: 'savings',
        name: 'savings',
        component: () => import('@/views/SavingsView.vue'),
        meta: { title: 'Savings Goals' },
      },

      // ── Phase 3 (stubs) ──────────────────────────────────────────────
      {
        path: 'analytics',
        name: 'analytics',
        component: () => import('@/components/layout/ComingSoonView.vue'),
        meta: { title: 'Analytics' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/components/layout/ComingSoonView.vue'),
        meta: { title: 'Reports' },
      },
      {
        path: 'intelligence',
        name: 'intelligence',
        component: () => import('@/components/layout/ComingSoonView.vue'),
        meta: { title: 'Financial Intelligence' },
      },

      // ── Phase 4 (stubs) ──────────────────────────────────────────────
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/components/layout/ComingSoonView.vue'),
        meta: { title: 'Profile' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/components/layout/ComingSoonView.vue'),
        meta: { title: 'Settings' },
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

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
