/* =========================================================
 *  ⚠️  MOCK SERVICE — DEVELOPMENT ONLY
 *
 *  Simulates the Express backend. All functions return Promises
 *  that resolve after MOCK_DELAY ms to exercise loading states.
 *
 *  Data mutations (create / update / delete) operate on in-memory
 *  copies so changes persist within the tab session but reset on
 *  page refresh — exactly like a real API during development.
 *
 *  To switch to the real backend: set VITE_USE_MOCK=false in .env.
 * ========================================================= */

import {
  MOCK_TRANSACTIONS,
  MOCK_BUDGETS,
  MOCK_SAVINGS_GOALS,
  MOCK_USER,
  MOCK_ACCOUNTS,
  MOCK_CATEGORIES,
  MOCK_NOTIFICATIONS,
} from './mockData'

const MOCK_DELAY = 380

function delay(ms = MOCK_DELAY) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Mutable in-memory stores (reset on page reload) ────────
let _transactions  = [...MOCK_TRANSACTIONS]
let _accounts      = [...MOCK_ACCOUNTS]
let _budgets       = [...MOCK_BUDGETS]
let _savings       = [...MOCK_SAVINGS_GOALS]
let _notifications = [...MOCK_NOTIFICATIONS]
let _user          = { ...MOCK_USER }
let _idSeq         = 9000 // IDs for new records

function nextId(prefix) { return `${prefix}-${++_idSeq}` }

function inRange(date, start, end) {
  if (!start || !end) return true
  return date >= start && date <= end
}

// ── Auth ────────────────────────────────────────────────────

export async function mockLogin({ email, password }) {
  await delay()
  if (!email || !password) throw { message: 'Email and password are required.', status: 400 }
  // Accept any credentials in mock mode.
  return { accessToken: 'mock-access-token-' + Date.now(), user: { ..._user, email } }
}

export async function mockRegister({ name, email, password }) {
  await delay()
  if (!name || !email || !password) throw { message: 'All fields are required.', status: 400 }
  return { accessToken: 'mock-access-token-' + Date.now(), user: { ..._user, name, email } }
}

export async function mockRefreshToken() {
  await delay(120) // faster — session restore should be quick
  return { accessToken: 'mock-access-token-refreshed-' + Date.now(), user: { ..._user } }
}

export async function mockLogout() {
  await delay(120)
  return {}
}

export async function mockForgotPassword(email) {
  await delay()
  return { message: 'If an account exists for that email, a reset link has been sent.' }
}

export async function mockResetPassword({ token, password }) {
  await delay()
  if (!token || !password) throw { message: 'Invalid or expired reset token.', status: 400 }
  return { message: 'Password updated. You can now sign in.' }
}

// ── Analytics / Dashboard ────────────────────────────────────

/**
 * GET /analytics/overview
 * Net cash flow = totalIncome − totalExpenses (transfers excluded).
 * The frontend DISPLAYS what this function returns — it never recalculates.
 */
export async function mockGetDashboard({ start, end } = {}, comparison) {
  await delay()
  const period   = aggregate(_transactions, start, end)
  const previous = comparison ? aggregate(_transactions, comparison.start, comparison.end) : null
  const budgets  = computeBudgetUtilization(_transactions, end)
  const monthly  = buildMonthlySeries(_transactions, 7)
  const insights = buildInsights(period, budgets, previous)

  return {
    summary: {
      total_income:   period.income,
      total_expenses: period.expenses,
      net_cash_flow:  period.netCashFlow,  // income − expenses
      savings_rate:   period.savingsRate,
      period_changes: previous
        ? {
            income:        pctChange(period.income,        previous.income),
            expenses:      pctChange(period.expenses,      previous.expenses),
            net_cash_flow: pctChange(period.netCashFlow,   previous.netCashFlow),
          }
        : null,
    },
    spending_by_category: period.spendingByCategory,
    monthly_series:       monthly,
    budget_utilization:   budgets,
    savings_goals:        _savings,
    recent_transactions:  _transactions.slice(0, 6),
    insights,
  }
}

// ── Transactions ─────────────────────────────────────────────

export async function mockGetTransactions({
  page = 1, page_size = 15,
  type, category_id, account_id,
  search, from, to,
} = {}) {
  await delay()
  let items = [..._transactions]

  if (type)        items = items.filter((t) => t.type === type)
  if (category_id) items = items.filter((t) => t.category_id === category_id)
  if (account_id)  items = items.filter((t) => t.account_id === account_id || t.destination_account_id === account_id)
  if (from || to)  items = items.filter((t) => inRange(t.date, from, to))
  if (search) {
    const q = search.toLowerCase()
    items = items.filter((t) =>
      t.description.toLowerCase().includes(q) ||
      (t.category_name ?? '').toLowerCase().includes(q) ||
      (t.account_name ?? '').toLowerCase().includes(q)
    )
  }

  const total      = items.length
  const totalPages = Math.max(1, Math.ceil(total / page_size))
  const start      = (page - 1) * page_size
  const data       = items.slice(start, start + page_size)

  return {
    data,
    meta: { total, page, page_size, total_pages: totalPages },
  }
}

export async function mockGetTransaction(id) {
  await delay()
  const t = _transactions.find((t) => t.id === id)
  if (!t) throw { message: 'Transaction not found.', status: 404 }
  return t
}

export async function mockCreateTransaction(payload) {
  await delay()
  const acc  = _accounts.find((a) => a.id === payload.account_id)
  const dest = payload.destination_account_id
    ? _accounts.find((a) => a.id === payload.destination_account_id)
    : null
  const cat  = payload.category_id
    ? MOCK_CATEGORIES.find((c) => c.id === payload.category_id)
    : null

  const txn = {
    id: nextId('txn'),
    date: payload.date,
    description: payload.description,
    amount: Number(payload.amount),
    type: payload.type,
    category_id: payload.type === 'transfer' ? null : (payload.category_id ?? null),
    category_name: payload.type === 'transfer' ? null : (cat?.name ?? null),
    account_id: payload.account_id,
    account_name: acc?.name ?? '',
    destination_account_id: dest?.id ?? null,
    destination_account_name: dest?.name ?? null,
    notes: payload.notes ?? '',
  }
  _transactions.unshift(txn)
  return txn
}

export async function mockUpdateTransaction(id, payload) {
  await delay()
  const idx = _transactions.findIndex((t) => t.id === id)
  if (idx === -1) throw { message: 'Transaction not found.', status: 404 }
  const acc  = _accounts.find((a) => a.id === payload.account_id)
  const dest = payload.destination_account_id
    ? _accounts.find((a) => a.id === payload.destination_account_id)
    : null
  const cat  = payload.category_id
    ? MOCK_CATEGORIES.find((c) => c.id === payload.category_id)
    : null
  _transactions[idx] = {
    ..._transactions[idx],
    ...payload,
    amount: Number(payload.amount),
    category_name: payload.type === 'transfer' ? null : (cat?.name ?? null),
    account_name: acc?.name ?? _transactions[idx].account_name,
    destination_account_id: dest?.id ?? null,
    destination_account_name: dest?.name ?? null,
  }
  return _transactions[idx]
}

export async function mockDeleteTransaction(id) {
  await delay()
  const idx = _transactions.findIndex((t) => t.id === id)
  if (idx === -1) throw { message: 'Transaction not found.', status: 404 }
  _transactions.splice(idx, 1)
  return {}
}

// ── CSV import (two-step: preview → confirm) ─────────────────

/**
 * POST /transactions/import/preview
 * Parses a CSV payload and returns validated rows + any row-level errors.
 * Errors are non-fatal — the user can still confirm the valid rows.
 */
export async function mockCsvPreview(rows) {
  await delay(600)
  const REQUIRED = ['date', 'description', 'amount', 'type', 'account_id']
  const preview = rows.map((raw, i) => {
    const errors = []
    REQUIRED.forEach((f) => {
      if (!raw[f] || String(raw[f]).trim() === '') errors.push({ field: f, message: `${f} is required` })
    })
    if (raw.amount && isNaN(Number(raw.amount))) errors.push({ field: 'amount', message: 'amount must be a number' })
    if (raw.amount && Number(raw.amount) <= 0)   errors.push({ field: 'amount', message: 'amount must be positive' })
    if (raw.type && !['income', 'expense', 'transfer'].includes(raw.type))
      errors.push({ field: 'type', message: 'type must be income, expense, or transfer' })
    if (!_accounts.find((a) => a.id === raw.account_id || a.name === raw.account_id))
      errors.push({ field: 'account_id', message: 'account not found' })

    const acc = _accounts.find((a) => a.id === raw.account_id || a.name === raw.account_id)
    return {
      row: i + 1,
      data: {
        ...raw,
        amount: Number(raw.amount),
        account_id: acc?.id ?? raw.account_id,
        account_name: acc?.name ?? raw.account_id,
      },
      errors,
      valid: errors.length === 0,
    }
  })
  return { preview, total: rows.length, valid: preview.filter((r) => r.valid).length }
}

/**
 * POST /transactions/import/confirm
 * Inserts only the valid rows returned from the preview step.
 */
export async function mockCsvConfirm(validRows) {
  await delay(700)
  const created = []
  for (const row of validRows) {
    const txn = await mockCreateTransaction(row.data)
    created.push(txn)
  }
  return { imported: created.length, transactions: created }
}

// ── Accounts ─────────────────────────────────────────────────

export async function mockGetAccounts() {
  await delay()
  return [..._accounts]
}

export async function mockGetAccount(id) {
  await delay()
  const a = _accounts.find((a) => a.id === id)
  if (!a) throw { message: 'Account not found.', status: 404 }
  return a
}

export async function mockCreateAccount(payload) {
  await delay()
  const acc = {
    id: nextId('acc'),
    name: payload.name,
    type: payload.type,
    currency: payload.currency ?? 'USD',
    balance: Number(payload.balance ?? 0),
    institution: payload.institution ?? '',
    is_active: true,
    created_at: new Date().toISOString().slice(0, 10),
  }
  _accounts.push(acc)
  return acc
}

export async function mockUpdateAccount(id, payload) {
  await delay()
  const idx = _accounts.findIndex((a) => a.id === id)
  if (idx === -1) throw { message: 'Account not found.', status: 404 }
  _accounts[idx] = { ..._accounts[idx], ...payload }
  return _accounts[idx]
}

export async function mockDeleteAccount(id) {
  await delay()
  const idx = _accounts.findIndex((a) => a.id === id)
  if (idx === -1) throw { message: 'Account not found.', status: 404 }
  // Soft-delete: mark inactive.
  _accounts[idx] = { ..._accounts[idx], is_active: false }
  return {}
}

// ── Categories ────────────────────────────────────────────────

export async function mockGetCategories() {
  await delay(150)
  return [...MOCK_CATEGORIES]
}

// ── Notifications ────────────────────────────────────────────

export async function mockGetNotifications() {
  await delay(250)
  return [..._notifications]
}

export async function mockMarkNotificationRead(id) {
  await delay(120)
  const n = _notifications.find((n) => n.id === id)
  if (n) n.is_read = true
  return n ?? {}
}

export async function mockMarkAllNotificationsRead() {
  await delay(200)
  _notifications.forEach((n) => (n.is_read = true))
  return {}
}

// ── Budgets & Savings (used by dashboard + Phase 2b) ─────────

export async function mockGetBudgets() {
  await delay()
  return computeBudgetUtilization(_transactions, new Date().toISOString().slice(0, 10))
}

export async function mockGetSavingsGoals() {
  await delay()
  return [..._savings]
}

// ═══════════════════════════════════════════════════════════
//  Private aggregation helpers
// ═══════════════════════════════════════════════════════════

function aggregate(txns, startIso, endIso) {
  const filtered = txns.filter((t) => inRange(t.date, startIso, endIso))
  let income = 0
  let expenses = 0
  const byCategory = {}

  for (const t of filtered) {
    if (t.type === 'income')  { income += t.amount }
    if (t.type === 'expense') {
      expenses += t.amount
      const key = t.category_name ?? 'Uncategorized'
      byCategory[key] = { category_id: t.category_id, amount: (byCategory[key]?.amount ?? 0) + t.amount }
    }
    // transfers excluded from both totals
  }

  const netCashFlow  = income - expenses
  const savingsRate  = income > 0 ? (netCashFlow / income) * 100 : 0
  const spendingByCategory = Object.entries(byCategory)
    .map(([name, v]) => ({ name, category_id: v.category_id, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount)

  return { income, expenses, netCashFlow, savingsRate, spendingByCategory, byCategory }
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

function computeBudgetUtilization(txns, endIso) {
  const end   = new Date(endIso || new Date())
  const start = new Date(end.getFullYear(), end.getMonth(), 1).toISOString().slice(0, 10)
  const endStr = endIso || end.toISOString().slice(0, 10)

  return _budgets.map((b) => {
    const spent = txns
      .filter((t) => t.type === 'expense' && t.category_id === b.category_id && inRange(t.date, start, endStr))
      .reduce((s, t) => s + t.amount, 0)
    const remaining   = b.limit - spent
    const utilization = b.limit > 0 ? (spent / b.limit) * 100 : 0
    const status      = utilization >= 100 ? 'over' : utilization >= 80 ? 'warning' : 'on_track'
    return { ...b, spent, remaining, utilization, status }
  })
}

function buildMonthlySeries(txns, months) {
  const now    = new Date()
  const series = []
  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    const income   = txns.filter((t) => t.type === 'income'  && inRange(t.date, start, end)).reduce((s, t) => s + t.amount, 0)
    const expenses = txns.filter((t) => t.type === 'expense' && inRange(t.date, start, end)).reduce((s, t) => s + t.amount, 0)
    series.push({
      label:    d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      month:    d.toISOString().slice(0, 7),
      income,
      expenses,
      net: income - expenses,
    })
  }
  return series
}

function buildInsights(period, budgets, previous) {
  const insights = []

  if (period.savingsRate >= 20) {
    insights.push({ id: 'i-savings-good', type: 'positive', icon: 'trending-up', title: 'Healthy savings rate', message: `You saved ${period.savingsRate.toFixed(1)}% of income — above the 20% benchmark.` })
  } else if (period.savingsRate > 0 && period.savingsRate < 10) {
    insights.push({ id: 'i-savings-low', type: 'warning', icon: 'alert', title: 'Low savings rate', message: `Your savings rate is ${period.savingsRate.toFixed(1)}%. Try to reach 20%.` })
  }

  const overBudget = budgets.filter((b) => b.status === 'over')
  const nearBudget = budgets.filter((b) => b.status === 'warning')
  if (overBudget.length) insights.push({ id: 'i-over-budget', type: 'alert', icon: 'alert', title: 'Budget exceeded', message: `Over budget in: ${overBudget.map((b) => b.category_name).join(', ')}.` })
  if (nearBudget.length) insights.push({ id: 'i-near-budget', type: 'warning', icon: 'alert', title: 'Approaching budget limit', message: `Near limit in: ${nearBudget.map((b) => b.category_name).join(', ')}.` })

  if (period.spendingByCategory.length) {
    const top = period.spendingByCategory[0]
    insights.push({ id: 'i-top-cat', type: 'info', icon: 'info', title: 'Top spending category', message: `${top.name} is your largest expense at $${top.amount.toFixed(2)}.` })
  }

  if (previous) {
    const change = pctChange(period.expenses, previous.expenses)
    if (change !== null && Math.abs(change) >= 10) {
      insights.push({
        id: 'i-compare',
        type: change > 0 ? 'warning' : 'positive',
        icon: change > 0 ? 'trending-up' : 'trending-down',
        title: change > 0 ? 'Spending increased' : 'Spending decreased',
        message: `Expenses are ${Math.abs(change).toFixed(1)}% ${change > 0 ? 'higher' : 'lower'} than the previous period.`,
      })
    }
  }

  return insights
}
