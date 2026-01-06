# PR25 Validation: Usage & Billing Preview

## Prérequis
- Migration PR24 appliquée (apiKeyId tracking)
- Au moins quelques CostEvent AI dans la DB
- Admin/finance/manager access pour tester RBAC

---

## Test 1: Open /usage → KPIs load

1. Navigate to `/usage`
2. Check that the page loads without errors

**Résultat attendu:**
- Page loads successfully
- 4 KPI cards visible:
  - Total this month (EUR)
  - Δ vs last month (%)
  - Top App (name + EUR)
  - Top Provider (name + EUR)
- Data-testid attributes present:
  - `usage-kpi-total`
  - `usage-kpi-mom`
  - `usage-kpi-top-app`
  - `usage-kpi-top-provider`

---

## Test 2: Breakdown tabs work

1. On `/usage`, click through tabs:
   - "By App"
   - "By Provider"
   - "By User"
   - "By Project"

**Résultat attendu:**
- Each tab loads data correctly
- Table shows:
  - Name column
  - Amount (EUR) column
  - % of Total column
  - Trend (7d) column with up/down indicators
  - Actions column (for items > 30%)
- Data-testid attributes:
  - `usage-tab-app`
  - `usage-tab-provider`
  - `usage-tab-user`
  - `usage-tab-project`

---

## Test 3: Export CSV downloads and columns correct

1. On `/usage`, click "Export finance CSV"
2. Download should start automatically
3. Open CSV file

**Résultat attendu:**
- CSV file downloads
- Filename: `pulse-usage-export-YYYY-MM-DD.csv`
- Columns present:
  - Date
  - App
  - Project
  - Client
  - Team
  - Provider
  - AmountEUR
  - UserEmail
  - Source
  - RawRef
- **NO tokens column** (finance-ready)
- Data-testid: `usage-export-btn`

---

## Test 4: RBAC - user sees only own usage

1. Log in as a **non-admin/non-finance/non-manager** user
2. Navigate to `/usage`
3. Check summary KPIs and breakdowns

**Résultat attendu:**
- Summary shows only this user's costs
- Breakdowns show only this user's costs
- `/api/usage/summary` filters by `userId = current user`
- `/api/usage/breakdown` filters by `userId = current user`

---

## Test 5: /billing/preview renders and uses summary

1. Navigate to `/billing/preview`

**Résultat attendu:**
- Page loads without errors
- Shows:
  - AI Usage (Month to Date) in EUR
  - Pulse Fee Estimate with tier (Starter/Pro/Business)
  - Fee description (e.g., "5% of usage, capped at €10")
  - Total estimated (usage + fee)
  - Disclaimer: "This is a preview, not an invoice."
- Data-testid attributes:
  - `billing-preview-usage`
  - `billing-preview-estimate`
- "View Usage Details" button links to `/usage`
- "Change Plan" button links to `/admin/subscription` (or appropriate route)

---

## Test 6: Dashboard card visible and links to /usage

1. Log in as admin or finance
2. Navigate to `/dashboard`
3. Look for "AI Spend this month" card

**Résultat attendu:**
- Card visible below KPI cards
- Shows:
  - Title: "AI Spend this month"
  - Amount in EUR
  - Δ vs last month with trend indicator (↑ red or ↓ green)
  - "View usage →" link
- Card only visible to admin/finance users
- Link goes to `/usage`

---

## Test 7: Filters work

1. On `/usage`, change date range filter:
   - Last 7 days
   - Last 30 days
   - Month to date (default)
   - Last month

**Résultat attendu:**
- Each selection updates breakdown data
- Summary KPIs remain MTD (not affected by filter)
- Breakdown table reflects selected date range

---

## Test 8: "Why is this high?" feature

1. On `/usage`, find a row with > 30% of total
2. Click "Details" button (if present)

**Résultat attendu:**
- Modal/drawer opens
- Shows item name in title
- "Create Alert" button present
- Link to `/alerts/new` with prefilled query params:
  - `scopeType=APP|PROJECT|USER|PROVIDER`
  - `scopeId=<item-id>`
- Modal can be closed

---

## Test 9: Empty states

1. Navigate to `/usage` with an org that has NO AI costs

**Résultat attendu:**
- Page loads without errors
- Summary shows:
  - Total: €0.00
  - Top App: "No app data"
  - Top Provider: "No provider data"
- Breakdown shows: "No usage data for selected period"
- Export still works (returns empty CSV with headers)

---

## Test 10: Build passes

1. Run `npm run build`

**Résultat attendu:**
- TypeScript compilation succeeds
- No type errors
- Build completes successfully

---

## Checklist finale

- [ ] `/usage` page loads with KPIs
- [ ] Breakdown tabs work (app/provider/user/project)
- [ ] Export CSV downloads with correct columns (no tokens)
- [ ] RBAC: user sees only own usage
- [ ] `/billing/preview` renders correctly
- [ ] Dashboard card visible (admin/finance only)
- [ ] Filters update breakdown data
- [ ] "Why is this high?" modal works
- [ ] Empty states handled gracefully
- [ ] Build passes (TypeScript strict)
- [ ] Navigation includes "Usage" link

---

## Notes importantes

- **No tokens in UI**: All displays show EUR only
- **RBAC strict**: User role determines data visibility
- **Finance-ready CSV**: Export format suitable for accounting
- **Multi-tenant**: All queries scoped by orgId
- **data-testid**: All key elements have test IDs for E2E

