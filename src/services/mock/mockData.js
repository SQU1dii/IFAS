/* =========================================================
 *  ⚠️  MOCK DATA — DEVELOPMENT ONLY
 *
 *  This file contains sample financial data used while the
 *  backend API is not yet ready. None of this data is real and
 *  none of it is imported by production components directly —
 *  it is only read through mockService.js, which the feature
 *  services (authService, dashboardService, …) call when
 *  VITE_USE_MOCK === 'true'.
 *
 *  To switch to the real API: set VITE_USE_MOCK=false in .env
 *  and implement the real calls in the service files. The mock
 *  layer can then be deleted.
 * ========================================================= */

// ---- Reference data -----------------------------------------------------------

export const CATEGORIES = {
  income: [
    { id: 'cat-salary', name: 'Salary', type: 'income' },
    { id: 'cat-freelance', name: 'Freelance', type: 'income' },
    { id: 'cat-investment', name: 'Investment Income', type: 'income' },
    { id: 'cat-refund', name: 'Refunds', type: 'income' },
    { id: 'cat-other-income', name: 'Other Income', type: 'income' },
  ],
  expense: [
    { id: 'cat-groceries', name: 'Groceries', type: 'expense' },
    { id: 'cat-rent', name: 'Rent & Housing', type: 'expense' },
    { id: 'cat-utilities', name: 'Utilities', type: 'expense' },
    { id: 'cat-transport', name: 'Transport', type: 'expense' },
    { id: 'cat-dining', name: 'Dining Out', type: 'expense' },
    { id: 'cat-entertainment', name: 'Entertainment', type: 'expense' },
    { id: 'cat-healthcare', name: 'Healthcare', type: 'expense' },
    { id: 'cat-shopping', name: 'Shopping', type: 'expense' },
    { id: 'cat-subscriptions', name: 'Subscriptions', type: 'expense' },
    { id: 'cat-education', name: 'Education', type: 'expense' },
  ],
  transfer: [
    { id: 'cat-transfer', name: 'Transfer', type: 'transfer' },
  ],
}

export const ACCOUNTS = [
  { id: 'acc-checking', name: 'Checking Account', type: 'checking' },
  { id: 'acc-savings', name: 'Savings Account', type: 'savings' },
  { id: 'acc-credit', name: 'Credit Card', type: 'credit' },
]

// ---- Deterministic generator --------------------------------------------------
// A seeded PRNG keeps the generated data stable across reloads so charts and
// totals don't jump around between page navigation.

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20251020)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (min, max) => Math.round((min + rand() * (max - min)) * 100) / 100

function isoDate(year, month, day) {
  return new Date(year, month, day).toISOString().slice(0, 10)
}

function generateTransactions() {
  const txns = []
  let idCounter = 1
  const now = new Date()
  const monthsBack = 7 // cover ~7 months so trend charts are meaningful

  const incomeTemplates = [
    { desc: 'Monthly Salary', catId: 'cat-salary', amount: () => between(3800, 4200), day: 25 },
    { desc: 'Freelance Project Payment', catId: 'cat-freelance', amount: () => between(300, 1200), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Dividend Payout', catId: 'cat-investment', amount: () => between(40, 180), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Tax Refund', catId: 'cat-refund', amount: () => between(50, 400), day: () => Math.floor(rand() * 28) + 1 },
  ]

  const expenseTemplates = [
    { desc: 'Rent', catId: 'cat-rent', amount: () => 1450, day: 1 },
    { desc: 'Grocery Run', catId: 'cat-groceries', amount: () => between(45, 180), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Electricity Bill', catId: 'cat-utilities', amount: () => between(80, 160), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Internet Bill', catId: 'cat-utilities', amount: () => between(45, 70), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Fuel', catId: 'cat-transport', amount: () => between(30, 90), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Restaurant Dinner', catId: 'cat-dining', amount: () => between(25, 120), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Movie Night', catId: 'cat-entertainment', amount: () => between(15, 60), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Pharmacy', catId: 'cat-healthcare', amount: () => between(20, 140), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Online Shopping', catId: 'cat-shopping', amount: () => between(35, 250), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Streaming Subscription', catId: 'cat-subscriptions', amount: () => between(9, 25), day: () => Math.floor(rand() * 28) + 1 },
    { desc: 'Online Course', catId: 'cat-education', amount: () => between(30, 200), day: () => Math.floor(rand() * 28) + 1 },
  ]

  for (let m = 0; m < monthsBack; m++) {
    const year = now.getFullYear()
    const month = now.getMonth() - m
    // Normalize into a valid (possibly previous-year) month.
    const d = new Date(year, month, 1)
    const y = d.getFullYear()
    const mo = d.getMonth()

    // 1 guaranteed salary entry + occasional other income.
    const salaryTpl = incomeTemplates[0]
    txns.push({
      id: `txn-${idCounter++}`,
      date: isoDate(y, mo, salaryTpl.day),
      description: salaryTpl.desc,
      amount: salaryTpl.amount(),
      type: 'income',
      category: CATEGORIES.income.find((c) => c.id === salaryTpl.catId).name,
      categoryId: salaryTpl.catId,
      account: 'Checking Account',
      accountId: 'acc-checking',
    })

    // Other income (roughly salary + 1-2 extras).
    for (let k = 1; k < incomeTemplates.length; k++) {
      if (rand() > 0.4) {
        const t = incomeTemplates[k]
        const day = typeof t.day === 'function' ? t.day() : t.day
        txns.push({
          id: `txn-${idCounter++}`,
          date: isoDate(y, mo, day),
          description: t.desc,
          amount: t.amount(),
          type: 'income',
          category: CATEGORIES.income.find((c) => c.id === t.catId).name,
          categoryId: t.catId,
          account: 'Checking Account',
          accountId: 'acc-checking',
        })
      }
    }

    // Expenses: several per month per template.
    for (const t of expenseTemplates) {
      const count = t.desc === 'Rent' ? 1 : 1 + Math.floor(rand() * 3)
      for (let k = 0; k < count; k++) {
        const day = typeof t.day === 'function' ? t.day() : t.day
        const acc = pick(ACCOUNTS)
        txns.push({
          id: `txn-${idCounter++}`,
          date: isoDate(y, mo, Math.min(day, 28)),
          description: t.desc,
          amount: t.amount(),
          type: 'expense',
          category: CATEGORIES.expense.find((c) => c.id === t.catId).name,
          categoryId: t.catId,
          account: acc.name,
          accountId: acc.id,
        })
      }
    }

    // A transfer between accounts (excluded from income/expense totals).
    txns.push({
      id: `txn-${idCounter++}`,
      date: isoDate(y, mo, 15),
      description: 'Transfer to Savings',
      amount: between(200, 600),
      type: 'transfer',
      category: 'Transfer',
      categoryId: 'cat-transfer',
      account: 'Checking Account',
      accountId: 'acc-checking',
    })
  }

  // Most recent first.
  return txns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export const MOCK_TRANSACTIONS = generateTransactions()

// ---- Budgets ------------------------------------------------------------------

export const MOCK_BUDGETS = [
  { id: 'bud-groceries', categoryId: 'cat-groceries', category: 'Groceries', limit: 600, period: 'monthly' },
  { id: 'bud-dining', categoryId: 'cat-dining', category: 'Dining Out', limit: 300, period: 'monthly' },
  { id: 'bud-transport', categoryId: 'cat-transport', category: 'Transport', limit: 250, period: 'monthly' },
  { id: 'bud-entertainment', categoryId: 'cat-entertainment', category: 'Entertainment', limit: 150, period: 'monthly' },
  { id: 'cat-subscriptions', categoryId: 'cat-subscriptions', category: 'Subscriptions', limit: 80, period: 'monthly' },
  { id: 'bud-shopping', categoryId: 'cat-shopping', category: 'Shopping', limit: 400, period: 'monthly' },
]

// ---- Savings goals -------------------------------------------------------------

export const MOCK_SAVINGS_GOALS = [
  {
    id: 'goal-emergency',
    name: 'Emergency Fund',
    target: 10000,
    saved: 6400,
    targetDate: '2026-06-30',
  },
  {
    id: 'goal-vacation',
    name: 'Summer Vacation',
    target: 3500,
    saved: 1850,
    targetDate: '2026-07-15',
  },
  {
    id: 'goal-laptop',
    name: 'New Laptop',
    target: 2000,
    saved: 1450,
    targetDate: '2026-03-01',
  },
]

// ---- Mock user ----------------------------------------------------------------

export const MOCK_USER = {
  id: 'user-001',
  name: 'Jordan Avery',
  email: 'jordan@example.com',
  currency: 'USD',
  createdAt: '2024-09-01',
}
