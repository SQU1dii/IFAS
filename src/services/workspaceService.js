/**
 * Workspace service — CRUD for workspaces, members, departments, alerts,
 * recommendations, and dashboard summaries.
 *
 * All workspace-scoped calls use the path prefix /workspaces/:id.
 * The workspace id is passed in by the caller (always from useWorkspaceStore().wsId).
 */
import api from './api'
import {
  mockListWorkspaces,
  mockGetWorkspace,
  mockCreateWorkspace,
  mockListMembers,
  mockInviteMember,
  mockUpdateMemberRole,
  mockRemoveMember,
  mockListDepartments,
  mockCreateDepartment,
  mockUpdateDepartment,
  mockDeleteDepartment,
  mockListAlerts,
  mockUpdateAlert,
  mockListRecommendations,
  mockGetBusinessDashboard,
  mockGetOrgDashboard,
  mockGetConversations,
  mockSendMessage,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const w = (id) => `/workspaces/${id}`

export default {
  // ── Workspaces ──────────────────────────────────────────
  async list() {
    if (USE_MOCK) return mockListWorkspaces()
    const res = await api.get('/workspaces')
    return res.data
  },
  async get(id) {
    if (USE_MOCK) return mockGetWorkspace(id)
    const res = await api.get(w(id))
    return res.data
  },
  async create(payload) {
    if (USE_MOCK) return mockCreateWorkspace(payload)
    const res = await api.post('/workspaces', payload)
    return res.data
  },

  // ── Members ─────────────────────────────────────────────
  async listMembers(wsId) {
    if (USE_MOCK) return mockListMembers(wsId)
    const res = await api.get(`${w(wsId)}/members`)
    return res.data
  },
  async inviteMember(wsId, payload) {
    if (USE_MOCK) return mockInviteMember(wsId, payload)
    const res = await api.post(`${w(wsId)}/members`, payload)
    return res.data
  },
  async updateMemberRole(wsId, memberId, role) {
    if (USE_MOCK) return mockUpdateMemberRole(wsId, memberId, role)
    const res = await api.patch(`${w(wsId)}/members/${memberId}`, { role })
    return res.data
  },
  async removeMember(wsId, memberId) {
    if (USE_MOCK) return mockRemoveMember(wsId, memberId)
    await api.delete(`${w(wsId)}/members/${memberId}`)
  },

  // ── Departments ─────────────────────────────────────────
  async listDepartments(wsId) {
    if (USE_MOCK) return mockListDepartments(wsId)
    const res = await api.get(`${w(wsId)}/departments`)
    return res.data
  },
  async createDepartment(wsId, payload) {
    if (USE_MOCK) return mockCreateDepartment(wsId, payload)
    const res = await api.post(`${w(wsId)}/departments`, payload)
    return res.data
  },
  async updateDepartment(wsId, deptId, payload) {
    if (USE_MOCK) return mockUpdateDepartment(wsId, deptId, payload)
    const res = await api.patch(`${w(wsId)}/departments/${deptId}`, payload)
    return res.data
  },
  async deleteDepartment(wsId, deptId) {
    if (USE_MOCK) return mockDeleteDepartment(wsId, deptId)
    await api.delete(`${w(wsId)}/departments/${deptId}`)
  },

  // ── Alerts ──────────────────────────────────────────────
  async listAlerts(wsId) {
    if (USE_MOCK) return mockListAlerts(wsId)
    const res = await api.get(`${w(wsId)}/alerts`)
    return res.data
  },
  async updateAlert(wsId, alertId, action) {
    if (USE_MOCK) return mockUpdateAlert(wsId, alertId, action)
    const res = await api.patch(`${w(wsId)}/alerts/${alertId}`, { action })
    return res.data
  },

  // ── Recommendations ─────────────────────────────────────
  async listRecommendations(wsId) {
    if (USE_MOCK) return mockListRecommendations(wsId)
    const res = await api.get(`${w(wsId)}/recommendations`)
    return res.data
  },

  // ── Dashboard summaries ─────────────────────────────────
  async getBusinessDashboard(wsId, params = {}) {
    if (USE_MOCK) return mockGetBusinessDashboard(wsId, params)
    const res = await api.get(`${w(wsId)}/dashboard`, { params })
    return res.data
  },
  async getOrgDashboard(wsId, params = {}) {
    if (USE_MOCK) return mockGetOrgDashboard(wsId, params)
    const res = await api.get(`${w(wsId)}/dashboard`, { params })
    return res.data
  },

  // ── AI Assistant ────────────────────────────────────────
  async getConversations(wsId) {
    if (USE_MOCK) return mockGetConversations(wsId)
    const res = await api.get(`${w(wsId)}/assistant/conversations`)
    return res.data
  },
  async sendMessage(wsId, conversationId, content) {
    if (USE_MOCK) return mockSendMessage(wsId, conversationId, content)
    const res = await api.post(`${w(wsId)}/assistant/messages`, { conversation_id: conversationId, content })
    return res.data
  },
}
