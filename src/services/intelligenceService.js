/**
 * Financial Intelligence service — workspace-scoped.
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

function wsId()         { return useWorkspaceStore().wsId }
function wsPath(p = '') { return `/workspaces/${wsId()}${p}` }

export default {
  async getInsights(params = {}) {
    if (USE_MOCK) return mockGetInsights({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/insights'), { params })
    return res.data
  },

  async getForecast(params = {}) {
    if (USE_MOCK) return mockGetForecast({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/forecast'), { params })
    return res.data
  },

  async getAnomalies(params = {}) {
    if (USE_MOCK) return mockGetAnomalies({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/anomalies'), { params })
    return res.data
  },

  async getSpendingPatterns(params = {}) {
    if (USE_MOCK) return mockGetSpendingPatterns({ ...params, wsId: wsId() })
    const res = await api.get(wsPath('/patterns'), { params })
    return res.data
  },

  async listAlerts() {
    if (USE_MOCK) return mockListAlerts(wsId())
    const res = await api.get(wsPath('/alerts'))
    return res.data
  },

  async updateAlert(alertId, action) {
    if (USE_MOCK) return mockUpdateAlert(wsId(), alertId, action)
    const res = await api.patch(wsPath(`/alerts/${alertId}/${action}`))
    return res.data
  },

  async getRecommendations() {
    if (USE_MOCK) return mockListRecommendations(wsId())
    const res = await api.get(wsPath('/recommendations'))
    return res.data
  },
}
