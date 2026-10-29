/**
 * Reports service.
 *
 * GET  /reports/summary  → full period financial summary
 * GET  /reports/export   → CSV download (backend streams the file)
 *
 * The totals returned by /reports/summary match the underlying
 * transaction records — the frontend displays them verbatim and
 * must never override or recalculate them.
 *
 * CSV export is triggered by opening the backend URL directly in a
 * new tab so the browser handles the file download natively.  In
 * mock mode a client-side CSV is generated from the summary data.
 */
import api from './api'
import { mockGetReportSummary } from './mock/mockService'

const USE_MOCK  = import.meta.env.VITE_USE_MOCK === 'true'
const API_BASE  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default {
  /**
   * @param {{ from, to }} params  ISO date strings
   */
  async getSummary(params = {}) {
    if (USE_MOCK) return mockGetReportSummary(params)
    const res = await api.get('/reports/summary', { params })
    return res.data
  },

  /**
   * Trigger a CSV download.
   * In mock mode: builds the CSV client-side from the summary data.
   * In real mode: opens the backend export URL in a new tab.
   *
   * @param {{ from, to }} params
   * @param {object|null}  summaryData  — pass the already-loaded summary
   *   so mock mode can generate the CSV without a second fetch.
   */
  exportCsv(params = {}, summaryData = null) {
    if (USE_MOCK) {
      _mockExportCsv(params, summaryData)
      return
    }
    const qs = new URLSearchParams({ from: params.from ?? '', to: params.to ?? '' }).toString()
    window.open(`${API_BASE}/reports/export?${qs}`, '_blank', 'noopener')
  },
}

// ── Mock CSV generator (dev only) ────────────────────────────
function _mockExportCsv(params, summary) {
  if (!summary) return

  const rows = [
    ['IFAS Financial Report — Kenya'],
    ['Period', params.from ?? '', 'to', params.to ?? ''],
    [],
    ['SUMMARY'],
    ['Total Income',   summary.summary.total_income.toFixed(2)],
    ['Total Expenses', summary.summary.total_expenses.toFixed(2)],
    ['Net Cash Flow',  summary.summary.net_cash_flow.toFixed(2)],
    ['Savings Rate',   summary.summary.savings_rate.toFixed(1) + '%'],
    ['Transactions',   summary.summary.transaction_count],
    [],
    ['INCOME BY CATEGORY', 'Amount'],
    ...( summary.income_by_category ?? []).map((r) => [r.name, r.amount.toFixed(2)]),
    [],
    ['EXPENSES BY CATEGORY', 'Amount'],
    ...(summary.expense_by_category ?? []).map((r) => [r.name, r.amount.toFixed(2)]),
    [],
    ['BUDGET PERFORMANCE', 'Limit', 'Spent', 'Remaining', 'Status'],
    ...(summary.budget_performance ?? []).map((b) => [
      b.category_name, b.limit.toFixed(2), b.spent.toFixed(2), b.remaining.toFixed(2), b.status,
    ]),
  ]

  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `ifas-report-${params.from ?? 'all'}-${params.to ?? 'all'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
