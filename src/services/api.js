/**
 * Centralized Axios client — IFAS frontend.
 *
 * Auth flow (matches backend contract):
 *  • Access token is kept in memory only (never localStorage / sessionStorage)
 *    via the `tokenStore` singleton below.
 *  • The server issues a short-lived access token in the response body and
 *    sets a long-lived HttpOnly refresh-token cookie automatically.
 *  • withCredentials: true ensures the cookie is sent on every request and on
 *    the /auth/refresh call.
 *  • On a 401 the interceptor calls POST /auth/refresh once. If it succeeds
 *    the original request is retried with the new token. If it fails the
 *    session is cleared and the user is sent to /login.
 *  • A mutex (isRefreshing + queue) prevents multiple simultaneous 401s from
 *    each triggering their own refresh call — only the first fires; the rest
 *    wait and then retry with the same new token.
 *
 * Response unwrapping:
 *  Every successful backend response is shaped as:
 *    { success: true, message, data, meta }
 *  The response interceptor unwraps this so callers receive
 *    { data, meta }          ← for paginated results
 *    data                    ← for single-item or array results
 *  Errors are shaped as:
 *    { success: false, message, errors: [{ field, message }] }
 *  The error interceptor normalizes these into:
 *    { message, fieldErrors: { [field]: message }, status }
 *  so form components can map errors onto fields with one line.
 */

import axios from 'axios'

// ── In-memory token store ─────────────────────────────────
// Never persisted to disk. The only way to restore a session after a page
// refresh is through the /auth/refresh endpoint (which uses the HttpOnly
// cookie the browser sends automatically).
export const tokenStore = {
  _token: null,
  get() { return this._token },
  set(t) { this._token = t },
  clear() { this._token = null },
}

// ── Axios instance ────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true, // send the HttpOnly refresh-token cookie on every req
})

// ── Request interceptor — attach access token ─────────────
api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── 401 refresh mutex ─────────────────────────────────────
let isRefreshing = false
let refreshQueue = [] // [{ resolve, reject }]

function processQueue(error, token) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

// ── Response interceptor — unwrap envelope + handle 401 ───
api.interceptors.response.use(
  (response) => {
    // Unwrap the { success, message, data, meta } envelope.
    const body = response.data
    if (body && typeof body === 'object' && 'success' in body) {
      // Return an object that always has data + meta so callers are uniform.
      return { data: body.data, meta: body.meta ?? null, message: body.message }
    }
    // Pass-through for non-envelope responses (e.g. CSV download streams).
    return response
  },

  async (error) => {
    const original = error.config

    // Only attempt a refresh on 401, once, and not on the refresh call itself.
    if (
      error?.response?.status === 401 &&
      !original._retried &&
      !original.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh resolves.
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`
            return api(original)
          })
          .catch((err) => Promise.reject(normalizeError(err)))
      }

      original._retried = true
      isRefreshing = true

      try {
        // The refresh cookie is sent automatically by the browser.
        const res = await api.post('/auth/refresh')
        const newToken = res.data?.accessToken ?? res.data
        tokenStore.set(newToken)
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        tokenStore.clear()
        // Notify the auth store so it can clean up user state.
        window.dispatchEvent(new CustomEvent('ifas:session-expired'))
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=1'
        }
        return Promise.reject(normalizeError(refreshError))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(normalizeError(error))
  }
)

// ── Error normalizer ──────────────────────────────────────
function normalizeError(error) {
  const body = error?.response?.data
  const message =
    body?.message ||
    (error?.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : null) ||
    error?.message ||
    'Something went wrong. Please try again.'

  // Map field-level errors from the backend onto a plain object so form
  // components can do:  if (err.fieldErrors?.email) { … }
  const fieldErrors = {}
  if (Array.isArray(body?.errors)) {
    body.errors.forEach(({ field, message: msg }) => {
      if (field) fieldErrors[field] = msg
    })
  }

  return {
    message,
    fieldErrors,
    status: error?.response?.status,
    isNetworkError: !error?.response,
  }
}

export default api
