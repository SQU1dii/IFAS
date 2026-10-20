import axios from 'axios'

/**
 * Centralized Axios client.
 *
 * - Base URL comes from VITE_API_URL (see .env).
 * - Attaches the bearer token from the auth store's persisted storage.
 * - On a 401 response it clears the session and redirects to /login so
 *   session expiration is handled in one place.
 *
 * NOTE: No secrets live in the frontend. The token is issued by the backend
 * and stored only in the browser for the duration of the session.
 */

const TOKEN_KEY = 'ifas_token'
const USER_KEY = 'ifas_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request: attach token if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response: surface a readable error and handle session expiration.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    // Session expired / unauthorized → clear and redirect once.
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1'
      }
    }

    // Normalize the error so callers can always read a message.
    const normalized = normalizeError(error)
    return Promise.reject(normalized)
  }
)

function normalizeError(error) {
  const data = error?.response?.data
  const message =
    data?.message ||
    data?.error ||
    (error?.code === 'ECONNABORTED'
      ? 'The request timed out. Please try again.'
      : error?.message) ||
    'Something went wrong. Please try again.'
  return {
    message,
    status: error?.response?.status,
    data,
    isNetworkError: !error?.response,
  }
}

// Helpers also re-exported for the auth store to keep storage key parity.
export const storageKeys = { TOKEN_KEY, USER_KEY }

export default api
