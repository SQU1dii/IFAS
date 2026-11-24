# IFAS — Intelligent Financial Analytics System (Frontend)

A multi-workspace personal, business, and organisation finance platform built for the Kenyan market. Supports M-Pesa PDF statement imports, automated transaction categorisation, spending forecasts, anomaly detection, and an AI financial assistant.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build tool | Vite 5 |
| State | Pinia 2 |
| Routing | Vue Router 4 |
| Styling | Tailwind CSS 3 |
| Charts | Chart.js 4 + vue-chartjs 5 |
| HTTP | Axios 1 |
| PDF parsing | pdfjs-dist 4 (browser-side, M-Pesa PDF import) |

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Backend API running at `http://localhost:4000` (or use mock mode)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
#    Copy the variables below into a new file called .env
npm run dev
```

### Environment variables (create a `.env` file)

```env
# Backend API base URL
VITE_API_URL=http://localhost:4000/api/v1

# Set to true to run entirely in the browser without the backend.
# Set to false when your Express backend is running on port 4000.
VITE_USE_MOCK=true

# Default currency for formatting
VITE_DEFAULT_CURRENCY=KES
```

> **Note:** `.env` is intentionally excluded from this repository. Create it locally — never commit secrets or personal credentials to git.

---

## Demo Mode (no backend required)

With `VITE_USE_MOCK=true` the app runs entirely in the browser using an in-memory mock service. No backend, no database, no network calls.

**Pre-seeded demo account:**
- Email: `amara.wanjiku@example.com`
- Password: `password123`

This account has three workspaces pre-loaded with 7 months of realistic Kenyan financial data (Equity Bank, M-Pesa, KCB, salary, groceries, transport, NHIF, NSSF, Chama contributions, and more).

You can also register a new account with any email and password — it will start with an empty workspace.

---

## Connecting to the Real Backend

1. Start the Express backend (`npm run dev` in the Back End folder)
2. Change your `.env`: `VITE_USE_MOCK=false`
3. Restart the frontend dev server (`Ctrl+C` then `npm run dev`)
4. Register a new account — it will be stored in MySQL

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-module replacement |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Project Structure

```
src/
├── main.js                      # App entry — restoreSession() → restore() → mount()
├── App.vue                      # Root — single RouterView + page transitions
│
├── router/
│   └── index.js                 # All routes + 4-step guard (auth/workspace/type/permission)
│
├── stores/
│   ├── auth.js                  # Authenticated session (in-memory token, HttpOnly cookie)
│   ├── workspace.js             # Active workspace, role, permissions, can()
│   ├── ui.js                    # Sidebar state, date range preset, notifications
│   └── assistant.js             # AI chat session per workspace
│
├── views/
│   ├── LoginView.vue            # Email + password login
│   ├── RegisterView.vue         # 2-step: personal details → workspace type + name
│   ├── ForgotPasswordView.vue   # Request password reset link
│   ├── ResetPasswordView.vue    # Set new password from token
│   ├── WorkspaceSelectionView.vue # Pick or create a workspace
│   ├── DashboardView.vue        # Dispatcher → Personal / Business / Org dashboard
│   ├── PersonalDashboardView.vue  # F3: summary cards, charts, budgets, savings, insights
│   ├── BusinessDashboardView.vue  # F4: revenue, P&L, team alerts
│   ├── OrgDashboardView.vue       # F5: department budgets, members panel
│   ├── TransactionsView.vue     # Full CRUD + void + CSV import + M-Pesa PDF import
│   ├── IncomeView.vue           # Transactions locked to type=income
│   ├── ExpensesView.vue         # Transactions locked to type=expense
│   ├── AccountsView.vue         # BANK / MOBILE_MONEY / CASH accounts
│   ├── CategoriesView.vue       # INCOME and EXPENSE categories
│   ├── BudgetsView.vue          # Monthly/yearly budgets with utilization
│   ├── SavingsView.vue          # Savings goals + contributions (Personal only)
│   ├── AnalyticsView.vue        # 5 chart sections: income/expense, cash flow,
│   │                            # categories, budget performance, savings trends
│   ├── ReportsView.vue          # Period summary + full transaction list + export
│   ├── IntelligenceView.vue     # Spending patterns, anomalies, forecast, recommendations
│   ├── AssistantView.vue        # AI financial assistant chat
│   ├── MembersView.vue          # Member management (Business + Org)
│   ├── DepartmentsView.vue      # Department management (Org only)
│   ├── ProfileView.vue          # Edit name/email/phone + change password
│   ├── SettingsView.vue         # Display + notification preferences
│   └── NotPermittedView.vue     # Shown when RBAC blocks a route
│
├── components/
│   ├── common/
│   │   ├── BaseButton.vue       # primary/secondary/danger/ghost variants, loading state
│   │   ├── BaseInput.vue        # Labelled input with error + hint
│   │   ├── BaseSelect.vue       # Labelled select with error + hint
│   │   ├── BaseCard.vue         # White rounded card
│   │   ├── BaseAlert.vue        # success/error/warning/info, dismissible
│   │   ├── BaseBadge.vue        # Colour pill: green/red/blue/amber/purple/neutral
│   │   ├── BaseProgress.vue     # Horizontal progress bar with colour thresholds
│   │   ├── BaseSpinner.vue      # Loading animation
│   │   ├── EmptyState.vue       # Icon + title + message for empty lists
│   │   ├── PageHeader.vue       # Page title + subtitle + actions slot
│   │   └── MockDataBanner.vue   # Amber banner in demo mode (dismissible)
│   │
│   ├── layout/
│   │   ├── AppLayout.vue        # Authenticated shell: sidebar + topbar + RouterView
│   │   ├── TheSidebar.vue       # Collapsible sidebar with mobile overlay
│   │   ├── SidebarInner.vue     # Nav items filtered by workspace type + permissions
│   │   └── TheTopbar.vue        # Date picker, notification bell, profile dropdown
│   │
│   ├── dashboard/
│   │   ├── SummaryCard.vue      # KPI card with trend indicator
│   │   ├── BudgetUtilization.vue # Progress bars + status badges
│   │   ├── SavingsOverview.vue  # Compact goal cards with circular progress
│   │   ├── RecentTransactions.vue # Last 6 transactions
│   │   └── InsightsPanel.vue    # AI-generated insight cards
│   │
│   ├── transactions/
│   │   ├── TransactionModal.vue      # Add/edit with full field validation
│   │   ├── TransactionTable.vue      # Paginated table with action menu
│   │   ├── TransactionFilterBar.vue  # Search, type, category, account, date, needs-review
│   │   ├── DeleteConfirmModal.vue    # Reusable danger confirm dialog
│   │   ├── CsvImportWizard.vue       # 3-step CSV import with proper quoted-field parser
│   │   ├── CsvColumnMappingWizard.vue # Map arbitrary bank CSV headers to IFAS fields
│   │   └── MpesaImportWizard.vue     # 4-step M-Pesa PDF import (browser-side decryption)
│   │
│   └── charts/
│       ├── IncomeExpenseChart.vue       # Grouped bar
│       ├── SpendingByCategoryChart.vue  # Doughnut
│       ├── NetCashFlowChart.vue         # Line
│       └── TrendLineChart.vue           # Line with area fill + forecast dashes
│
├── composables/
│   └── useTransactionPage.js    # Shared filter/pagination/CRUD logic for transaction views
│
├── services/
│   ├── api.js                   # Axios instance, tokenStore, 401 refresh interceptor
│   ├── authService.js           # /auth/* endpoints
│   ├── workspaceService.js      # /workspaces, members, departments, assistant
│   ├── transactionService.js    # /transactions, /imports
│   ├── accountService.js        # /accounts
│   ├── categoryService.js       # /categories
│   ├── budgetService.js         # /budgets
│   ├── savingsService.js        # /savings-goals + contributions
│   ├── analyticsService.js      # /analytics/*
│   ├── reportsService.js        # /reports
│   ├── intelligenceService.js   # /insights, /forecast, /anomalies, /patterns, /alerts
│   ├── dashboardService.js      # /dashboard, /notifications
│   └── mock/
│       ├── mockData.js          # Seeded demo data (7 months, Kenyan context)
│       └── mockService.js       # Full in-memory API simulation (~1,500 lines)
│
└── utils/
    ├── format.js                # formatCurrency (KES/en-KE), formatDate, formatPercent
    ├── date.js                  # Range presets, resolvePreset, rangeToIso
    ├── validation.js            # runRules, required, isEmail, minLength, etc.
    └── mpesaParser.js           # M-Pesa PDF text extraction + 3-strategy row parser
```

---

## Workspace System

A user can belong to multiple workspaces simultaneously. Three types:

| Type | Purpose | Unique features |
|---|---|---|
| **PERSONAL** | Individual finances | Savings goals, personal categories |
| **BUSINESS** | Company finances | P&L, team members with roles |
| **ORGANIZATION** | NGO / institution | Departments, department-level budgets |

The active workspace controls which dashboard renders, which sidebar items appear, and which actions are permitted.

---

## Permission System

The backend returns a list of permission codes when a workspace is loaded. The frontend uses these to gate routes, sidebar items, and UI buttons.

```
dashboard.view     transactions.view  transactions.create  transactions.edit
transactions.import  accounts.manage  budgets.manage  goals.manage
analytics.view  reports.generate  members.manage  departments.manage
assistant.use  workspace.manage
```

Owners and admins always have full access as a safety net. The backend enforces the same permissions independently — hiding buttons in Vue is UI polish, not the security boundary.

---

## M-Pesa PDF Import

Safaricom M-Pesa statements are password-protected PDFs. IFAS imports them in 4 steps:

1. **Upload** — select the PDF, enter your ID/Passport number as the password
2. **Parsing** — `pdfjs-dist` decrypts the PDF *in the browser* (password never sent to server), groups text items by Y position to reconstruct the visual table, then parses transactions using three fallback strategies
3. **Preview** — review every transaction, change type/category, assign to an account
4. **Import** — confirmed transactions are inserted into the active workspace

Auto-categorisation uses 15 keyword rules (airtime, groceries, KPLC, Naivas, Uber, NHIF, school fees, subscriptions, etc.). Unknown transactions are flagged `Needs Review` and can be filtered and classified later.

---

## Authentication Flow

```
Register / Login
      ↓
Backend returns accessToken (body) + sets HttpOnly refresh cookie
      ↓
Frontend stores accessToken in memory (tokenStore — never localStorage)
      ↓
Every request: Authorization: Bearer <accessToken>
      ↓
Token expires (15 min) → 401
      ↓
Interceptor calls POST /auth/refresh (sends HttpOnly cookie)
      ↓
New accessToken returned → original request retried
      ↓
If refresh also fails → session-expired event → logout
```

---

## Security Notes

- Access token stored in memory only — never in localStorage or a cookie
- Refresh token is HttpOnly — JavaScript cannot read it
- M-Pesa PDF password never sent to any server — decrypted client-side
- All API calls are workspace-scoped — `/workspaces/:id/...`
- Passwords are never returned in API responses (stripped before sending)
- The backend enforces all permission checks independently of the frontend
