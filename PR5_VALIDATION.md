# PR5 Validation Checklist

## RBAC Tests

### 1. Admin Access
- [ ] Admin user can access `/admin/*` pages
- [ ] Admin user can access `/billing` pages
- [ ] Admin user can create budgets (org-level and scoped)
- [ ] Admin user can view all costs and budgets

### 2. Finance Role
- [ ] Finance user can access `/billing` pages
- [ ] Finance user can create org-level budgets
- [ ] Finance user CANNOT access `/admin/*` pages (should redirect with error)
- [ ] Finance user can view all costs and budgets

### 3. Manager Role
- [ ] Manager user can create budgets for team/project scope
- [ ] Manager user CANNOT create org-level budgets
- [ ] Manager user can view alerts
- [ ] Manager user CANNOT access `/admin/*` pages

### 4. User Role
- [ ] User CANNOT create budgets (should get 403)
- [ ] User can view org-level costs (limited)
- [ ] User CANNOT access `/admin/*` or `/billing` pages

## Budgets CRUD

### 5. Create Budget
- [ ] POST `/api/budgets` creates budget successfully
- [ ] Budget appears in `/budgets` page
- [ ] Budget with `hardLimit=true` enforces blocking

### 6. Update Budget
- [ ] PATCH `/api/budgets/[id]` updates budget
- [ ] Changes reflect in `/budgets` page

### 7. Delete Budget
- [ ] DELETE `/api/budgets/[id]` removes budget
- [ ] Budget disappears from `/budgets` page

## Alerts Engine

### 8. Active Alerts
- [ ] GET `/api/alerts/active` returns alerts for budgets in WARNING/CRITICAL
- [ ] Dashboard `/dashboard` shows active alerts in AlertsPanel
- [ ] Alerts update when budget status changes

### 9. Budget Status Computation
- [ ] Budget at 80% shows WARNING status
- [ ] Budget at 100%+ shows CRITICAL status
- [ ] Budget below threshold shows OK (no alert)

## AI Gateway Enforcement

### 10. Budget Blocking
- [ ] POST `/api/ai/request` with budget `hardLimit=true` and status=CRITICAL blocks request
- [ ] Returns 403 with clear error message
- [ ] Request logged in `AiRequestLog` with `statusCode=403` and `rawRef.reason='budget_blocked'`

### 11. Budget Restrict (Soft)
- [ ] Budget with `actions.restrict=true` applies restrictions (if implemented)
- [ ] Request still goes through but with limitations

## Notifications (v1)

### 12. Alert Notifications
- [ ] Critical budget alerts appear in `/notifications`
- [ ] Notifications are created when budget exceeds threshold

## Multi-tenant

### 13. Org Isolation
- [ ] Budgets are scoped to `orgId`
- [ ] Alerts only show for active org
- [ ] RBAC checks use active org context

## Manual Test Steps

1. **Test Admin Access:**
   - Login as admin (email in ADMIN_EMAILS)
   - Navigate to `/admin/ai` → should work
   - Navigate to `/budgets` → should work

2. **Test Finance Access:**
   - Create user with role='finance' in Membership
   - Login as finance user
   - Navigate to `/admin/ai` → should redirect with error
   - Navigate to `/budgets` → should work
   - Create org-level budget → should work

3. **Test Manager Access:**
   - Create user with role='manager' in Membership
   - Login as manager
   - Navigate to `/admin/ai` → should redirect
   - Create budget with scopeType='TEAM' → should work
   - Create budget with scopeType='ORG' → should fail (403)

4. **Test User Access:**
   - Create user with role='user' or 'member' in Membership
   - Login as user
   - Navigate to `/budgets` → should redirect (or show read-only)
   - POST `/api/budgets` → should return 403

5. **Test Budget Enforcement:**
   - Create budget with `hardLimit=true`, `amountEur=10`, `period='MONTHLY'`
   - Create CostEvents totaling >10 EUR for the org
   - Verify budget status is CRITICAL via `/api/alerts/active`
   - Make AI request via `/api/ai/request`
   - Should be blocked with 403 error

6. **Test Alerts Display:**
   - Create budget with low threshold (e.g., 50 EUR, alertThresholdPct=80)
   - Create CostEvents totaling >40 EUR
   - Check `/dashboard` → AlertsPanel should show WARNING alert
   - Check `/api/alerts/active` → should return alert

