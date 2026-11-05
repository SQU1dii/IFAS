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

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

export default {
  async list() {
    if (USE_MOCK) return mockGetAccounts()
    const res = await api.get(wsPath('/accounts'))
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetAccount(id)
    const res = await api.get(wsPath(`/accounts/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateAccount(payload)
    const res = await api.post(wsPath('/accounts'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateAccount(id, payload)
    const res = await api.patch(wsPath(`/accounts/${id}`), payload)
    return res.data
  },

  async deactivate(id) {
    if (USE_MOCK) return mockDeleteAccount(id)
    await api.delete(wsPath(`/accounts/${id}`))
  },
}
