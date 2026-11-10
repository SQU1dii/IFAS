/**
 * Transaction service — workspace-scoped.
 * All paths: /workspaces/:id/transactions
 *
 * Income and Expenses pages pass { type: 'income' } / { type: 'expense' }
 * as a filter — no separate endpoints needed.
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

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

function wsId() { return useWorkspaceStore().wsId }

export default {
  async list(params = {}) {
    if (USE_MOCK) return mockGetTransactions(params)
    const res = await api.get(wsPath('/transactions'), { params })
    return res.data  // ← unwrap data, not the full { data, meta } object
  },

  async get(id) {
    if (USE_MOCK) return mockGetTransaction(id)
    const res = await api.get(wsPath(`/transactions/${id}`))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateTransaction(payload)
    const res = await api.post(wsPath('/transactions'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateTransaction(id, payload)
    const res = await api.patch(wsPath(`/transactions/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteTransaction(id)
    await api.delete(wsPath(`/transactions/${id}`))
  },

  /** POST /workspaces/:id/transactions/:tid/void */
  async void(id) {
    if (USE_MOCK) {
      // In mock mode, treat void as a soft-delete by adding a voided flag.
      return mockDeleteTransaction(id)
    }
    const res = await api.post(wsPath(`/transactions/${id}/void`))
    return res.data
  },

  /**
   * CSV import step 1 — POST /workspaces/:id/imports
   * Returns { import_id, preview: Row[], total, valid, rejected }
   */
  async importPreview(rows) {
    if (USE_MOCK) return mockCsvPreview(rows)
    const res = await api.post(wsPath('/imports'), { rows })
    return res.data
  },

  /**
   * CSV import step 2 — POST /workspaces/:id/imports/:iid/confirm
   * Returns { imported, transactions[] }
   */
  async importConfirm(importId, validRows) {
    if (USE_MOCK) return mockCsvConfirm(validRows)
    const res = await api.post(wsPath(`/imports/${importId}/confirm`))
    return res.data
  },
}
