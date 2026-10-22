/**
 * Financial Intelligence service.
 *
 * POST /intelligence/insights              → rule-based spending insights
 * POST /intelligence/forecast              → projected income/expenses (estimates)
 * POST /intelligence/anomalies/analyze     → transactions flagged for review
 * POST /intelligence/categorize            → per-category spending patterns
 *
 * ⚠ Contract rules enforced here and in the view:
 *  1. Every response item carries is_estimate: true|false.
 *     Views MUST render estimate items with a distinct visual treatment.
 *  2. Forecasts include uncertainty_pct and a disclaimer string.
 *     Both must be shown to the user.
 *  3. Anomalies are framed as "for review", never as fraud detection.
 *  4. When the backend returns { insufficient_data: true } the view
 *     shows a proper empty state — never invented data.
 *  5. source: 'rule_based' | 'model' is shown on each item so the user
 *     knows where the insight came from.
 */
import api from './api'
import {
  mockGetInsights,
  mockGetForecast,
  mockGetAnomalies,
  mockGetSpendingPatterns,
} from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default {
  /**
   * @param {{ from, to }} params
   */
  async getInsights(params = {}) {
    if (USE_MOCK) return mockGetInsights(params)
    const res = await api.post('/intelligence/insights', params)
    return res.data
  },

  /**
   * @param {{ horizon_months }} params  (default 3)
   * Returns { forecast[], based_on_months, disclaimer, insufficient_data? }
   */
  async getForecast(params = {}) {
    if (USE_MOCK) return mockGetForecast(params)
    const res = await api.post('/intelligence/forecast', params)
    return res.data
  },

  /**
   * @param {{ from, to }} params
   * Returns [] when no anomalies found — view must show empty state.
   */
  async getAnomalies(params = {}) {
    if (USE_MOCK) return mockGetAnomalies(params)
    const res = await api.post('/intelligence/anomalies/analyze', params)
    return res.data
  },

  /**
   * @param {{ months }} params
   */
  async getSpendingPatterns(params = {}) {
    if (USE_MOCK) return mockGetSpendingPatterns(params)
    const res = await api.post('/intelligence/categorize', params)
    return res.data
  },
}
