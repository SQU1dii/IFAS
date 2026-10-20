import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import authService from '@/services/authService'

const TOKEN_KEY = 'ifas_token'
const USER_KEY = 'ifas_user'

/**
 * Auth store — owns the authenticated session.
 *
 * The token and user are persisted to localStorage so a page refresh
 * keeps the user logged in. The Axios client (services/api.js) reads
 * the same token key to attach it to every request.
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || null)
  const user = ref(safeParse(localStorage.getItem(USER_KEY)))

  const isAuthenticated = computed(() => !!token.value)
  const initials = computed(() => {
    const name = user.value?.name || user.value?.email || '?'
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  })

  function setSession(payload) {
    token.value = payload.token
    user.value = payload.user
    if (payload.token) localStorage.setItem(TOKEN_KEY, payload.token)
    if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  }

  async function login(credentials) {
    const res = await authService.login(credentials)
    setSession(res)
    return res
  }

  async function register(payload) {
    const res = await authService.register(payload)
    setSession(res)
    return res
  }

  async function forgotPassword(email) {
    return authService.forgotPassword(email)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function updateUser(partial) {
    user.value = { ...user.value, ...partial }
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  return {
    token,
    user,
    isAuthenticated,
    initials,
    login,
    register,
    forgotPassword,
    logout,
    updateUser,
  }
})

function safeParse(str) {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}
