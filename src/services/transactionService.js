/**
 * Transaction service — workspace-scoped.
 * All paths: /workspaces/:id/transactions
 *
 * Void: POST /workspaces/:id/transactions/:tid/void
 * CSV import step 1: POST /workspaces/:id/imports (preview)
 * CSV import step 2: POST /workspaces/:id/imports/:iid/confirm
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

// Shared helper — reads the active workspace id from the store.
function wsId() { return useWorkspaceStore().wsId }
function wsPath(path = '') { return `/workspaces/${wsId()}${path}` }

export default {
  async list(params = {}) {
    if (USE_MOCK) return mockGetTransactions({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/transactions'), { params })
    return res
  },

  async get(id) {
    if (USE_MOCK) return mockGetTransaction(id)
    const res = await api.get(wsPath(`/transactions/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateTransaction({ ...payload, wsId: wsId() })
    const res = await api.post(wsPath('/transactions'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateTransaction(id, { ...payload, wsId: wsId() })
    const res = await api.patch(wsPath(`/transactions/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteTransaction(id)
    await api.delete(wsPath(`/transactions/${id}`))
  },

  async void(id) {
    if (USE_MOCK) return mockDeleteTransaction(id)
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
