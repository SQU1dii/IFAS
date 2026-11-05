/**
 * Reports service — workspace-scoped.
 * GET  /workspaces/:id/reports?type=&from=&to=&format=
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import { mockGetReportSummary } from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

function wsPath(path = '') {
  const ws = useWorkspaceStore()
  return `/workspaces/${ws.wsId}${path}`
}

export default {
  async getSummary(params = {}) {
    if (USE_MOCK) return mockGetReportSummary(params)
    const res = await api.get(wsPath('/reports'), { params: { type: 'summary', ...params } })
    return res.data
  },

  exportCsv(params = {}, summaryData = null) {
    const ws = useWorkspaceStore()
    if (USE_MOCK) {
      _mockExportCsv(params, summaryData)
      return
    }
    const qs = new URLSearchParams({
      type: 'full', format: 'csv',
      from: params.from ?? '', to: params.to ?? '',
    }).toString()
    window.open(`${API_BASE}/workspaces/${ws.wsId}/reports?${qs}`, '_blank', 'noopener')
  },
}

function _mockExportCsv(params, summary) {
  if (!summary) return
  const rows = [
    ['IFAS Financial Report — Kenya'],
    ['Period', params.from ?? '', 'to', params.to ?? ''],
    [],
    ['SUMMARY'],
    ['Total Income',    summary.summary.total_income.toFixed(2)],
    ['Total Expenses',  summary.summary.total_expenses.toFixed(2)],
    ['Net Cash Flow',   summary.summary.net_cash_flow.toFixed(2)],
    ['Savings Rate',    summary.summary.savings_rate.toFixed(1) + '%'],
    ['Transactions',    summary.summary.transaction_count],
    [],
    ['INCOME BY CATEGORY', 'Amount'],
    ...(summary.income_by_category ?? []).map((r) => [r.name, r.amount.toFixed(2)]),
    [],
    ['EXPENSES BY CATEGORY', 'Amount'],
    ...(summary.expense_by_category ?? []).map((r) => [r.name, r.amount.toFixed(2)]),
    [],
    ['BUDGET PERFORMANCE', 'Limit', 'Spent', 'Remaining', 'Status'],
    ...(summary.budget_performance ?? []).map((b) => [
      b.category_name, b.limit.toFixed(2), b.spent.toFixed(2), b.remaining.toFixed(2), b.status,
    ]),
  ]
  const csv  = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `ifas-report-${params.from ?? 'all'}-${params.to ?? 'all'}.csv`
  a.click(); URL.revokeObjectURL(url)
}
