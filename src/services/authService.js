/**
 * Authentication service.
 * Paths: /auth/... (global — NOT workspace-scoped).
 *
 * Note: getCategories() and getAccounts() have been removed from here.
 * They are workspace-scoped and belong in categoryService and accountService.
 * Any component that needs categories or accounts for dropdowns should
 * import those services directly.
 */
import api from './api'
import {
  mockLogin,
  mockRegister,
  mockForgotPassword,
  mockResetPassword,
  mockRefreshToken,
  mockLogout,
} from './mock/mockService'
import { MOCK_USER } from './mock/mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  async login(credentials) {
    if (USE_MOCK) return mockLogin(credentials)
    const res = await api.post('/auth/login', credentials)
    return res.data
  },

  async register(payload) {
    if (USE_MOCK) return mockRegister(payload)
    const res = await api.post('/auth/register', payload)
    return res.data
  },

  async logout() {
    if (USE_MOCK) return mockLogout()
    await api.post('/auth/logout')
  },

  async refreshToken() {
    if (USE_MOCK) return mockRefreshToken()
    const res = await api.post('/auth/refresh')
    return res.data
  },

  async forgotPassword(email) {
    if (USE_MOCK) return mockForgotPassword(email)
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  },

  async resetPassword(payload) {
    if (USE_MOCK) return mockResetPassword(payload)
    const res = await api.post('/auth/reset-password', payload)
    return res.data
  },

  async getProfile() {
    if (USE_MOCK) return { ...MOCK_USER }
    const res = await api.get('/auth/me')
    return res.data
  },

  async updateProfile(payload) {
    if (USE_MOCK) return { ...MOCK_USER, ...payload }
    const res = await api.patch('/auth/me', payload)
    return res.data
  },

  async changePassword(payload) {
    if (USE_MOCK) return { message: 'Password updated.' }
    const res = await api.patch('/auth/me/password', payload)
    return res.data
  },
}
