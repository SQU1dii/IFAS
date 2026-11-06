# IFAS — Intelligent Financial Analytics System (Frontend)

A multi-workspace personal, business, and organization finance platform built with Vue 3, Vite, Pinia, Vue Router, Tailwind CSS, Chart.js, and Axios.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template
cp .env.example .env

# 3. Run the dev server (mock data, no backend needed)
npm run dev

# 4. Build for production
npm run build

# 5. Preview the production build
npm run preview
```

The app runs at `http://localhost:5173`. In mock mode (`VITE_USE_MOCK=true`), all data comes from the in-memory mock layer — no backend required.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api/v1` | Backend REST API base URL |
| `VITE_USE_MOCK` | `true` | Set to `false` to use the real backend |
| `VITE_DEFAULT_CURRENCY` | `KES` | Default currency for formatting |

## Connecting to the backend

1. Ensure your Express backend is running at the URL specified in `VITE_API_URL`.
2. Set `VITE_USE_MOCK=false` in `.env`.
3. All API calls automatically switch from the mock service layer to the real Axios client.
4. The Axios instance sends the Bearer access token (in-memory) and the active workspace ID in the path (`/workspaces/:id/...`).

### Auth flow

- Access token is kept in memory (never localStorage).
- A short-lived access token is returned in the login response body.
- A long-lived refresh token is set as an HttpOnly cookie by the backend.
- On app load, `POST /auth/refresh` is called to restore the session.
- On 401, the interceptor calls `/auth/refresh` once, retries the original request, and logs out if refresh fails.

### Response format

The backend returns:
```json
{ "success": true, "message": "...", "data": {...}, "meta": {...} }
```
The Axios interceptor unwraps this so service callers receive `res.data` directly.

Errors return:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "email": "Already taken" } } }
```
The error normalizer maps `fields` onto `err.fieldErrors` so forms can display them inline.

## Folder structure

```
src/
├── assets/
│   └── main.css                 # Tailwind base + design system component classes
├── components/
│   ├── common/                  # BaseButton, BaseInput, BaseSelect, BaseCard, BaseAlert,
│   │                            # BaseBadge, BaseProgress, BaseSpinner, EmptyState,
│   │                            # LoadingOverlay, PageHeader, MockDataBanner
│   ├── layout/                   # AppLayout, TheSidebar, TheTopbar, SidebarInner, ComingSoonView
│   ├── dashboard/               # SummaryCard, RecentTransactions, BudgetUtilization,
│   │                            # SavingsOverview, InsightsPanel
│   ├── transactions/            # TransactionFilterBar, TransactionTable, TransactionModal,
│   │                            # DeleteConfirmModal, CsvImportWizard
│   └── charts/                   # IncomeExpenseChart, SpendingByCategoryChart,
│                                # NetCashFlowChart, TrendLineChart
├── views/
│   ├── LoginView.vue            # F1
│   ├── RegisterView.vue         # F1
│   ├── ForgotPasswordView.vue   # F1
│   ├── ResetPasswordView.vue    # F1
│   ├── WorkspaceSelectionView.vue # F2
│   ├── DashboardView.vue        # Dispatcher → F3/F4/F5 by workspace type
│   ├── PersonalDashboardView.vue # F3
│   ├── BusinessDashboardView.vue # F4
│   ├── OrgDashboardView.vue     # F5
│   ├── TransactionsView.vue     # F6
│   ├── IncomeView.vue           # F6 (type-locked)
│   ├── ExpensesView.vue         # F6 (type-locked)
│   ├── IntelligenceView.vue     # F7
│   ├── AssistantView.vue        # F8
│   ├── AccountsView.vue         # Simple page
│   ├── CategoriesView.vue       # Simple page
│   ├── BudgetsView.vue          # Simple page
│   ├── SavingsView.vue          # Simple page (personal only)
│   ├── MembersView.vue          # Simple page (business + org)
│   ├── DepartmentsView.vue      # Simple page (org only)
│   ├── AnalyticsView.vue        # Charts
│   ├── ReportsView.vue          # Export + print
│   ├── SettingsView.vue         # Preferences
│   └── NotPermittedView.vue     # RBAC denied page
├── router/
│   └── index.js                 # Routes + 5-step guard (guest/auth/workspace/type/permission)
├── stores/
│   ├── auth.js                  # Token + user session (in-memory token, restoreSession)
│   ├── workspace.js             # Active workspace, type, role, permissions, can()
│   ├── ui.js                    # Sidebar state, date range, notifications
│   └── assistant.js             # AI chat session state
├── services/
│   ├── api.js                   # Axios instance, tokenStore, 401 refresh mutex, error normalizer
│   ├── authService.js           # /auth/* (global, not workspace-scoped)
│   ├── workspaceService.js      # /workspaces, members, departments, alerts, dashboard, assistant
│   ├── transactionService.js    # /workspaces/:id/transactions (+ void, CSV import)
│   ├── accountService.js        # /workspaces/:id/accounts
│   ├── budgetService.js         # /workspaces/:id/budgets
│   ├── savingsService.js        # /workspaces/:id/savings-goals (+ contributions)
│   ├── analyticsService.js      # /workspaces/:id/analytics/*
│   ├── reportsService.js        # /workspaces/:id/reports (+ CSV export)
│   ├── intelligenceService.js   # /workspaces/:id/forecast, alerts, recommendations
│   ├── dashboardService.js      # /workspaces/:id/dashboard
│   └── mock/
│       ├── mockData.js          # Seeded PRNG data (accounts, categories, transactions,
│       │                        # budgets, savings, contributions, notifications, workspaces,
│       │                        # members, departments, alerts, recommendations)
│       └── mockService.js       # All mock async functions (simulates the full backend)
├── composables/
│   ├── useDateRange.js          # Reactive date-range selection
│   └── useTransactionPage.js   # Shared logic for Income/Expenses views
├── utils/
│   ├── format.js                # formatCurrency (KES/en-KE), formatDate, formatPercent
│   ├── validation.js            # runRules, required, isEmail, minLength, isPositiveNumber
│   └── date.js                  # Range presets, resolvePreset, previousRange, rangeToIso
├── App.vue                      # Root — single RouterView
└── main.js                      # Bootstrap: restoreSession() → restore() → mount()
```

## Workspace system

Users belong to one or more workspaces. Three types:

- **PERSONAL** — individual finance (income, expenses, budgets, savings goals)
- **BUSINESS** — company finance (net profit, team access, budgets)
- **ORGANIZATION** — multi-department budgets, roles, spending oversight

Everything is scoped to the active workspace. The sidebar, dashboard, and available pages change based on workspace type and the user's role/permissions.

## RBAC

The server returns permission codes per workspace. The frontend hides what's not permitted:

- Router checks `meta.permission` and redirects to `/not-permitted` if denied
- Sidebar filters nav items by `ws.can(permission)` and `wsTypes`
- Edit/delete/void buttons are gated by `ws.can('transactions.write')` etc.

Permission codes: `transactions.read`, `transactions.write`, `transactions.void`, `budgets.read`, `budgets.write`, `members.read`, `members.write`, `departments.read`, `departments.write`, `reports.read`, `settings.write`.

## Mock mode

When `VITE_USE_MOCK=true`, all service calls go to the mock layer in `src/services/mock/`. The mock data is seeded with a deterministic PRNG so it's stable across reloads. Mutations (create/update/delete) persist in memory for the tab session but reset on page refresh.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

## Tech stack

- Vue 3 (Composition API, `<script setup>`)
- Vite 5
- Pinia 2
- Vue Router 4
- Tailwind CSS 3
- Chart.js 4 + vue-chartjs 5
- Axios 1
