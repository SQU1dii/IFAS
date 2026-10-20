import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tokenStore } from '@/services/api'
import authService from '@/services/authService'

/**
 * Auth store — owns the authenticated session.
 *
 * Token storage strategy (matches the new backend contract):
 *  • Access token — in memory only via tokenStore. Never written to disk.
 *    Lost on page refresh; restored via restoreSession() on app boot.
 *  • User object — stored in localStorage for UX continuity (name, email,
 *    currency pref). Contains no secrets.
 *  • Refresh token — in an HttpOnly cookie managed by the browser. The
 *    frontend never reads or writes it directly.
 *
 * Session restore flow (called from main.js before mounting):
 *  1. Call POST /auth/refresh.
 *  2. If it succeeds, store the new access token in tokenStore and the user.
 *  3. If it fails (cookie expired / missing), the user stays logged out.
 */

const USER_KEY = 'ifas_user'

export const useAuthStore = defineStore('auth', () => {
  // Token lives in tokenStore (module-level singleton), not in a ref,
  // because it must not be reactive (no need to re-render on token rotation).
  const user = ref(safeParse(localStorage.getItem(USER_KEY)))
  const isAuthenticated = computed(() => !!tokenStore.get())

  // The token check above is not reactive by default because tokenStore is
  // a plain object. We use a separate boolean ref that we flip after
  // login/logout/restore so computed dependents re-evaluate.
  const _authFlag = ref(!!tokenStore.get())
  const isLoggedIn = computed(() => _authFlag.value)

  const initials = computed(() => {
    const name = user.value?.name || user.value?.email || '?'
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  })

  function _setSession({ accessToken, user: u }) {
    tokenStore.set(accessToken)
    _authFlag.value = true
    if (u) {
      user.value = u
      localStorage.setItem(USER_KEY, JSON.stringify(u))
    }
  }

  function _clearSession() {
    tokenStore.clear()
    _authFlag.value = false
    user.value = null
    localStorage.removeItem(USER_KEY)
  }

  // ── Public actions ──────────────────────────────────────

  async function login(credentials) {
    const res = await authService.login(credentials)
    // Backend returns { accessToken, user } inside the unwrapped data field.
    _setSession(res)
    return res
  }

  async function register(payload) {
    const res = await authService.register(payload)
    _setSession(res)
    return res
  }

  async function forgotPassword(email) {
    return authService.forgotPassword(email)
  }

  async function resetPassword(payload) {
    return authService.resetPassword(payload)
  }

  /**
   * Called on app boot (main.js). Hits POST /auth/refresh — if the
   * HttpOnly cookie is still valid, we get a new access token back and
   * the user stays logged in silently. If not, _clearSession() is called
   * so the router guard redirects to /login.
   */
  async function restoreSession() {
    try {
      const res = await authService.refreshToken()
      _setSession(res)
    } catch {
      // No valid cookie — start fresh. Not an error.
      _clearSession()
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      // Even if the server call fails, always clear local state.
    } finally {
      _clearSession()
    }
  }

  function updateUser(partial) {
    user.value = { ...user.value, ...partial }
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  // Listen for the session-expired event dispatched by the Axios interceptor.
  if (typeof window !== 'undefined') {
    window.addEventListener('ifas:session-expired', () => _clearSession())
  }

  return {
    user,
    isAuthenticated,
    isLoggedIn,
    initials,
    login,
    register,
    forgotPassword,
    resetPassword,
    restoreSession,
    logout,
    updateUser,
  }
})

function safeParse(str) {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}
