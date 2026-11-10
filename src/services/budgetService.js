/**
 * Budget service — workspace-scoped.
 * All paths: /workspaces/:id/budgets
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

function wsId()         { return useWorkspaceStore().wsId }
function wsPath(p = '') { return `/workspaces/${wsId()}${p}` }

export default {
  async listWithStatus() {
    if (USE_MOCK) return mockGetBudgets(wsId())
    const res = await api.get(wsPath('/budgets/status'))
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetBudget(id, wsId())
    const res = await api.get(wsPath(`/budgets/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateBudget({ ...payload, wsId: wsId() })
    const res = await api.post(wsPath('/budgets'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateBudget(id, { ...payload, wsId: wsId() })
    const res = await api.patch(wsPath(`/budgets/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteBudget(id, wsId())
    await api.delete(wsPath(`/budgets/${id}`))
  },
}
