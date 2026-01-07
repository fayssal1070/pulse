# PR30 — Usage Overages & Pay-As-You-Go Billing — Validation Checklist

## Objective
Verify that usage overages are correctly calculated, tracked, and billed via Stripe without blocking users (except STARTER plan if configured).

---

## 1. Entitlements Configuration

### ✅ Test: Verify quota and overage pricing per plan

**Steps:**
1. Check `/api/billing/me` for each plan type:
   - STARTER: `includedMonthlySpendEUR: 20`, `overagePricePerEUR: 1.5`, `allowOverage: false`
   - PRO: `includedMonthlySpendEUR: 200`, `overagePricePerEUR: 1.20`, `allowOverage: true`
   - BUSINESS: `includedMonthlySpendEUR: 2000`, `overagePricePerEUR: 1.10`, `allowOverage: true`

**Expected:**
- All plans have correct quota amounts
- Overage pricing multipliers are correct
- STARTER has `allowOverage: false`, others have `true`

---

## 2. Monthly Usage Tracking

### ✅ Test: Verify MonthlyUsage records are created

**Steps:**
1. Make some AI requests to generate costs
2. Check database: `SELECT * FROM "MonthlyUsage" WHERE "orgId" = '<org-id>' ORDER BY "year", "month"`
3. Verify:
   - Record exists for current month
   - `totalSpendEUR` matches sum of CostEvent for the month
   - `includedSpendEUR` matches plan entitlement
   - `overageSpendEUR = max(0, totalSpendEUR - includedSpendEUR)`
   - `overageAmountEUR = overageSpendEUR * overagePricePerEUR`

**Expected:**
- MonthlyUsage record created automatically
- Calculations are accurate

---

## 3. Overage Calculation

### ✅ Test: PRO plan exceeds quota → not blocked

**Steps:**
1. Set org to PRO plan
2. Generate AI costs exceeding 200 EUR (e.g., 250 EUR total)
3. Make another AI request
4. Check:
   - Request succeeds (not blocked)
   - `AiRequestLog.rawRef` contains `overQuota: true`
   - `/api/billing/me` shows `usage.overageSpendEUR > 0`

**Expected:**
- Requests are not blocked for PRO
- Over quota status is logged
- Overage amount calculated correctly

### ✅ Test: BUSINESS plan exceeds quota → not blocked

**Steps:**
1. Set org to BUSINESS plan
2. Generate AI costs exceeding 2000 EUR
3. Make another AI request
4. Verify same behavior as PRO

**Expected:**
- Same as PRO (no blocking, logging works)

---

## 4. STARTER Plan Blocking (if enabled)

### ⚠️ Test: STARTER plan exceeds quota → behavior check

**Steps:**
1. Set org to STARTER plan
2. Generate AI costs exceeding 20 EUR
3. Attempt to make another AI request
4. Check:
   - If `allowOverage: false`, should either:
     - Block the request (if implemented)
     - Show warning UI
   - `AiRequestLog.rawRef` contains `overQuota: true`

**Expected:**
- STARTER behavior respects `allowOverage: false` setting
- Logging still works

---

## 5. Stripe Invoice Item Creation

### ✅ Test: Cron finalizes usage and creates Stripe invoice items

**Steps:**
1. Ensure org has `stripeCustomerId`
2. Generate overage for previous month (adjust date if needed)
3. Manually call `POST /api/cron/finalize-usage` with `Authorization: Bearer <CRON_SECRET>`
4. Check:
   - `MonthlyUsage.finalized = true`
   - `MonthlyUsage.stripeInvoiceItemId` is set
   - Stripe dashboard shows invoice item for the customer

**Expected:**
- MonthlyUsage finalized
- Invoice item created in Stripe with correct amount
- Description includes month/year

**Note:** For testing, you may need to:
- Temporarily modify cron to process current month
- Or wait until end of month when cron runs automatically

---

## 6. UI — Usage Page

### ✅ Test: /usage page displays overage information

**Steps:**
1. Navigate to `/usage`
2. Verify "Usage & Quota" card shows:
   - Included quota
   - Current usage
   - Overage amount (if applicable)
   - Estimated bill (if over quota)
   - Progress bar with correct percentage
3. Verify progress bar colors:
   - Green: < 80%
   - Yellow: 80-100%
   - Orange: 100-200%
   - Red: 200%+

**Expected:**
- All information displayed correctly
- Visual indicators work (colors, badges)
- Calculations match backend

---

## 7. UI — Dashboard Card

### ✅ Test: Dashboard shows usage card with overage badge

**Steps:**
1. Navigate to `/dashboard` (as admin)
2. Verify "Usage This Month" card appears
3. If over quota:
   - Shows "Over quota" badge
   - Shows overage amount
   - Shows "Upgrade" button linking to `/billing`
4. Progress bar matches usage page

**Expected:**
- Card visible for admin users
- Over quota badge appears when applicable
- Upgrade CTA works

---

## 8. API — /api/billing/me includes usage data

### ✅ Test: Usage data included in plan info endpoint

**Steps:**
1. Call `GET /api/billing/me`
2. Verify response includes:
   ```json
   {
     "usage": {
       "totalSpendEUR": <number>,
       "includedSpendEUR": <number>,
       "overageSpendEUR": <number>,
       "overageAmountEUR": <number>,
       "isOverQuota": <boolean>,
       "quotaPercentage": <number>
     }
   }
   ```

**Expected:**
- All usage fields present
- Values match actual data

---

## 9. Real-Time Over Quota Detection

### ✅ Test: AiRequestLog contains overQuota flag

**Steps:**
1. Generate costs to exceed quota
2. Make an AI request
3. Query database: `SELECT "rawRef" FROM "AiRequestLog" ORDER BY "createdAt" DESC LIMIT 1`
4. Parse JSON from `rawRef`
5. Verify contains:
   - `overQuota: true` (if over quota)
   - `quotaPercentage: <number>`

**Expected:**
- Every request logs quota status
- Percentage calculation correct

---

## 10. Edge Cases

### ✅ Test: Zero usage month

**Steps:**
1. Create org with no costs in current month
2. Check `/api/billing/me` usage data

**Expected:**
- `totalSpendEUR: 0`
- `overageSpendEUR: 0`
- `isOverQuota: false`

### ✅ Test: Exactly at quota

**Steps:**
1. Generate costs exactly equal to included quota
2. Check usage data

**Expected:**
- `overageSpendEUR: 0`
- `isOverQuota: false` (or true if `>=` check)

### ✅ Test: Multiple months

**Steps:**
1. Generate costs in different months
2. Verify each month has separate MonthlyUsage record

**Expected:**
- Separate records per month
- Calculations correct per month

---

## 11. Integration with PR26/PR27/PR28/PR29

### ✅ Test: No breaking changes

**Steps:**
1. Verify existing features still work:
   - Feature gating (PR26)
   - Stripe subscriptions (PR27)
   - Upgrade UI (PR28)
   - Seats management (PR29)

**Expected:**
- All previous PRs still functional
- No regressions

---

## 12. Build & TypeScript

### ✅ Test: Build passes

**Steps:**
1. Run `npm run build`
2. Verify no TypeScript errors
3. Verify no missing imports

**Expected:**
- Build succeeds
- No type errors

---

## Summary

- [ ] Entitlements configured correctly
- [ ] MonthlyUsage tracking works
- [ ] PRO/BUSINESS overage allowed
- [ ] STARTER overage behavior correct
- [ ] Stripe invoice items created
- [ ] /usage page displays overage
- [ ] Dashboard card works
- [ ] /api/billing/me includes usage
- [ ] AiRequestLog logs overQuota
- [ ] Edge cases handled
- [ ] No regressions
- [ ] Build passes

---

## Notes

- **Stripe Testing:** Use Stripe test mode for invoice item creation
- **Cron Testing:** May need to manually trigger `/api/cron/finalize-usage` or adjust dates
- **STARTER Blocking:** Implementation may vary (soft warning vs hard block) based on product decision

