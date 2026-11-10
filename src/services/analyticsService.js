/**
 * Analytics service — workspace-scoped.
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

function wsId()         { return useWorkspaceStore().wsId }
function wsPath(p = '') { return `/workspaces/${wsId()}${p}` }

export default {
  async getMonthly(params = {}) {
    if (USE_MOCK) return mockGetMonthly({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/analytics/monthly'), { params })
    return res.data
  },

  async getCategories(params = {}) {
    if (USE_MOCK) return mockGetCategoryAnalytics({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/analytics/categories'), { params })
    return res.data
  },

  async getCashFlow(params = {}) {
    if (USE_MOCK) return mockGetCashFlow({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/analytics/cash-flow'), { params })
    return res.data
  },

  async getBudgetPerformance(params = {}) {
    if (USE_MOCK) return mockGetBudgetPerformance({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/analytics/budget-performance'), { params })
    return res.data
  },

  async getSavingsTrends() {
    if (USE_MOCK) return mockGetSavingsTrends(wsId())
    const res = await api.get(wsPath('/analytics/savings-trends'))
    return res.data
  },
}
