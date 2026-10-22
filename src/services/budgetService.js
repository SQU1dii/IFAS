/**
 * Budget service — CRUD for the user's category budgets.
 *
 * Backend contract notes:
 *  • period must be 'monthly' or 'yearly' — no weekly or custom.
 *  • GET /budgets/status returns budgets enriched with spent, remaining,
 *    utilization (0–100+), and status ('on_track' | 'warning' | 'over').
 *  • The frontend DISPLAYS what the backend returns — it never recalculates
 *    spending totals from raw transactions.
 */
import api from './api'
import {
  mockGetBudgets,
  mockGetBudget,
  mockCreateBudget,
  mockUpdateBudget,
  mockDeleteBudget,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  /** Returns all budgets enriched with current-period utilization. */
  async listWithStatus() {
    if (USE_MOCK) return mockGetBudgets()
    const res = await api.get('/budgets/status')
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetBudget(id)
    const res = await api.get(`/budgets/${id}`)
    return res.data
  },

  /**
   * @param {{ category_id, limit, period, notes }} payload
   * period must be 'monthly' | 'yearly'
   */
  async create(payload) {
    if (USE_MOCK) return mockCreateBudget(payload)
    const res = await api.post('/budgets', payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateBudget(id, payload)
    const res = await api.put(`/budgets/${id}`, payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteBudget(id)
    await api.delete(`/budgets/${id}`)
  },
}
