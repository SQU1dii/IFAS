/**
 * Category service — workspace-scoped.
 * All paths: /workspaces/:id/categories
 *
 * GET    /workspaces/:id/categories          → list all
 * POST   /workspaces/:id/categories          → create { name, type }
 * PATCH  /workspaces/:id/categories/:id      → update { name }
 * DELETE /workspaces/:id/categories/:id      → delete
 *
 * Mock CRUD functions already exist in mockService.js
 * (mockGetCategories, mockCreateCategory, mockUpdateCategory, mockDeleteCategory).
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  mockGetCategories,
  mockCreateCategory,
  mockUpdateCategory,
  mockDeleteCategory,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

export default {
  async list() {
    if (USE_MOCK) return mockGetCategories()
    const res = await api.get(wsPath('/categories'))
    return res.data
  },

  async create(payload) {
    if (USE_MOCK) return mockCreateCategory(payload)
    const res = await api.post(wsPath('/categories'), payload)
    return res.data
  },

  async update(id, payload) {
    if (USE_MOCK) return mockUpdateCategory(id, payload)
    const res = await api.patch(wsPath(`/categories/${id}`), payload)
    return res.data
  },

  async remove(id) {
    if (USE_MOCK) return mockDeleteCategory(id)
    await api.delete(wsPath(`/categories/${id}`))
  },
}
