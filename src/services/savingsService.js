/**
 * Savings Goals service — CRUD for goals and contribution/withdrawal history.
 *
 * Backend contract notes:
 *  • Goals are enriched by the backend with progress_pct, remaining_amount,
 *    reached, days_remaining, and monthly_needed — the frontend just displays.
 *  • Contributions and withdrawals share the same endpoint:
 *      POST /savings-goals/:id/contributions
 *    with payload { amount, type, date, notes } where type is
 *    'contribution' | 'withdrawal'.
 *  • Withdrawals cannot exceed the current balance — validated by the backend
 *    (and mirrored in the mock) so the error surfaces via the standard
 *    fieldErrors normalizer in api.js.
 */
import api from './api'
import {
  mockGetSavingsGoals,
  mockGetSavingsGoal,
  mockCreateSavingsGoal,
  mockUpdateSavingsGoal,
  mockDeleteSavingsGoal,
  mockGetContributions,
  mockAddContribution,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  /** Returns all goals enriched with progress fields. */
  async list() {
    if (USE_MOCK) return mockGetSavingsGoals()
    const res = await api.get('/savings-goals')
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetSavingsGoal(id)
    const res = await api.get(`/savings-goals/${id}`)
    return res.data
  },

  /**
   * @param {{ name, target_amount, target_date, notes, initial_amount }} payload
   * initial_amount is optional — creates a first contribution automatically.
   */
  async create(payload) {
    if (USE_MOCK) return mockCreateSavingsGoal(payload)
    const res = await api.post('/savings-goals', payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateSavingsGoal(id, payload)
    const res = await api.put(`/savings-goals/${id}`, payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteSavingsGoal(id)
    await api.delete(`/savings-goals/${id}`)
  },

  /** List contribution/withdrawal history for one goal, newest first. */
  async getContributions(goalId) {
    if (USE_MOCK) return mockGetContributions(goalId)
    const res = await api.get(`/savings-goals/${goalId}/contributions`)
    return res.data
  },

  /**
   * Add a contribution or withdrawal.
   * @param {string} goalId
   * @param {{ amount, type, date, notes }} payload
   * @returns {{ contribution, goal }} — updated goal is returned alongside
   *   the new entry so the view can update in place without a second fetch.
   */
  async addContribution(goalId, payload) {
    if (USE_MOCK) return mockAddContribution(goalId, payload)
    const res = await api.post(`/savings-goals/${goalId}/contributions`, payload)
    return res.data
  },
}
