/**
 * Reports service — workspace-scoped.
 * GET  /workspaces/:id/reports?type=&from=&to=&format=
 */
import api from './api'
import { useWorkspaceStore } from '@/stores/workspace'
import { mockGetReportSummary } from './mock/mockService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
// Note: CSV export uses the api instance which has the correct baseURL and
// automatically includes the Authorization header via the request interceptor.
// We no longer need a separate API_BASE constant.

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

  async exportCsv(params = {}, summaryData = null) {
    const ws = useWorkspaceStore()
    if (USE_MOCK) {
      _mockExportCsv(params, summaryData)
      return
    }
    // Fetch the CSV via api (which includes auth header) and trigger download
    try {
      const qs = new URLSearchParams({
        type: 'full', format: 'csv',
        from: params.from ?? '', to: params.to ?? '',
      }).toString()
      const response = await api.get(wsPath(`/reports?${qs}`), {
        responseType: 'blob',
      })
      const blob = response instanceof Blob ? response : response.data
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ifas-report-${params.from ?? 'all'}-${params.to ?? 'all'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV export failed:', error)
      throw error
    }
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
