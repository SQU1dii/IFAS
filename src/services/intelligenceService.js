/**
 * Financial Intelligence service — workspace-scoped.
 *
 * GET  /workspaces/:id/forecast?category=&horizon=
 * GET  /workspaces/:id/alerts            (open alerts)
 * GET  /workspaces/:id/recommendations
 * POST /workspaces/:id/alerts/:aid       { action: 'review'|'dismiss' }
 * POST /workspaces/:id/assistant/messages
 *
 * Contract rules:
 *  1. is_estimate: true items must be visually distinct in the view.
 *  2. Forecasts carry uncertainty_pct and a disclaimer string.
 *  3. Anomalies / alerts are framed as "for review", never as fraud.
 *  4. insufficient_data → empty state, never invented data.
 *  5. source: 'rule_based' | 'model' shown on each item.
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import {
  mockGetInsights,
  mockGetForecast,
  mockGetAnomalies,
  mockGetSpendingPatterns,
  mockListAlerts,
  mockUpdateAlert,
  mockListRecommendations,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

export default {
  async getInsights(params = {}) {
    if (USE_MOCK) return mockGetInsights(params)
    const res = await api.get(wsPath('/insights'), { params })
    return res.data
  },

  async getForecast(params = {}) {
    if (USE_MOCK) return mockGetForecast(params)
    const res = await api.get(wsPath('/forecast'), { params })
    return res.data
  },

  async getAnomalies(params = {}) {
    if (USE_MOCK) return mockGetAnomalies(params)
    const res = await api.get(wsPath('/anomalies'), { params })
    return res.data
  },

  async getSpendingPatterns(params = {}) {
    if (USE_MOCK) return mockGetSpendingPatterns(params)
    const res = await api.get(wsPath('/patterns'), { params })
    return res.data
  },

  async listAlerts() {
    const ws = useWorkspaceStore()
    if (USE_MOCK) return mockListAlerts(ws.wsId)
    const res = await api.get(wsPath('/alerts'))
    return res.data
  },

  async updateAlert(alertId, action) {
    const ws = useWorkspaceStore()
    if (USE_MOCK) return mockUpdateAlert(ws.wsId, alertId, action)
    // Backend expects PATCH /alerts/:id with body { action: 'review'|'dismiss' }
    const res = await api.patch(wsPath(`/alerts/${alertId}`), { action })
    return res.data
  },

  async getRecommendations() {
    const ws = useWorkspaceStore()
    if (USE_MOCK) return mockListRecommendations(ws.wsId)
    const res = await api.get(wsPath('/recommendations'))
    return res.data
  },
}
