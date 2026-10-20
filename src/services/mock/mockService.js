/* =========================================================
 *  ⚠️  MOCK SERVICE — DEVELOPMENT ONLY
 *
 *  Simulates the backend API using the sample data in mockData.js.
 *  Each function returns a Promise that resolves after a short delay
 *  to mimic network latency and exercising loading states.
 *
 *  Production services call the real Axios client instead of these
 *  functions (see authService.js / dashboardService.js).
 * ========================================================= */

import {
  MOCK_TRANSACTIONS,
  MOCK_BUDGETS,
  MOCK_SAVINGS_GOALS,
  MOCK_USER,
  CATEGORIES,
  ACCOUNTS,
} from './mockData'

const MOCK_DELAY = 450 // ms — keeps loading states visible during dev

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Tiny in-memory token store for the mock auth flow.
let mockToken = 'mock-jwt-token-' + Date.now()

function inRange(dateStr, startIso, endIso) {
  return dateStr >= startIso && dateStr <= endIso
}

// ---- Auth ---------------------------------------------------------------------

export async function mockLogin({ email, password }) {
  await delay()
  // Accept any well-formed credentials in mock mode, but reject empty ones
  // (the store validates before calling, so this is a safety net).
  if (!email || !password) {
    throw { message: 'Invalid email or password.', status: 400 }
  }
  return {
    token: mockToken,
    user: { ...MOCK_USER, email: email || MOCK_USER.email },
  }
}

export async function mockRegister({ name, email }) {
  await delay()
  return {
    token: mockToken,
    user: { ...MOCK_USER, name: name || MOCK_USER.name, email: email || MOCK_USER.email },
  }
}

export async function mockForgotPassword(email) {
  await delay()
  // Always return a generic success message (never reveal whether the email exists).
  return { message: 'If an account exists for that email, a reset link has been sent.' }
}

// ---- Dashboard aggregates -----------------------------------------------------

/**
 * Compute the full dashboard payload for a date range, including a
 * comparison against the previous period.
 *
 * NET CASH FLOW is defined as:
 *   totalIncome − totalExpenses
 * where transfers are excluded from both totals because moving money
 * between your own accounts is neither income nor an expense.
 */
export async function mockGetDashboard({ start, end }, comparison) {
  await delay()

  const period = aggregate(MOCK_TRANSACTIONS, start, end)
  const previous = comparison
    ? aggregate(MOCK_TRANSACTIONS, comparison.start, comparison.end)
    : null

  const budgets = computeBudgetUtilization(MOCK_TRANSACTIONS, end)
  const recent = MOCK_TRANSACTIONS.slice(0, 6)
  const monthlySeries = buildMonthlySeries(MOCK_TRANSACTIONS, 7)
  const insights = buildInsights(period, budgets, previous)

  return {
    summary: {
      totalIncome: period.income,
      totalExpenses: period.expenses,
      netCashFlow: period.netCashFlow,
      savingsRate: period.savingsRate,
      // Period-over-period deltas (null when there's no previous data).
      changes: previous
        ? {
            income: pctChange(period.income, previous.income),
            expenses: pctChange(period.expenses, previous.expenses),
            netCashFlow: pctChange(period.netCashFlow, previous.netCashFlow),
          }
        : { income: null, expenses: null, netCashFlow: null },
    },
    spendingByCategory: period.spendingByCategory,
    monthlySeries,
    budgets,
    savingsGoals: MOCK_SAVINGS_GOALS,
    recentTransactions: recent,
    insights,
  }
}

// ---- Transactions -------------------------------------------------------------

export async function mockGetTransactions({ page = 1, pageSize = 10, ...filters } = {}) {
  await delay()
  let items = [...MOCK_TRANSACTIONS]

  if (filters.type) items = items.filter((t) => t.type === filters.type)
  if (filters.categoryId) items = items.filter((t) => t.categoryId === filters.categoryId)
  if (filters.accountId) items = items.filter((t) => t.accountId === filters.accountId)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    items = items.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }
  if (filters.start && filters.end) {
    items = items.filter((t) => inRange(t.date, filters.start, filters.end))
  }

  const total = items.length
  const startIdx = (page - 1) * pageSize
  const data = items.slice(startIdx, startIdx + pageSize)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

// ---- Budgets & savings --------------------------------------------------------

export async function mockGetBudgets() {
  await delay()
  return computeBudgetUtilization(MOCK_TRANSACTIONS, new Date().toISOString().slice(0, 10))
}

export async function mockGetSavingsGoals() {
  await delay()
  return MOCK_SAVINGS_GOALS
}

// ---- Reference data -----------------------------------------------------------

export async function mockGetCategories() {
  await delay(150)
  return CATEGORIES
}

export async function mockGetAccounts() {
  await delay(150)
  return ACCOUNTS
}

// ---- Aggregation helpers ------------------------------------------------------

function aggregate(txns, startIso, endIso) {
  const filtered = txns.filter((t) => inRange(t.date, startIso, endIso))

  let income = 0
  let expenses = 0
  const byCategory = {} // { name, amount } for expenses

  for (const t of filtered) {
    if (t.type === 'income') {
      income += t.amount
    } else if (t.type === 'expense') {
      expenses += t.amount
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
    }
    // transfers are intentionally excluded from both totals
  }

  const netCashFlow = income - expenses
  const savingsRate = income > 0 ? (netCashFlow / income) * 100 : 0

  const spendingByCategory = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  return { income, expenses, netCashFlow, savingsRate, spendingByCategory }
}

function pctChange(current, previous) {
  if (!previous || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function computeBudgetUtilization(txns, endIso) {
  // Budgets are evaluated against spending in the month containing endIso.
  const end = new Date(endIso)
  const monthStart = new Date(end.getFullYear(), end.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const monthEnd = endIso

  return MOCK_BUDGETS.map((b) => {
    const spent = txns
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.categoryId === b.categoryId &&
          inRange(t.date, monthStart, monthEnd)
      )
      .reduce((sum, t) => sum + t.amount, 0)

    const remaining = b.limit - spent
    const utilization = b.limit > 0 ? (spent / b.limit) * 100 : 0
    const status =
      utilization >= 100 ? 'over' : utilization >= 80 ? 'warning' : 'on-track'

    return { ...b, spent, remaining, utilization, status }
  })
}

function buildMonthlySeries(txns, months) {
  const now = new Date()
  const series = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const start = new Date(y, m, 1).toISOString().slice(0, 10)
    const end = new Date(y, m + 1, 0).toISOString().slice(0, 10)

    const monthTxns = txns.filter((t) => inRange(t.date, start, end))
    const income = monthTxns
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const expenses = monthTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)

    series.push({
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income,
      expenses,
      net: income - expenses,
    })
  }
  return series
}

function buildInsights(period, budgets, previous) {
  const insights = []

  // Savings-rate insight
  if (period.savingsRate >= 20) {
    insights.push({
      id: 'insight-savings',
      type: 'positive',
      icon: 'trending-up',
      title: 'Healthy savings rate',
      message: `You saved ${period.savingsRate.toFixed(1)}% of your income this period. That's above the recommended 20% benchmark.`,
    })
  } else if (period.savingsRate < 10 && period.savingsRate > 0) {
    insights.push({
      id: 'insight-savings-low',
      type: 'warning',
      icon: 'alert',
      title: 'Low savings rate',
      message: `Your savings rate is ${period.savingsRate.toFixed(1)}%. Consider reviewing discretionary spending to push it toward 20%.`,
    })
  }

  // Budget alerts
  const overBudget = budgets.filter((b) => b.status === 'over')
  const nearBudget = budgets.filter((b) => b.status === 'warning')
  if (overBudget.length) {
    insights.push({
      id: 'insight-budget-over',
      type: 'alert',
      icon: 'alert',
      title: 'Budget exceeded',
      message: `You've gone over budget in ${overBudget.map((b) => b.category).join(', ')}. Review these categories to stay on track.`,
    })
  }
  if (nearBudget.length) {
    insights.push({
      id: 'insight-budget-near',
      type: 'warning',
      icon: 'alert',
      title: 'Approaching budget limit',
      message: `You're close to your limit for ${nearBudget.map((b) => b.category).join(', ')}.`,
    })
  }

  // Top spending category
  if (period.spendingByCategory.length) {
    const top = period.spendingByCategory[0]
    insights.push({
      id: 'insight-top-cat',
      type: 'info',
      icon: 'info',
      title: 'Top spending category',
      message: `${top.name} is your largest expense at $${top.amount.toFixed(2)} this period.`,
    })
  }

  // Period comparison
  if (previous && previous.expenses > 0 && period.expenses > 0) {
    const change = pctChange(period.expenses, previous.expenses)
    if (change !== null && Math.abs(change) >= 10) {
      insights.push({
        id: 'insight-period-compare',
        type: change > 0 ? 'warning' : 'positive',
        icon: change > 0 ? 'trending-up' : 'trending-down',
        title: change > 0 ? 'Spending increased' : 'Spending decreased',
        message: `Your spending is ${Math.abs(change).toFixed(1)}% ${change > 0 ? 'higher' : 'lower'} than the previous period.`,
      })
    }
  }

  return insights
}
