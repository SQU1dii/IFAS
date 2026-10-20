/**
 * Transaction service — all transaction-related API calls.
 *
 * Income and Expenses pages pass { type: 'income' } / { type: 'expense' }
 * as a filter — no separate endpoints needed.
 *
 * Transfers: the form sets type='transfer', clears category_id, and
 * populates destination_account_id. The backend enforces this; we mirror
 * it here for the mock and for the field names sent to the real API.
 */
import api from './api'
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

export default {
  /**
   * List transactions with optional filters.
   * @param {object} params  { page, page_size, type, category_id, account_id,
   *                           search, from, to }
   * @returns {{ data: Transaction[], meta: PaginationMeta }}
   */
  async list(params = {}) {
    if (USE_MOCK) return mockGetTransactions(params)
    const res = await api.get('/transactions', { params })
    return res // already unwrapped: { data, meta }
  },

  async get(id) {
    if (USE_MOCK) return mockGetTransaction(id)
    const res = await api.get(`/transactions/${id}`)
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateTransaction(payload)
    const res = await api.post('/transactions', payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateTransaction(id, payload)
    const res = await api.put(`/transactions/${id}`, payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteTransaction(id)
    await api.delete(`/transactions/${id}`)
  },

  /**
   * Step 1 of CSV import: send raw parsed rows to the backend for validation.
   * Returns { preview: Row[], total, valid } where each Row has { row, data, errors, valid }.
   */
  async importPreview(rows) {
    if (USE_MOCK) return mockCsvPreview(rows)
    const res = await api.post('/transactions/import/preview', { rows })
    return res.data
  },

  /**
   * Step 2 of CSV import: confirm only the valid rows from the preview.
   * Returns { imported: number, transactions: Transaction[] }.
   */
  async importConfirm(validRows) {
    if (USE_MOCK) return mockCsvConfirm(validRows)
    const res = await api.post('/transactions/import/confirm', { rows: validRows.map((r) => r.data) })
    return res.data
  },
}
