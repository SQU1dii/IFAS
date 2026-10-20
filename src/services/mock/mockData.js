/* =========================================================
 *  ⚠️  MOCK DATA — DEVELOPMENT ONLY
 *
 *  Shapes here mirror the exact backend contract so switching
 *  to the real API (VITE_USE_MOCK=false) requires no view changes.
 *
 *  Key rules from the backend spec implemented here:
 *  • Amounts are ALWAYS positive. Transaction type determines direction.
 *  • Transfers have destination_account_id and NO category_id.
 *  • Income/expense totals EXCLUDE transfers.
 *  • account_id is the source account on every transaction.
 *  • Dates are ISO 8601 strings (YYYY-MM-DD).
 * ========================================================= */

// ── Seeded PRNG — stable across reloads ────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand  = mulberry32(20251020)
const pick  = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (min, max) => Math.round((min + rand() * (max - min)) * 100) / 100
const isoDate = (y, m, d) => new Date(y, m, d).toISOString().slice(0, 10)

// ── Accounts ────────────────────────────────────────────────
export const MOCK_ACCOUNTS = [
  {
    id: 'acc-checking',
    name: 'Checking Account',
    type: 'checking',
    currency: 'USD',
    balance: 4821.36,
    institution: 'First National Bank',
    is_active: true,
    created_at: '2024-01-15',
  },
  {
    id: 'acc-savings',
    name: 'Savings Account',
    type: 'savings',
    currency: 'USD',
    balance: 12540.00,
    institution: 'First National Bank',
    is_active: true,
    created_at: '2024-01-15',
  },
  {
    id: 'acc-credit',
    name: 'Credit Card',
    type: 'credit',
    currency: 'USD',
    balance: -1230.50,
    institution: 'Chase',
    is_active: true,
    created_at: '2024-03-01',
  },
]

// Alias ACCOUNTS keeps backward compat with mockService calls.
export const ACCOUNTS = MOCK_ACCOUNTS

// ── Categories ──────────────────────────────────────────────
export const MOCK_CATEGORIES = [
  // income
  { id: 'cat-salary',       name: 'Salary',           type: 'income'  },
  { id: 'cat-freelance',    name: 'Freelance',         type: 'income'  },
  { id: 'cat-investment',   name: 'Investment Income', type: 'income'  },
  { id: 'cat-refund',       name: 'Refunds',           type: 'income'  },
  { id: 'cat-other-income', name: 'Other Income',      type: 'income'  },
  // expense
  { id: 'cat-groceries',    name: 'Groceries',         type: 'expense' },
  { id: 'cat-rent',         name: 'Rent & Housing',    type: 'expense' },
  { id: 'cat-utilities',    name: 'Utilities',         type: 'expense' },
  { id: 'cat-transport',    name: 'Transport',         type: 'expense' },
  { id: 'cat-dining',       name: 'Dining Out',        type: 'expense' },
  { id: 'cat-entertainment',name: 'Entertainment',     type: 'expense' },
  { id: 'cat-healthcare',   name: 'Healthcare',        type: 'expense' },
  { id: 'cat-shopping',     name: 'Shopping',          type: 'expense' },
  { id: 'cat-subscriptions',name: 'Subscriptions',     type: 'expense' },
  { id: 'cat-education',    name: 'Education',         type: 'expense' },
]

// Legacy grouped shape used by some older dashboard helpers.
export const CATEGORIES = {
  income:   MOCK_CATEGORIES.filter((c) => c.type === 'income'),
  expense:  MOCK_CATEGORIES.filter((c) => c.type === 'expense'),
  transfer: [],
}

// ── Transaction generator ────────────────────────────────────
function generateTransactions() {
  const txns = []
  let id = 1
  const now  = new Date()
  const MONTHS = 7

  const incomeTpls = [
    { description: 'Monthly Salary',         category_id: 'cat-salary',       amount: () => between(3800, 4200), day: 25,                                     account_id: 'acc-checking' },
    { description: 'Freelance Project',       category_id: 'cat-freelance',    amount: () => between(300, 1200),  day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-checking' },
    { description: 'Dividend Payout',         category_id: 'cat-investment',   amount: () => between(40, 180),    day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-savings'  },
    { description: 'Tax Refund',              category_id: 'cat-refund',       amount: () => between(50, 400),    day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-checking' },
  ]

  const expenseTpls = [
    { description: 'Rent',                    category_id: 'cat-rent',          amount: () => 1450,               day: 1,                                      account_id: 'acc-checking' },
    { description: 'Grocery Run',             category_id: 'cat-groceries',     amount: () => between(45, 180),   day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-checking' },
    { description: 'Electricity Bill',        category_id: 'cat-utilities',     amount: () => between(80, 160),   day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-checking' },
    { description: 'Internet Bill',           category_id: 'cat-utilities',     amount: () => between(45, 70),    day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-checking' },
    { description: 'Fuel',                    category_id: 'cat-transport',     amount: () => between(30, 90),    day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-credit'   },
    { description: 'Restaurant Dinner',       category_id: 'cat-dining',        amount: () => between(25, 120),   day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-credit'   },
    { description: 'Movie Night',             category_id: 'cat-entertainment', amount: () => between(15, 60),    day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-credit'   },
    { description: 'Pharmacy',               category_id: 'cat-healthcare',     amount: () => between(20, 140),   day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-checking' },
    { description: 'Online Shopping',        category_id: 'cat-shopping',       amount: () => between(35, 250),   day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-credit'   },
    { description: 'Streaming Subscription', category_id: 'cat-subscriptions',  amount: () => between(9, 25),     day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-credit'   },
    { description: 'Online Course',          category_id: 'cat-education',      amount: () => between(30, 200),   day: () => 1 + Math.floor(rand() * 27),      account_id: 'acc-checking' },
  ]

  for (let m = 0; m < MONTHS; m++) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const y = base.getFullYear()
    const mo = base.getMonth()

    // Guaranteed salary + occasional other income
    const salaryTpl = incomeTpls[0]
    txns.push({
      id: `txn-${id++}`,
      date: isoDate(y, mo, salaryTpl.day),
      description: salaryTpl.description,
      amount: salaryTpl.amount(),
      type: 'income',
      category_id: salaryTpl.category_id,
      category_name: MOCK_CATEGORIES.find((c) => c.id === salaryTpl.category_id)?.name ?? '',
      account_id: salaryTpl.account_id,
      account_name: MOCK_ACCOUNTS.find((a) => a.id === salaryTpl.account_id)?.name ?? '',
      destination_account_id: null,
      destination_account_name: null,
      notes: '',
    })

    for (let k = 1; k < incomeTpls.length; k++) {
      if (rand() > 0.4) {
        const t = incomeTpls[k]
        const day = typeof t.day === 'function' ? t.day() : t.day
        txns.push({
          id: `txn-${id++}`,
          date: isoDate(y, mo, Math.min(day, 28)),
          description: t.description,
          amount: t.amount(),
          type: 'income',
          category_id: t.category_id,
          category_name: MOCK_CATEGORIES.find((c) => c.id === t.category_id)?.name ?? '',
          account_id: t.account_id,
          account_name: MOCK_ACCOUNTS.find((a) => a.id === t.account_id)?.name ?? '',
          destination_account_id: null,
          destination_account_name: null,
          notes: '',
        })
      }
    }

    // Expenses — several per template per month
    for (const t of expenseTpls) {
      const count = t.description === 'Rent' ? 1 : 1 + Math.floor(rand() * 3)
      for (let k = 0; k < count; k++) {
        const day = typeof t.day === 'function' ? t.day() : t.day
        txns.push({
          id: `txn-${id++}`,
          date: isoDate(y, mo, Math.min(day, 28)),
          description: t.description,
          amount: t.amount(),
          type: 'expense',
          category_id: t.category_id,
          category_name: MOCK_CATEGORIES.find((c) => c.id === t.category_id)?.name ?? '',
          account_id: t.account_id,
          account_name: MOCK_ACCOUNTS.find((a) => a.id === t.account_id)?.name ?? '',
          destination_account_id: null,
          destination_account_name: null,
          notes: '',
        })
      }
    }

    // One transfer per month — no category, source → destination
    const transferAmount = between(200, 600)
    txns.push({
      id: `txn-${id++}`,
      date: isoDate(y, mo, 15),
      description: 'Transfer to Savings',
      amount: transferAmount,
      type: 'transfer',
      category_id: null,
      category_name: null,
      account_id: 'acc-checking',
      account_name: 'Checking Account',
      destination_account_id: 'acc-savings',
      destination_account_name: 'Savings Account',
      notes: '',
    })
  }

  return txns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export const MOCK_TRANSACTIONS = generateTransactions()

// ── Budgets ─────────────────────────────────────────────────
export const MOCK_BUDGETS = [
  { id: 'bud-groceries',      category_id: 'cat-groceries',     category_name: 'Groceries',     limit: 600,  period: 'monthly' },
  { id: 'bud-dining',         category_id: 'cat-dining',        category_name: 'Dining Out',    limit: 300,  period: 'monthly' },
  { id: 'bud-transport',      category_id: 'cat-transport',     category_name: 'Transport',     limit: 250,  period: 'monthly' },
  { id: 'bud-entertainment',  category_id: 'cat-entertainment', category_name: 'Entertainment', limit: 150,  period: 'monthly' },
  { id: 'bud-subscriptions',  category_id: 'cat-subscriptions', category_name: 'Subscriptions', limit: 80,   period: 'monthly' },
  { id: 'bud-shopping',       category_id: 'cat-shopping',      category_name: 'Shopping',      limit: 400,  period: 'monthly' },
]

// ── Savings goals ────────────────────────────────────────────
export const MOCK_SAVINGS_GOALS = [
  { id: 'goal-emergency', name: 'Emergency Fund',  target_amount: 10000, current_amount: 6400, target_date: '2026-06-30', notes: '' },
  { id: 'goal-vacation',  name: 'Summer Vacation', target_amount: 3500,  current_amount: 1850, target_date: '2026-07-15', notes: '' },
  { id: 'goal-laptop',    name: 'New Laptop',      target_amount: 2000,  current_amount: 1450, target_date: '2026-03-01', notes: '' },
]

// ── Notifications ────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'budget_alert',
    title: 'Budget alert — Dining Out',
    body: 'You have used 92% of your Dining Out budget for this month.',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'income',
    title: 'Salary received',
    body: 'Your monthly salary of $4,050.00 was credited to Checking Account.',
    is_read: false,
    created_at: new Date(Date.now() - 18 * 3600_000).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'insight',
    title: 'New spending insight',
    body: 'Your savings rate improved to 22.4% this month — above the 20% benchmark.',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
  {
    id: 'notif-4',
    type: 'goal_reminder',
    title: 'Savings goal reminder',
    body: 'Emergency Fund is 64% funded. You need $3,600 more to reach your target.',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  },
]

// ── User ─────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'user-001',
  name: 'Jordan Avery',
  email: 'jordan@example.com',
  currency: 'USD',
  date_format: 'MM/DD/YYYY',
  theme: 'light',
  created_at: '2024-09-01',
  notification_prefs: {
    budget_alerts: true,
    goal_reminders: true,
    insight_notifications: true,
  },
}
