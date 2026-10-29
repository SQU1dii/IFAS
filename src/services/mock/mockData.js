/* =========================================================
 *  ⚠️  MOCK DATA — DEVELOPMENT ONLY  (Kenya locale)
 *
 *  All amounts are in KES (Kenyan Shillings).
 *  Shapes mirror the exact backend contract so switching to the
 *  real API (VITE_USE_MOCK=false) requires no view changes.
 *
 *  Key rules:
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
const rand    = mulberry32(20251020)
const pick    = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (min, max) => Math.round((min + rand() * (max - min)) * 100) / 100
// isoDate is module-level so MOCK_CONTRIBUTIONS can reference it.
export const isoDate = (y, m, d) => new Date(y, m, d).toISOString().slice(0, 10)

// ── Accounts ─────────────────────────────────────────────────
// Kenyan banks and M-Pesa as the primary mobile money account.
export const MOCK_ACCOUNTS = [
  {
    id: 'acc-equity',
    name: 'Equity Bank — Salary Account',
    type: 'checking',
    currency: 'KES',
    balance: 145820.50,
    institution: 'Equity Bank Kenya',
    is_active: true,
    created_at: '2024-01-10',
  },
  {
    id: 'acc-mpesa',
    name: 'M-Pesa',
    type: 'mobile_money',
    currency: 'KES',
    balance: 12350.00,
    institution: 'Safaricom M-Pesa',
    is_active: true,
    created_at: '2024-01-10',
  },
  {
    id: 'acc-kcb-savings',
    name: 'KCB Savings Account',
    type: 'savings',
    currency: 'KES',
    balance: 380000.00,
    institution: 'KCB Bank Kenya',
    is_active: true,
    created_at: '2024-02-01',
  },
  {
    id: 'acc-coop-credit',
    name: 'Co-op Bank Credit Card',
    type: 'credit',
    currency: 'KES',
    balance: -28500.00,
    institution: 'Co-operative Bank of Kenya',
    is_active: true,
    created_at: '2024-04-15',
  },
]

// Alias keeps backward compat with mockService calls.
export const ACCOUNTS = MOCK_ACCOUNTS

// ── Categories ────────────────────────────────────────────────
// Includes Kenya-specific categories: M-Pesa, NHIF, NSSF, Chama, etc.
export const MOCK_CATEGORIES = [
  // Income
  { id: 'cat-salary',       name: 'Salary',            type: 'income'  },
  { id: 'cat-freelance',    name: 'Freelance / Gigs',  type: 'income'  },
  { id: 'cat-investment',   name: 'Investment Income', type: 'income'  },
  { id: 'cat-chama-return', name: 'Chama Returns',     type: 'income'  },
  { id: 'cat-other-income', name: 'Other Income',      type: 'income'  },
  // Expense
  { id: 'cat-rent',         name: 'Rent & Housing',    type: 'expense' },
  { id: 'cat-groceries',    name: 'Groceries & Food',  type: 'expense' },
  { id: 'cat-transport',    name: 'Transport / Matatu',type: 'expense' },
  { id: 'cat-utilities',    name: 'Utilities (KPLC / Water)', type: 'expense' },
  { id: 'cat-airtime',      name: 'Airtime & Data',    type: 'expense' },
  { id: 'cat-mpesa-send',   name: 'M-Pesa Send Money', type: 'expense' },
  { id: 'cat-dining',       name: 'Dining & Eating Out', type: 'expense' },
  { id: 'cat-healthcare',   name: 'Healthcare / NHIF', type: 'expense' },
  { id: 'cat-nssf',         name: 'NSSF Contributions',type: 'expense' },
  { id: 'cat-chama',        name: 'Chama Contributions',type: 'expense' },
  { id: 'cat-school',       name: 'School Fees',        type: 'expense' },
  { id: 'cat-shopping',     name: 'Shopping & Clothing',type: 'expense' },
  { id: 'cat-entertainment',name: 'Entertainment',      type: 'expense' },
  { id: 'cat-subscriptions',name: 'Subscriptions',      type: 'expense' },
]

// Legacy grouped shape used by some dashboard helpers.
export const CATEGORIES = {
  income:   MOCK_CATEGORIES.filter((c) => c.type === 'income'),
  expense:  MOCK_CATEGORIES.filter((c) => c.type === 'expense'),
  transfer: [],
}

// ── Transaction generator ─────────────────────────────────────
// All amounts in KES. Salary ~KES 120,000/month (mid-level Nairobi professional).
function generateTransactions() {
  const txns = []
  let id = 1
  const now   = new Date()
  const MONTHS = 7

  const incomeTpls = [
    {
      description: 'Monthly Salary — Equity Bank',
      category_id: 'cat-salary',
      amount: () => between(118000, 125000),
      day: 28,
      account_id: 'acc-equity',
    },
    {
      description: 'Freelance Project Payment',
      category_id: 'cat-freelance',
      amount: () => between(15000, 55000),
      day: () => 1 + Math.floor(rand() * 27),
      account_id: 'acc-mpesa',
    },
    {
      description: 'Dividend — CIC Money Market',
      category_id: 'cat-investment',
      amount: () => between(1200, 4500),
      day: () => 1 + Math.floor(rand() * 27),
      account_id: 'acc-kcb-savings',
    },
    {
      description: 'Chama Dividend Payout',
      category_id: 'cat-chama-return',
      amount: () => between(5000, 18000),
      day: () => 1 + Math.floor(rand() * 27),
      account_id: 'acc-mpesa',
    },
  ]

  const expenseTpls = [
    // Fixed / regular
    { description: 'Rent — Kilimani Apartment',   category_id: 'cat-rent',          amount: () => 42000,                      day: 1,   account_id: 'acc-equity' },
    { description: 'NHIF Monthly Contribution',    category_id: 'cat-healthcare',    amount: () => 1700,                       day: 2,   account_id: 'acc-equity' },
    { description: 'NSSF Contribution',            category_id: 'cat-nssf',          amount: () => 2160,                       day: 2,   account_id: 'acc-equity' },
    { description: 'Chama Monthly Contribution',   category_id: 'cat-chama',         amount: () => between(5000, 10000),       day: 5,   account_id: 'acc-mpesa'  },
    // Groceries — Nairobi supermarkets
    { description: 'Naivas Supermarket',           category_id: 'cat-groceries',     amount: () => between(2500, 6000),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-equity'   },
    { description: 'Carrefour Westgate',           category_id: 'cat-groceries',     amount: () => between(3000, 8500),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-coop-credit' },
    { description: 'Chandarana Foodplus',          category_id: 'cat-groceries',     amount: () => between(1500, 4000),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-equity'   },
    // Transport
    { description: 'Matatu Fare',                  category_id: 'cat-transport',     amount: () => between(50, 200),           day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    { description: 'Uber / Bolt',                  category_id: 'cat-transport',     amount: () => between(350, 1200),         day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    { description: 'Fuel — Total Energies',        category_id: 'cat-transport',     amount: () => between(4000, 7000),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-equity'   },
    // Utilities
    { description: 'KPLC Electricity Token',       category_id: 'cat-utilities',     amount: () => between(1500, 3500),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    { description: 'Nairobi Water & Sewerage',     category_id: 'cat-utilities',     amount: () => between(800, 1800),         day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    // Airtime & Data
    { description: 'Safaricom Airtime',            category_id: 'cat-airtime',       amount: () => between(200, 500),          day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    { description: 'Safaricom Home Fibre',         category_id: 'cat-airtime',       amount: () => between(2500, 4999),        day: 10,  account_id: 'acc-equity'   },
    // M-Pesa send
    { description: 'M-Pesa — Send to Family',      category_id: 'cat-mpesa-send',    amount: () => between(2000, 8000),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    // Dining
    { description: 'Java House',                   category_id: 'cat-dining',        amount: () => between(500, 1800),         day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-coop-credit' },
    { description: 'Artcaffe Coffee & Bakery',     category_id: 'cat-dining',        amount: () => between(400, 1200),         day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-coop-credit' },
    { description: 'Kenchic / Chicken Inn',        category_id: 'cat-dining',        amount: () => between(300, 700),          day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    // Healthcare
    { description: 'Goodlife Pharmacy',            category_id: 'cat-healthcare',    amount: () => between(500, 3500),         day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-mpesa'    },
    // Shopping
    { description: 'Jumia Kenya',                  category_id: 'cat-shopping',      amount: () => between(1500, 9000),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-coop-credit' },
    { description: 'Mr Price / Woolworths',        category_id: 'cat-shopping',      amount: () => between(2000, 8000),        day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-coop-credit' },
    // Entertainment
    { description: 'DStv / Showmax Subscription',  category_id: 'cat-subscriptions', amount: () => between(850, 2500),         day: 15,  account_id: 'acc-mpesa'    },
    { description: 'Netflix',                      category_id: 'cat-subscriptions', amount: () => 1100,                       day: 15,  account_id: 'acc-coop-credit' },
    { description: 'Cinema — Prestige / IMAX',     category_id: 'cat-entertainment', amount: () => between(700, 2000),         day: () => 1 + Math.floor(rand() * 27), account_id: 'acc-coop-credit' },
  ]

  for (let m = 0; m < MONTHS; m++) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const y    = base.getFullYear()
    const mo   = base.getMonth()

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
        const t   = incomeTpls[k]
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
      const fixed = ['Rent — Kilimani Apartment', 'NHIF Monthly Contribution', 'NSSF Contribution', 'Chama Monthly Contribution', 'Safaricom Home Fibre', 'DStv / Showmax Subscription', 'Netflix']
      const count = fixed.includes(t.description) ? 1 : 1 + Math.floor(rand() * 2)
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

    // Monthly transfer: Equity → KCB savings
    txns.push({
      id: `txn-${id++}`,
      date: isoDate(y, mo, 29),
      description: 'Transfer to KCB Savings',
      amount: between(10000, 25000),
      type: 'transfer',
      category_id: null,
      category_name: null,
      account_id: 'acc-equity',
      account_name: 'Equity Bank — Salary Account',
      destination_account_id: 'acc-kcb-savings',
      destination_account_name: 'KCB Savings Account',
      notes: '',
    })
  }

  return txns.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export const MOCK_TRANSACTIONS = generateTransactions()

// ── Budgets ───────────────────────────────────────────────────
// Monthly limits in KES. period: 'monthly' | 'yearly' only.
export const MOCK_BUDGETS = [
  { id: 'bud-rent',          category_id: 'cat-rent',          category_name: 'Rent & Housing',         limit: 45000,  period: 'monthly', notes: 'Kilimani apartment' },
  { id: 'bud-groceries',     category_id: 'cat-groceries',     category_name: 'Groceries & Food',        limit: 18000,  period: 'monthly', notes: '' },
  { id: 'bud-transport',     category_id: 'cat-transport',     category_name: 'Transport / Matatu',       limit: 12000,  period: 'monthly', notes: '' },
  { id: 'bud-mpesa-send',    category_id: 'cat-mpesa-send',    category_name: 'M-Pesa Send Money',        limit: 10000,  period: 'monthly', notes: 'Family remittances' },
  { id: 'bud-dining',        category_id: 'cat-dining',        category_name: 'Dining & Eating Out',      limit: 8000,   period: 'monthly', notes: '' },
  { id: 'bud-airtime',       category_id: 'cat-airtime',       category_name: 'Airtime & Data',           limit: 6000,   period: 'monthly', notes: '' },
  { id: 'bud-shopping',      category_id: 'cat-shopping',      category_name: 'Shopping & Clothing',      limit: 10000,  period: 'monthly', notes: '' },
  { id: 'bud-entertainment', category_id: 'cat-entertainment', category_name: 'Entertainment',            limit: 5000,   period: 'monthly', notes: '' },
  { id: 'bud-chama',         category_id: 'cat-chama',         category_name: 'Chama Contributions',      limit: 150000, period: 'yearly',  notes: 'Annual chama total' },
]

// ── Savings goals ─────────────────────────────────────────────
// Amounts in KES. Realistic Kenyan savings targets.
export const MOCK_SAVINGS_GOALS = [
  {
    id: 'goal-emergency',
    name: 'Emergency Fund',
    target_amount: 300000,
    current_amount: 192000,
    target_date: '2026-06-30',
    notes: '3 months living expenses',
  },
  {
    id: 'goal-land',
    name: 'Land Purchase — Kitengela',
    target_amount: 1500000,
    current_amount: 420000,
    target_date: '2027-12-31',
    notes: 'Quarter-acre plot in Kitengela',
  },
  {
    id: 'goal-laptop',
    name: 'Laptop Upgrade',
    target_amount: 95000,
    current_amount: 61000,
    target_date: '2026-03-01',
    notes: 'MacBook Air M3',
  },
  {
    id: 'goal-holiday',
    name: 'Diani Beach Holiday',
    target_amount: 80000,
    current_amount: 32000,
    target_date: '2025-12-20',
    notes: 'Christmas getaway',
  },
]

// ── Savings contributions ─────────────────────────────────────
const _now = new Date()
const _y   = _now.getFullYear()
const _m   = _now.getMonth()
export const MOCK_CONTRIBUTIONS = [
  { id: 'con-1',  goal_id: 'goal-emergency', date: isoDate(_y, _m,     5),  amount: 12000, type: 'contribution', notes: 'Monthly savings transfer' },
  { id: 'con-2',  goal_id: 'goal-emergency', date: isoDate(_y, _m - 1, 5),  amount: 12000, type: 'contribution', notes: 'Monthly savings transfer' },
  { id: 'con-3',  goal_id: 'goal-emergency', date: isoDate(_y, _m - 2, 5),  amount: 15000, type: 'contribution', notes: 'Year-end bonus added'       },
  { id: 'con-4',  goal_id: 'goal-emergency', date: isoDate(_y, _m - 3, 5),  amount: 12000, type: 'contribution', notes: 'Monthly savings transfer' },
  { id: 'con-5',  goal_id: 'goal-emergency', date: isoDate(_y, _m - 4, 10), amount: 8000,  type: 'withdrawal',   notes: 'Medical emergency'         },
  { id: 'con-6',  goal_id: 'goal-land',      date: isoDate(_y, _m,     5),  amount: 30000, type: 'contribution', notes: '' },
  { id: 'con-7',  goal_id: 'goal-land',      date: isoDate(_y, _m - 1, 5),  amount: 30000, type: 'contribution', notes: '' },
  { id: 'con-8',  goal_id: 'goal-land',      date: isoDate(_y, _m - 2, 5),  amount: 30000, type: 'contribution', notes: '' },
  { id: 'con-9',  goal_id: 'goal-laptop',    date: isoDate(_y, _m,     20), amount: 8000,  type: 'contribution', notes: 'Freelance payment' },
  { id: 'con-10', goal_id: 'goal-laptop',    date: isoDate(_y, _m - 1, 20), amount: 10000, type: 'contribution', notes: '' },
  { id: 'con-11', goal_id: 'goal-holiday',   date: isoDate(_y, _m,     5),  amount: 8000,  type: 'contribution', notes: '' },
  { id: 'con-12', goal_id: 'goal-holiday',   date: isoDate(_y, _m - 1, 5),  amount: 8000,  type: 'contribution', notes: '' },
]

// ── Notifications ─────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'budget_alert',
    title: 'Budget alert — M-Pesa Send Money',
    body: 'You have used 89% of your M-Pesa Send Money budget this month.',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'income',
    title: 'Salary received',
    body: 'Your monthly salary of KSh 121,500 was credited to your Equity Bank account.',
    is_read: false,
    created_at: new Date(Date.now() - 18 * 3600_000).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'insight',
    title: 'Savings rate looking healthy',
    body: 'Your savings rate improved to 21.3% this month — above the recommended 20% benchmark.',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
  {
    id: 'notif-4',
    type: 'goal_reminder',
    title: 'Land purchase goal reminder',
    body: 'You are 28% of the way to your Kitengela land goal. KSh 1,080,000 remaining.',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  },
]

// ── User ──────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'user-001',
  name: 'Amara Wanjiku',
  email: 'amara.wanjiku@example.com',
  currency: 'KES',
  date_format: 'DD/MM/YYYY',
  theme: 'light',
  created_at: '2024-09-01',
  notification_prefs: {
    budget_alerts: true,
    goal_reminders: true,
    insight_notifications: true,
  },
}
