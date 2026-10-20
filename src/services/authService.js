/**
 * Authentication service.
 *
 * Mock mode (VITE_USE_MOCK=true) → dev-only mock layer.
 * Real mode                      → Express API via centralized Axios client.
 *
 * All mock imports are static so Vite bundles them consistently
 * (no dynamic import + Vite chunk warnings).
 */
import api from './api'
import {
  mockLogin,
  mockRegister,
  mockForgotPassword,
  mockResetPassword,
  mockRefreshToken,
  mockLogout,
  mockGetCategories,
  mockGetAccounts,
} from './mock/mockService'
import { MOCK_USER } from './mock/mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  async login(credentials) {
    if (USE_MOCK) return mockLogin(credentials)
    const res = await api.post('/auth/login', credentials)
    return res.data // { accessToken, user }
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
    // withCredentials is set on the Axios instance, so the cookie is sent.
    const res = await api.post('/auth/refresh')
    return res.data // { accessToken, user }
  },

  async forgotPassword(email) {
    if (USE_MOCK) return mockForgotPassword(email)
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  },

  async resetPassword(payload) {
    // payload: { token, password, confirmPassword }
    if (USE_MOCK) return mockResetPassword(payload)
    const res = await api.post('/auth/reset-password', payload)
    return res.data
  },

  async getProfile() {
    if (USE_MOCK) return { ...MOCK_USER }
    const res = await api.get('/profile')
    return res.data
  },

  async updateProfile(payload) {
    if (USE_MOCK) return { ...MOCK_USER, ...payload }
    const res = await api.put('/profile', payload)
    return res.data
  },

  async changePassword(payload) {
    if (USE_MOCK) return { message: 'Password updated.' }
    const res = await api.put('/profile/password', payload)
    return res.data
  },

  async getCategories() {
    if (USE_MOCK) return mockGetCategories()
    const res = await api.get('/categories')
    return res.data
  },

  async getAccounts() {
    if (USE_MOCK) return mockGetAccounts()
    const res = await api.get('/accounts')
    return res.data
  },
}
