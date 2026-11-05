/**
 * Analytics service — workspace-scoped.
 * All paths: /workspaces/:id/...
 *
 * GET /workspaces/:id/dashboard?from=&to=&department=&category=
 * GET /workspaces/:id/forecast?category=&horizon=
 * GET /workspaces/:id/alerts
 * GET /workspaces/:id/recommendations
 * Plus monthly/categories/cash-flow/budget-performance/savings-trends.
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  mockGetMonthly,
  mockGetCategoryAnalytics,
  mockGetCashFlow,
  mockGetBudgetPerformance,
  mockGetSavingsTrends,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

export default {
  async getMonthly(params = {}) {
    if (USE_MOCK) return mockGetMonthly(params)
    const res = await api.get(wsPath('/analytics/monthly'), { params })
    return res.data
  },

  async getCategories(params = {}) {
    if (USE_MOCK) return mockGetCategoryAnalytics(params)
    const res = await api.get(wsPath('/analytics/categories'), { params })
    return res.data
  },

  async getCashFlow(params = {}) {
    if (USE_MOCK) return mockGetCashFlow(params)
    const res = await api.get(wsPath('/analytics/cash-flow'), { params })
    return res.data
  },

  async getBudgetPerformance(params = {}) {
    if (USE_MOCK) return mockGetBudgetPerformance(params)
    const res = await api.get(wsPath('/analytics/budget-performance'), { params })
    return res.data
  },

  async getSavingsTrends() {
    if (USE_MOCK) return mockGetSavingsTrends()
    const res = await api.get(wsPath('/analytics/savings-trends'))
    return res.data
  },
}
