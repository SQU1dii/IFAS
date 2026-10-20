/**
 * Dashboard service.
 *
 * Mock mode → dev-only mock service. Real mode → Express API via Axios.
 * The view layer only ever calls these functions, never the mock layer.
 */
import api from './api'
import {
  mockGetDashboard,
  mockGetBudgets,
  mockGetSavingsGoals,
  mockGetTransactions,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  /**
   * @param {{start:string,end:string}} range - ISO dates for the selected period
   * @param {{start:string,end:string}} comparison - previous period for deltas
   */
  async getDashboard(range, comparison) {
    if (USE_MOCK) return mockGetDashboard(range, comparison)
    const { data } = await api.get('/dashboard', { params: { ...range, ...comparison, compStart: comparison.start, compEnd: comparison.end } })
    return data
  },

  async getTransactions(params) {
    if (USE_MOCK) return mockGetTransactions(params)
    const { data } = await api.get('/transactions', { params })
    return data
  },

  async getBudgets() {
    if (USE_MOCK) return mockGetBudgets()
    const { data } = await api.get('/budgets')
    return data
  },

  async getSavingsGoals() {
    if (USE_MOCK) return mockGetSavingsGoals()
    const { data } = await api.get('/savings-goals')
    return data
  },
}
