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
  mockGetNotifications,
  mockMarkNotificationRead,
  mockMarkAllNotificationsRead,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') { return `/workspaces/${useWorkspaceStore().wsId}${path}` }
function wsId()            { return useWorkspaceStore().wsId ?? 'ws-personal' }

export default {
  async getOverview(range, comparison) {
    if (USE_MOCK) return mockGetDashboard(range, comparison, wsId())
    const res = await api.get(wsPath('/dashboard'), {
      params: {
        from: range?.start, to: range?.end,
        comp_from: comparison?.start, comp_to: comparison?.end,
      },
    })
    return res.data
  },

  async getBudgets() {
    if (USE_MOCK) return mockGetBudgets(wsId())
    const res = await api.get(wsPath('/budgets/status'))
    return res.data
  },

  async getSavingsGoals() {
    if (USE_MOCK) return mockGetSavingsGoals(wsId())
    const res = await api.get(wsPath('/savings-goals'))
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
