/**
 * Account service — CRUD for the user's financial accounts.
 *
 * Account dropdowns across the app (transaction forms, filters) load from
 * this service so they always reflect the current list.
 *
 * "Delete" is a soft-deactivation on the backend (is_active: false).
 * Inactive accounts are excluded from the create/edit dropdowns but the
 * historical transactions referencing them are preserved.
 */
import api from './api'
import {
  mockGetAccounts,
  mockGetAccount,
  mockCreateAccount,
  mockUpdateAccount,
  mockDeleteAccount,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  async list() {
    if (USE_MOCK) return mockGetAccounts()
    const res = await api.get('/accounts')
    return res.data
  },

  async get(id) {
    if (USE_MOCK) return mockGetAccount(id)
    const res = await api.get(`/accounts/${id}`)
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateAccount(payload)
    const res = await api.post('/accounts', payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateAccount(id, payload)
    const res = await api.put(`/accounts/${id}`, payload)
    return res.data
  },

  /** Soft-deactivates the account. Historical transactions are preserved. */
  async deactivate(id) {
    if (USE_MOCK) return mockDeleteAccount(id)
    await api.delete(`/accounts/${id}`)
  },
}
