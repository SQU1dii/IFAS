/**
 * Transaction service — workspace-scoped.
 * All paths: /workspaces/:id/transactions
 *
 * wsId() is passed to every mock function so the per-workspace
 * in-memory slice is used consistently.
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  mockGetTransactions,
  mockGetTransaction,
  mockCreateTransaction,
  mockUpdateTransaction,
  mockDeleteTransaction,
  mockCsvPreview,
  mockCsvConfirm,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') {
  return `/workspaces/${useWorkspaceStore().wsId}${path}`
}
function wsId() {
  return useWorkspaceStore().wsId ?? 'ws-personal'
}

export default {
  async list(params = {}) {
    if (USE_MOCK) return mockGetTransactions({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/transactions'), { params })
    return res
  },

  async get(id) {
    if (USE_MOCK) return mockGetTransaction(id, wsId())
    const res = await api.get(wsPath(`/transactions/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateTransaction(payload, wsId())
    const res = await api.post(wsPath('/transactions'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateTransaction(id, payload, wsId())
    const res = await api.patch(wsPath(`/transactions/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteTransaction(id, wsId())
    await api.delete(wsPath(`/transactions/${id}`))
  },

  async void(id) {
    if (USE_MOCK) return mockDeleteTransaction(id, wsId())
    const res = await api.post(wsPath(`/transactions/${id}/void`))
    return res.data
  },

  async importPreview(rows) {
    if (USE_MOCK) return mockCsvPreview(rows, wsId())
    const res = await api.post(wsPath('/imports'), { rows })
    return res.data
  },

  async importConfirm(importId, validRows) {
    if (USE_MOCK) return mockCsvConfirm(validRows, wsId())
    const res = await api.post(wsPath(`/imports/${importId}/confirm`))
    return res.data
  },
}
