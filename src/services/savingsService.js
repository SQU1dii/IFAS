/**
 * Savings Goals service — workspace-scoped.
 * All paths: /workspaces/:id/savings-goals
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
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

function wsPath(path = '') { return `/workspaces/${useWorkspaceStore().wsId}${path}` }
function wsId()            { return useWorkspaceStore().wsId ?? 'ws-personal' }

export default {
  async list() {
    if (USE_MOCK) return mockGetSavingsGoals(wsId())
    const res = await api.get(wsPath('/savings-goals'))
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetSavingsGoal(id, wsId())
    const res = await api.get(wsPath(`/savings-goals/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateSavingsGoal(payload, wsId())
    const res = await api.post(wsPath('/savings-goals'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateSavingsGoal(id, payload, wsId())
    const res = await api.patch(wsPath(`/savings-goals/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteSavingsGoal(id, wsId())
    await api.delete(wsPath(`/savings-goals/${id}`))
  },

  async getContributions(goalId) {
    if (USE_MOCK) return mockGetContributions(goalId, wsId())
    const res = await api.get(wsPath(`/savings-goals/${goalId}/contributions`))
    return res.data
  },

  async addContribution(goalId, payload) {
    if (USE_MOCK) return mockAddContribution(goalId, payload, wsId())
    const res = await api.post(wsPath(`/savings-goals/${goalId}/contributions`), payload)
    return res.data
  },
}
