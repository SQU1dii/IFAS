/**
 * Authentication service.
 *
 * In mock mode (VITE_USE_MOCK === 'true') it talks to the dev-only mock
 * service. Otherwise it calls the real Express API through the centralized
 * Axios client. The rest of the app never references mock data directly —
 * it only calls these service functions.
 *
 * All mock imports are static (not dynamic) so Vite bundles them
 * consistently and doesn't emit chunk-placement warnings.
 */
import api from './api'
import {
  mockLogin,
  mockRegister,
  mockForgotPassword,
  mockGetCategories,
  mockGetAccounts,
} from './mock/mockService'
import { MOCK_USER } from './mock/mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  async login(credentials) {
    if (USE_MOCK) return mockLogin(credentials)
    const { data } = await api.post('/auth/login', credentials)
    return data // { token, user }
  },

  async register(payload) {
    if (USE_MOCK) return mockRegister(payload)
    const { data } = await api.post('/auth/register', payload)
    return data // { token, user }
  },

  async forgotPassword(email) {
    if (USE_MOCK) return mockForgotPassword(email)
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  },

  async getProfile() {
    if (USE_MOCK) return { ...MOCK_USER }
    const { data } = await api.get('/auth/me')
    return data
  },

  async updateProfile(payload) {
    if (USE_MOCK) return { ...payload }
    const { data } = await api.put('/auth/me', payload)
    return data
  },

  async changePassword(payload) {
    if (USE_MOCK) return { message: 'Password updated.' }
    const { data } = await api.put('/auth/me/password', payload)
    return data
  },

  // Reference data (categories, accounts) used by transaction forms.
  async getCategories() {
    if (USE_MOCK) return mockGetCategories()
    const { data } = await api.get('/categories')
    return data
  },

  async getAccounts() {
    if (USE_MOCK) return mockGetAccounts()
    const { data } = await api.get('/accounts')
    return data
  },
}
