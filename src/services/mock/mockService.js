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
  MOCK_CONTRIBUTIONS,
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
let _contributions = MOCK_CONTRIBUTIONS.map((c) => ({ ...c }))
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
    currency: payload.currency ?? 'KES',
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

// ── Budgets ───────────────────────────────────────────────────

/**
 * GET /budgets/status — returns every budget enriched with
 * current-period spending, remaining, utilization, and status.
 * The frontend DISPLAYS these values; it never recalculates them.
 */
export async function mockGetBudgets() {
  await delay()
  return computeBudgetUtilization(_transactions, new Date().toISOString().slice(0, 10))
}

export async function mockGetBudget(id) {
  await delay()
  const b = _budgets.find((b) => b.id === id)
  if (!b) throw { message: 'Budget not found.', status: 404 }
  // Enrich with current utilization
  const [enriched] = computeBudgetUtilization(_transactions, new Date().toISOString().slice(0, 10))
    .filter((x) => x.id === id)
  return enriched ?? b
}

export async function mockCreateBudget(payload) {
  await delay()
  // Enforce period constraint: monthly or yearly only.
  if (!['monthly', 'yearly'].includes(payload.period)) {
    throw { message: 'period must be "monthly" or "yearly".', status: 422 }
  }
  const cat = MOCK_CATEGORIES.find((c) => c.id === payload.category_id)
  const bud = {
    id:            nextId('bud'),
    category_id:   payload.category_id,
    category_name: cat?.name ?? payload.category_name ?? '',
    limit:         Number(payload.limit),
    period:        payload.period,
    notes:         payload.notes ?? '',
  }
  _budgets.push(bud)
  return bud
}

export async function mockUpdateBudget(id, payload) {
  await delay()
  const idx = _budgets.findIndex((b) => b.id === id)
  if (idx === -1) throw { message: 'Budget not found.', status: 404 }
  if (payload.period && !['monthly', 'yearly'].includes(payload.period)) {
    throw { message: 'period must be "monthly" or "yearly".', status: 422 }
  }
  const cat = payload.category_id
    ? MOCK_CATEGORIES.find((c) => c.id === payload.category_id)
    : null
  _budgets[idx] = {
    ..._budgets[idx],
    ...payload,
    limit: payload.limit != null ? Number(payload.limit) : _budgets[idx].limit,
    category_name: cat?.name ?? _budgets[idx].category_name,
  }
  return _budgets[idx]
}

export async function mockDeleteBudget(id) {
  await delay()
  const idx = _budgets.findIndex((b) => b.id === id)
  if (idx === -1) throw { message: 'Budget not found.', status: 404 }
  _budgets.splice(idx, 1)
  return {}
}

// ── Savings Goals ─────────────────────────────────────────────

export async function mockGetSavingsGoals() {
  await delay()
  // Enrich with derived progress fields so views never calculate totals.
  return _savings.map((g) => enrichGoal(g))
}

export async function mockGetSavingsGoal(id) {
  await delay()
  const g = _savings.find((g) => g.id === id)
  if (!g) throw { message: 'Savings goal not found.', status: 404 }
  return enrichGoal(g)
}

export async function mockCreateSavingsGoal(payload) {
  await delay()
  const goal = {
    id:             nextId('goal'),
    name:           payload.name,
    target_amount:  Number(payload.target_amount),
    current_amount: Number(payload.initial_amount ?? 0),
    target_date:    payload.target_date ?? null,
    notes:          payload.notes ?? '',
  }
  _savings.push(goal)
  // Record initial contribution if provided
  if (goal.current_amount > 0) {
    _contributions.push({
      id:     nextId('con'),
      goal_id: goal.id,
      date:   new Date().toISOString().slice(0, 10),
      amount:  goal.current_amount,
      type:   'contribution',
      notes:  'Initial deposit',
    })
  }
  return enrichGoal(goal)
}

export async function mockUpdateSavingsGoal(id, payload) {
  await delay()
  const idx = _savings.findIndex((g) => g.id === id)
  if (idx === -1) throw { message: 'Savings goal not found.', status: 404 }
  _savings[idx] = {
    ..._savings[idx],
    name:          payload.name          ?? _savings[idx].name,
    target_amount: payload.target_amount != null ? Number(payload.target_amount) : _savings[idx].target_amount,
    target_date:   payload.target_date   ?? _savings[idx].target_date,
    notes:         payload.notes         ?? _savings[idx].notes,
  }
  return enrichGoal(_savings[idx])
}

export async function mockDeleteSavingsGoal(id) {
  await delay()
  const idx = _savings.findIndex((g) => g.id === id)
  if (idx === -1) throw { message: 'Savings goal not found.', status: 404 }
  _savings.splice(idx, 1)
  // Also remove all contributions for this goal.
  _contributions = _contributions.filter((c) => c.goal_id !== id)
  return {}
}

// ── Savings Contributions ─────────────────────────────────────

/**
 * GET /savings-goals/:id/contributions — history for one goal,
 * sorted newest first.
 */
export async function mockGetContributions(goalId) {
  await delay()
  return _contributions
    .filter((c) => c.goal_id === goalId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/**
 * POST /savings-goals/:id/contributions
 * payload: { amount, type ('contribution'|'withdrawal'), date, notes }
 *
 * Adjusts current_amount on the goal. Withdrawals cannot exceed
 * the current balance (enforced here; backend also validates).
 */
export async function mockAddContribution(goalId, payload) {
  await delay()
  const gIdx = _savings.findIndex((g) => g.id === goalId)
  if (gIdx === -1) throw { message: 'Savings goal not found.', status: 404 }

  const amt  = Number(payload.amount)
  const type = payload.type ?? 'contribution'

  if (!['contribution', 'withdrawal'].includes(type)) {
    throw { message: 'type must be "contribution" or "withdrawal".', status: 422 }
  }
  if (amt <= 0) {
    throw { message: 'Amount must be greater than 0.', status: 422 }
  }
  if (type === 'withdrawal' && amt > _savings[gIdx].current_amount) {
    throw { message: 'Withdrawal exceeds available balance.', status: 422 }
  }

  // Update the goal balance.
  _savings[gIdx] = {
    ..._savings[gIdx],
    current_amount:
      type === 'contribution'
        ? _savings[gIdx].current_amount + amt
        : _savings[gIdx].current_amount - amt,
  }

  const entry = {
    id:      nextId('con'),
    goal_id: goalId,
    date:    payload.date ?? new Date().toISOString().slice(0, 10),
    amount:  amt,
    type,
    notes:   payload.notes ?? '',
  }
  _contributions.push(entry)

  return { contribution: entry, goal: enrichGoal(_savings[gIdx]) }
}

// ── Private goal helper ───────────────────────────────────────

function enrichGoal(g) {
  const pct       = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0
  const remaining = Math.max(0, g.target_amount - g.current_amount)
  const reached   = g.current_amount >= g.target_amount

  // Days remaining (null if no target date)
  let days_remaining = null
  if (g.target_date) {
    const diff = new Date(g.target_date).getTime() - Date.now()
    days_remaining = Math.ceil(diff / 86_400_000)
  }

  // Monthly contribution needed to reach the goal in time (estimate only).
  let monthly_needed = null
  if (!reached && days_remaining != null && days_remaining > 0) {
    const months = days_remaining / 30.44
    monthly_needed = months > 0 ? remaining / months : null
  }

  return {
    ...g,
    progress_pct:    Math.round(pct * 10) / 10,
    remaining_amount: remaining,
    reached,
    days_remaining,
    monthly_needed: monthly_needed != null ? Math.ceil(monthly_needed * 100) / 100 : null,
  }
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
    insights.push({ id: 'i-top-cat', type: 'info', icon: 'info', title: 'Top spending category', message: `${top.name} is your largest expense at KSh ${top.amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}.` })
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

// ═══════════════════════════════════════════════════════════
//  Phase 3 — Analytics, Reports, Financial Intelligence
// ═══════════════════════════════════════════════════════════

// ── GET /analytics/monthly ──────────────────────────────────
/**
 * Returns month-by-month income, expenses, and net for the
 * requested number of months (default 12).  Accepts optional
 * category_id filter so the Analytics page can drill into one
 * category's trend.
 */
export async function mockGetMonthly({ months = 12, category_id, account_id } = {}) {
  await delay()
  const txns = category_id
    ? _transactions.filter((t) => t.category_id === category_id)
    : account_id
    ? _transactions.filter((t) => t.account_id === account_id || t.destination_account_id === account_id)
    : _transactions

  return buildMonthlySeries(txns, months)
}

// ── GET /analytics/categories ───────────────────────────────
/**
 * Returns spending totals per expense category for a date range,
 * plus a month-by-month breakdown per category (for stacked charts).
 */
export async function mockGetCategoryAnalytics({ from, to, months = 6 } = {}) {
  await delay()
  // Overall totals for the requested period
  const period = aggregate(_transactions, from, to)

  // Per-category month series (for trend lines per category)
  const now = new Date()
  const catSeries = {}

  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

    const monthExpenses = _transactions.filter(
      (t) => t.type === 'expense' && inRange(t.date, start, end)
    )
    const catMap = {}
    for (const t of monthExpenses) {
      const key = t.category_name ?? 'Uncategorized'
      catMap[key] = (catMap[key] ?? 0) + t.amount
    }
    for (const [cat, amt] of Object.entries(catMap)) {
      if (!catSeries[cat]) catSeries[cat] = []
      catSeries[cat].push({ label, amount: amt })
    }
  }

  return {
    by_category:   period.spendingByCategory,   // [{ name, category_id, amount }]
    category_trends: Object.entries(catSeries).map(([name, series]) => ({ name, series })),
  }
}

// ── GET /analytics/cash-flow ────────────────────────────────
/**
 * Returns cumulative cash-flow series (running balance approximation)
 * plus the month-by-month income/expenses/net already built by the
 * monthly helper. Used for the Cash Flow section on the Analytics page.
 */
export async function mockGetCashFlow({ months = 12, from, to } = {}) {
  await delay()
  const monthly = buildMonthlySeries(_transactions, months)

  // Cumulative net — running total from the first month
  let cumulative = 0
  const cumSeries = monthly.map((m) => {
    cumulative += m.net
    return { label: m.label, month: m.month, cumulative: Math.round(cumulative * 100) / 100 }
  })

  return { monthly, cumulative_series: cumSeries }
}

// ── GET /analytics/budget-performance ──────────────────────
/**
 * Returns per-budget planned vs actual for up to `months` months back.
 * Each entry has { category_name, period, limit, series: [{label, spent}] }.
 */
export async function mockGetBudgetPerformance({ months = 6 } = {}) {
  await delay()
  const now = new Date()

  const result = _budgets.map((b) => {
    const series = []
    for (let i = months - 1; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const spent = _transactions
        .filter((t) => t.type === 'expense' && t.category_id === b.category_id && inRange(t.date, start, end))
        .reduce((s, t) => s + t.amount, 0)
      series.push({ label, spent, limit: b.limit })
    }
    return {
      id:            b.id,
      category_name: b.category_name,
      category_id:   b.category_id,
      period:        b.period,
      limit:         b.limit,
      series,
    }
  })

  return result
}

// ── GET /analytics/savings-trends ──────────────────────────
/**
 * Returns month-by-month contribution totals per savings goal,
 * plus each goal's cumulative balance over time.
 */
export async function mockGetSavingsTrends() {
  await delay()
  const result = _savings.map((g) => {
    // Sort contributions for this goal oldest first
    const contribs = _contributions
      .filter((c) => c.goal_id === g.id)
      .sort((a, b) => (a.date > b.date ? 1 : -1))

    // Build monthly cumulative balance
    const monthly = {}
    let running = 0
    for (const c of contribs) {
      const key = c.date.slice(0, 7) // YYYY-MM
      running += c.type === 'contribution' ? c.amount : -c.amount
      monthly[key] = Math.round(running * 100) / 100
    }

    const series = Object.entries(monthly).map(([month, balance]) => ({
      label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      month,
      balance,
    }))

    return {
      goal_id:        g.id,
      goal_name:      g.name,
      target_amount:  g.target_amount,
      current_amount: g.current_amount,
      series,
    }
  })

  return result
}

// ── GET /reports/summary ────────────────────────────────────
/**
 * Comprehensive financial summary for a period. All totals match the
 * underlying transaction records — the frontend displays them verbatim.
 *
 * Returns the same totals the dashboard shows but with full category
 * breakdown, account breakdown, and period metadata.
 */
export async function mockGetReportSummary({ from, to } = {}) {
  await delay(600) // Reports are heavier — slightly longer delay

  const period   = aggregate(_transactions, from, to)
  const budgets  = computeBudgetUtilization(_transactions, to || new Date().toISOString().slice(0, 10))

  // Income by category
  const incomeFiltered = _transactions.filter(
    (t) => t.type === 'income' && inRange(t.date, from, to)
  )
  const incomeByCategory = {}
  for (const t of incomeFiltered) {
    const key = t.category_name ?? 'Other Income'
    incomeByCategory[key] = (incomeByCategory[key] ?? 0) + t.amount
  }
  const income_by_category = Object.entries(incomeByCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Expense by category (already in period)
  const expense_by_category = period.spendingByCategory

  // By account
  const accountMap = {}
  const allPeriod = _transactions.filter((t) => inRange(t.date, from, to) && t.type !== 'transfer')
  for (const t of allPeriod) {
    const key = t.account_name ?? 'Unknown'
    if (!accountMap[key]) accountMap[key] = { income: 0, expenses: 0 }
    if (t.type === 'income')  accountMap[key].income   += t.amount
    if (t.type === 'expense') accountMap[key].expenses += t.amount
  }
  const by_account = Object.entries(accountMap).map(([name, v]) => ({ name, ...v }))

  const transaction_count = allPeriod.length

  return {
    period: { from, to },
    summary: {
      total_income:    period.income,
      total_expenses:  period.expenses,
      net_cash_flow:   period.netCashFlow,
      savings_rate:    period.savingsRate,
      transaction_count,
    },
    income_by_category,
    expense_by_category,
    by_account,
    budget_performance: budgets.map((b) => ({
      category_name: b.category_name,
      limit:         b.limit,
      spent:         b.spent,
      remaining:     b.remaining,
      utilization:   b.utilization,
      status:        b.status,
    })),
  }
}

// ── POST /intelligence/insights ─────────────────────────────
/**
 * Returns the full set of rule-based insights (same engine as the
 * dashboard, but returns more detail and labels each as 'rule_based').
 * The IntelligenceView shows additional metadata not shown on dashboard.
 */
export async function mockGetInsights({ from, to } = {}) {
  await delay()
  const period  = aggregate(_transactions, from, to)
  const budgets = computeBudgetUtilization(_transactions, to || new Date().toISOString().slice(0, 10))

  // Re-run insight engine with extended detail
  const basic = buildInsights(period, budgets, null)
  return basic.map((i) => ({
    ...i,
    source:      'rule_based',
    period_from: from ?? null,
    period_to:   to   ?? null,
    is_estimate: false,
  }))
}

// ── POST /intelligence/forecast ─────────────────────────────
/**
 * Simple linear-regression-like forecast based on the last N months.
 * Clearly labeled as ESTIMATE with an uncertainty range.
 *
 * ⚠ This is a mock approximation only.  Real forecasts come from the
 * backend model.  The view must show these as estimates.
 */
export async function mockGetForecast({ horizon_months = 3 } = {}) {
  await delay(700)

  // Use 6-month history as the basis
  const history = buildMonthlySeries(_transactions, 6)
  if (history.length < 3) {
    return { insufficient_data: true, message: 'Not enough historical data to generate a forecast.' }
  }

  const incomeVals   = history.map((h) => h.income)
  const expenseVals  = history.map((h) => h.expenses)
  const avgIncome    = incomeVals.reduce((a, b) => a + b, 0) / incomeVals.length
  const avgExpenses  = expenseVals.reduce((a, b) => a + b, 0) / expenseVals.length

  // Very simple trend: last 3 months vs first 3 months
  const half = Math.floor(history.length / 2)
  const earlyIncome  = history.slice(0, half).reduce((s, h) => s + h.income,   0) / half
  const earlyExp     = history.slice(0, half).reduce((s, h) => s + h.expenses, 0) / half
  const lateIncome   = history.slice(half).reduce((s, h) => s + h.income,   0) / (history.length - half)
  const lateExp      = history.slice(half).reduce((s, h) => s + h.expenses, 0) / (history.length - half)

  const incomeTrend  = lateIncome  - earlyIncome   // monthly change
  const expenseTrend = lateExp     - earlyExp

  const now = new Date()
  const forecast = []
  for (let i = 1; i <= horizon_months; i++) {
    const d    = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const projIncome   = Math.max(0, avgIncome   + incomeTrend  * i)
    const projExpenses = Math.max(0, avgExpenses + expenseTrend * i)
    // Uncertainty grows with horizon (±8% base, +3% per additional month)
    const uncertainty  = (0.08 + (i - 1) * 0.03) * 100

    forecast.push({
      label,
      month:            d.toISOString().slice(0, 7),
      projected_income:   Math.round(projIncome   * 100) / 100,
      projected_expenses: Math.round(projExpenses * 100) / 100,
      projected_net:      Math.round((projIncome - projExpenses) * 100) / 100,
      uncertainty_pct:    Math.round(uncertainty * 10) / 10,
      is_estimate:        true,
    })
  }

  return {
    based_on_months: history.length,
    horizon_months,
    forecast,
    disclaimer: 'These projections are estimates based on recent trends and should not be used for financial planning without professional advice.',
  }
}

// ── POST /intelligence/anomalies/analyze ───────────────────
/**
 * Detects transactions that deviate significantly from a category's
 * typical spending.  Framed as "transactions for review" — not fraud.
 *
 * Returns items only when actual anomalies exist; otherwise returns
 * an empty array so the view shows a proper empty state.
 */
export async function mockGetAnomalies({ from, to } = {}) {
  await delay(500)

  // Build per-category average from the last 90 days of history
  const historyEnd   = new Date()
  const historyStart = new Date(historyEnd.getTime() - 90 * 86_400_000).toISOString().slice(0, 10)
  const histEnd      = historyEnd.toISOString().slice(0, 10)

  const catHistory = {}
  for (const t of _transactions) {
    if (t.type !== 'expense') continue
    if (!inRange(t.date, historyStart, histEnd)) continue
    const key = t.category_id ?? 'unknown'
    if (!catHistory[key]) catHistory[key] = []
    catHistory[key].push(t.amount)
  }

  const catStats = {}
  for (const [cat, amounts] of Object.entries(catHistory)) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length
    catStats[cat] = { mean, std: Math.sqrt(variance) }
  }

  // Flag transactions where amount > mean + 2*std and amount > $50
  const periodTxns = _transactions.filter(
    (t) => t.type === 'expense' && inRange(t.date, from, to)
  )

  const anomalies = []
  for (const t of periodTxns) {
    const stats = catStats[t.category_id]
    if (!stats || stats.std < 5) continue  // not enough history or variance too low
    const zScore = (t.amount - stats.mean) / stats.std
    if (zScore > 2 && t.amount > 50) {
      anomalies.push({
        id:           t.id,
        date:         t.date,
        description:  t.description,
        amount:       t.amount,
        category_name: t.category_name,
        account_name: t.account_name,
        z_score:      Math.round(zScore * 100) / 100,
        category_avg: Math.round(stats.mean * 100) / 100,
        deviation_pct: Math.round(((t.amount - stats.mean) / stats.mean) * 100),
        flag_reason:  'Amount is significantly higher than your typical ' + (t.category_name ?? '') + ' spending.',
      })
    }
  }

  return anomalies.sort((a, b) => b.z_score - a.z_score)
}

// ── POST /intelligence/categorize ──────────────────────────
/**
 * Returns basic spending-pattern analysis per category — average monthly
 * spend, trend direction, and a simple textual observation.
 * Source is labeled 'rule_based' (not a ML model prediction).
 */
export async function mockGetSpendingPatterns({ months = 6 } = {}) {
  await delay(450)

  const series = buildMonthlySeries(_transactions, months)
  const catMonths = {}

  for (let i = 0; i < series.length; i++) {
    const d     = new Date()
    const base  = new Date(d.getFullYear(), d.getMonth() - (series.length - 1 - i), 1)
    const start = new Date(base.getFullYear(), base.getMonth(), 1).toISOString().slice(0, 10)
    const end   = new Date(base.getFullYear(), base.getMonth() + 1, 0).toISOString().slice(0, 10)
    const label = series[i].label

    const monthExp = _transactions.filter(
      (t) => t.type === 'expense' && inRange(t.date, start, end)
    )
    for (const t of monthExp) {
      const key = t.category_id ?? 'unknown'
      if (!catMonths[key]) catMonths[key] = { name: t.category_name, amounts: [] }
      catMonths[key].amounts.push(t.amount)
    }
  }

  const patterns = []
  for (const [cat_id, data] of Object.entries(catMonths)) {
    const amounts = data.amounts
    if (amounts.length < 2) continue
    const avg     = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const recent  = amounts.slice(-2).reduce((a, b) => a + b, 0) / 2
    const trend   = recent > avg * 1.1 ? 'increasing' : recent < avg * 0.9 ? 'decreasing' : 'stable'
    const total   = amounts.reduce((a, b) => a + b, 0)

    let observation = ''
    if (trend === 'increasing') observation = `Your ${data.name} spending has been rising recently.`
    else if (trend === 'decreasing') observation = `Your ${data.name} spending has been declining — good work.`
    else observation = `Your ${data.name} spending is consistent month to month.`

    patterns.push({
      category_id: cat_id,
      category_name: data.name ?? 'Uncategorized',
      total_spent:   Math.round(total * 100) / 100,
      avg_monthly:   Math.round(avg   * 100) / 100,
      trend,
      observation,
      source: 'rule_based',
      is_estimate: false,
    })
  }

  return patterns.sort((a, b) => b.total_spent - a.total_spent)
}
