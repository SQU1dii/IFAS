/**
 * Account service — workspace-scoped.
 * All paths: /workspaces/:id/accounts
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  mockGetAccounts,
  mockGetAccount,
  mockCreateAccount,
  mockUpdateAccount,
  mockDeleteAccount,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') { return `/workspaces/${useWorkspaceStore().wsId}${path}` }
function wsId()            { return useWorkspaceStore().wsId ?? 'ws-personal' }

export default {
  async list() {
    if (USE_MOCK) return mockGetAccounts(wsId())
    const res = await api.get(wsPath('/accounts'))
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetAccount(id, wsId())
    const res = await api.get(wsPath(`/accounts/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateAccount(payload, wsId())
    const res = await api.post(wsPath('/accounts'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateAccount(id, payload, wsId())
    const res = await api.patch(wsPath(`/accounts/${id}`), payload)
    return res.data
  },

  async deactivate(id) {
    if (USE_MOCK) return mockDeleteAccount(id, wsId())
    await api.delete(wsPath(`/accounts/${id}`))
  },
}
