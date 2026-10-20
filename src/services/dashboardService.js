/**
 * Dashboard service — analytics overview + reference-data helpers.
 * Calls GET /analytics/overview (mock: mockGetDashboard).
 * The frontend displays what the backend returns — it never recalculates totals.
 */
import api from './api'
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

export default {
  async getOverview(range, comparison) {
    if (USE_MOCK) return mockGetDashboard(range, comparison)
    const res = await api.get('/analytics/overview', {
      params: {
        from: range?.start, to: range?.end,
        comp_from: comparison?.start, comp_to: comparison?.end,
      },
    })
    return res.data
  },

  async getBudgets() {
    if (USE_MOCK) return mockGetBudgets()
    const res = await api.get('/budgets/status')
    return res.data
  },

  async getSavingsGoals() {
    if (USE_MOCK) return mockGetSavingsGoals()
    const res = await api.get('/savings-goals')
    return res.data
  },

  async getCategories() {
    if (USE_MOCK) return mockGetCategories()
    const res = await api.get('/categories')
    return res.data
  },

  async getAccounts() {
    if (USE_MOCK) return mockGetAccounts()
    const res = await api.get('/accounts')
    return res.data
  },

  // ── Notifications ─────────────────────────────────────────
  async getNotifications() {
    if (USE_MOCK) return mockGetNotifications()
    const res = await api.get('/notifications')
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
