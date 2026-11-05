/**
 * Budget service — workspace-scoped.
 * All paths: /workspaces/:id/budgets
 *
 * Period must be 'monthly' or 'yearly' only.
 * GET /workspaces/:id/budgets/status returns budgets enriched with
 * spent, remaining, utilization, and status.
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  mockGetBudgets,
  mockGetBudget,
  mockCreateBudget,
  mockUpdateBudget,
  mockDeleteBudget,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

export default {
  async listWithStatus() {
    if (USE_MOCK) return mockGetBudgets()
    const res = await api.get(wsPath('/budgets/status'))
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetBudget(id)
    const res = await api.get(wsPath(`/budgets/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateBudget(payload)
    const res = await api.post(wsPath('/budgets'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateBudget(id, payload)
    const res = await api.patch(wsPath(`/budgets/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteBudget(id)
    await api.delete(wsPath(`/budgets/${id}`))
  },
}
