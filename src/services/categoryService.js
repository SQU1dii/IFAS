/**
 * Category service — workspace-scoped.
 * All paths: /workspaces/:id/categories
 *
 * GET    /workspaces/:id/categories          → list all
 * POST   /workspaces/:id/categories          → create { name, type }
 * PATCH  /workspaces/:id/categories/:id      → update { name }
 * DELETE /workspaces/:id/categories/:id      → delete
 */

// ── All imports MUST be at the top of an ES module ──────────
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import { mockGetCategories } from './mock/mockService'
import { MOCK_CATEGORIES }   from './mock/mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

// ── In-memory mock store for create/update/delete ──────────
// The seeded MOCK_CATEGORIES are read-only; this mutable copy is used
// for the session so CRUD actions persist until page refresh.
let _mockCats = [...MOCK_CATEGORIES]

export default {
  async list() {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200))
      return [..._mockCats]
    }
    const res = await api.get(wsPath('/categories'))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      const cat = { id: `cat-${Date.now()}`, name: payload.name.trim(), type: payload.type }
      _mockCats.push(cat)
      return cat
    }
    const res = await api.post(wsPath('/categories'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      const idx = _mockCats.findIndex((c) => c.id === id)
      if (idx !== -1) _mockCats[idx] = { ..._mockCats[idx], ...payload }
      return _mockCats[idx]
    }
    const res = await api.patch(wsPath(`/categories/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      _mockCats = _mockCats.filter((c) => c.id !== id)
      return {}
    }
    await api.delete(wsPath(`/categories/${id}`))
  },
}
