/**
 * Dashboard service — workspace-scoped.
 *
 * GET /workspaces/:id/dashboard?from=&to=&department=&category=
 *
 * The frontend DISPLAYS what the backend returns — never recalculates.
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  mockGetDashboard,
  mockGetBudgets,
  mockGetSavingsGoals,
  mockGetCategories,
  mockGetAccounts,
  mockGetNotifications,
  mockMarkNotificationRead,
  mockMarkAllNotificationsRead,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

export default {
  async getOverview(range, comparison) {
    if (USE_MOCK) return mockGetDashboard(range, comparison)
    const res = await api.get(wsPath('/dashboard'), {
      params: {
        from: range?.start, to: range?.end,
        comp_from: comparison?.start, comp_to: comparison?.end,
      },
    })
    return res.data
  },

  async getBudgets() {
    if (USE_MOCK) return mockGetBudgets()
    const res = await api.get(wsPath('/budgets/status'))
    return res.data
  },

  async getSavingsGoals() {
    if (USE_MOCK) return mockGetSavingsGoals()
    const res = await api.get(wsPath('/savings-goals'))
    return res.data
  },

  async getCategories() {
    if (USE_MOCK) return mockGetCategories()
    const res = await api.get(wsPath('/categories'))
    return res.data
  },

  async getAccounts() {
    if (USE_MOCK) return mockGetAccounts()
    const res = await api.get(wsPath('/accounts'))
    return res.data
  },

  async getNotifications() {
    if (USE_MOCK) return mockGetNotifications()
    const res = await api.get('/notifications')  // global, not workspace-scoped
    return res.data
  },

  async markNotificationRead(id) {
    if (USE_MOCK) return mockMarkNotificationRead(id)
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllNotificationsRead() {
    if (USE_MOCK) return mockMarkAllNotificationsRead()
    await api.post('/notifications/read-all')
  },
}
