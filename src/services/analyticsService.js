/**
 * Analytics service — five analytics endpoints.
 *
 * GET /analytics/monthly          → income/expenses/net per month
 * GET /analytics/categories       → spending totals + per-category trends
 * GET /analytics/cash-flow        → monthly + cumulative cash-flow series
 * GET /analytics/budget-performance → planned vs actual per budget
 * GET /analytics/savings-trends   → per-goal cumulative balance series
 *
 * All endpoints accept from / to / category_id / account_id filters.
 * The frontend displays what the backend returns — it never recalculates.
 */
import api from './api'
import {
  mockGetMonthly,
  mockGetCategoryAnalytics,
  mockGetCashFlow,
  mockGetBudgetPerformance,
  mockGetSavingsTrends,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  /**
   * @param {{ months, category_id, account_id }} params
   */
  async getMonthly(params = {}) {
    if (USE_MOCK) return mockGetMonthly(params)
    const res = await api.get('/analytics/monthly', { params })
    return res.data
  },

  /**
   * @param {{ from, to, months }} params
   */
  async getCategories(params = {}) {
    if (USE_MOCK) return mockGetCategoryAnalytics(params)
    const res = await api.get('/analytics/categories', { params })
    return res.data
  },

  /**
   * @param {{ months, from, to }} params
   */
  async getCashFlow(params = {}) {
    if (USE_MOCK) return mockGetCashFlow(params)
    const res = await api.get('/analytics/cash-flow', { params })
    return res.data
  },

  /**
   * @param {{ months }} params
   */
  async getBudgetPerformance(params = {}) {
    if (USE_MOCK) return mockGetBudgetPerformance(params)
    const res = await api.get('/analytics/budget-performance', { params })
    return res.data
  },

  async getSavingsTrends() {
    if (USE_MOCK) return mockGetSavingsTrends()
    const res = await api.get('/analytics/savings-trends')
    return res.data
  },
}
