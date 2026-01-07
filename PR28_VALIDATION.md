# PR28 Validation - UI Feature Gating + Upgrade UX + Billing CTA

## Overview
This document validates the implementation of PR28: UI Feature Gating with upgrade UX improvements.

## Test Checklist

### 1. AI Providers Page Shows UpgradeRequired on Limit Reached
**Test**:
- [ ] Navigate to `/admin/integrations/ai` as admin with STARTER plan
- [ ] Add first provider (should work)
- [ ] Try to add second provider → should show UpgradeRequired banner
- [ ] Verify message shows current plan (STARTER) and required plan (PRO)
- [ ] Click "Go to Billing" → should navigate to `/billing`
- [ ] Verify UpgradeRequired has `data-testid="upgrade-required"`

### 2. AI Routes Page Shows UpgradeRequired on Limit Reached
**Test**:
- [ ] Navigate to `/admin/integrations/ai` as admin with STARTER plan
- [ ] Add routes until limit reached (STARTER = 5 routes)
- [ ] Try to add 6th route → should show UpgradeRequired banner
- [ ] Verify error shows feature, plan, and required plan
- [ ] Verify form is disabled or shows UpgradeRequired inline

### 3. Webhooks Page Shows UpgradeRequired for Non-BUSINESS Plans
**Test**:
- [ ] Navigate to `/admin/integrations/webhooks` as admin with STARTER plan
- [ ] Page should show UpgradeRequired instead of webhook management UI
- [ ] Message: "Webhooks require the BUSINESS plan"
- [ ] Current plan: STARTER, Required: BUSINESS
- [ ] Click "Go to Billing" → should navigate to `/billing`

### 4. Costs Export Button Shows UpgradeRequired
**Test**:
- [ ] Navigate to `/costs` as admin with STARTER plan
- [ ] Click "Export CSV" button
- [ ] Should show UpgradeRequired (modal or inline) instead of export
- [ ] Message should indicate costs export requires PRO plan
- [ ] Verify UpgradeRequired has correct plan information

### 5. /api/billing/me Returns Correct Entitlements
**Test**:
- [ ] As admin, call `GET /api/billing/me`
- [ ] Verify response includes:
  - `plan`: Current plan (STARTER/PRO/BUSINESS)
  - `status`: Subscription status
  - `currentPeriodEnd`: ISO date or null
  - `cancelAtPeriodEnd`: boolean
  - `entitlements`: Full entitlements object with:
    - `maxProviders`, `maxRoutes`, `maxAlertRules`
    - `telegramEnabled`, `slackEnabled`, `teamsEnabled`, `webhooksEnabled`
    - `costsExportEnabled`, `usageExportEnabled`
    - `maxRetentionDays`, `maxApiKeys`
    - `apiKeyRotationEnabled`, `apiKeyAdvancedLimitsEnabled`
- [ ] Verify entitlements match plan (STARTER has lower limits)
- [ ] Test with different plans (switch plan via Stripe)

### 6. Dashboard Plan Card Displays Correctly
**Test**:
- [ ] Navigate to `/dashboard` as admin
- [ ] Verify plan card appears with `data-testid="plan-card"`
- [ ] Shows current plan (STARTER/PRO/BUSINESS)
- [ ] Shows subscription status if available
- [ ] "Upgrade" button for STARTER, "Manage" for PRO/BUSINESS
- [ ] Click button → should navigate to `/billing`

### 7. fetchJson Intercepts Upgrade Errors
**Test**:
- [ ] Use `fetchJson` in a client component
- [ ] Make API call that returns 402/403 with `{code:"upgrade_required"}`
- [ ] Verify `UpgradeRequiredError` is thrown
- [ ] Verify error has `feature`, `plan`, `required`, `message` properties
- [ ] Catch error and display UpgradeRequired component

### 8. UpgradeRequired Component Displays All Props
**Test**:
- [ ] Create UpgradeRequired with all props:
  - `message`: Custom message
  - `feature`: Feature name
  - `plan`: Current plan
  - `requiredPlan`: Required plan
- [ ] Verify all information is displayed correctly
- [ ] Verify "Go to Billing" and "View Plans" buttons work
- [ ] Verify `data-testid="upgrade-required"` is present

### 9. PlanStatusWrapper Blocks Content for Low Plans
**Test**:
- [ ] Use `<PlanStatusWrapper requiredPlan="PRO">` around content
- [ ] With STARTER plan → should show UpgradeRequired
- [ ] With PRO plan → should show content
- [ ] With BUSINESS plan → should show content
- [ ] Verify wrapper uses `/api/billing/me` endpoint

### 10. Error Handling Does Not Show JSON 403
**Test**:
- [ ] Trigger upgrade_required error in any gated endpoint
- [ ] Verify client does NOT show raw JSON 403 error
- [ ] Verify UpgradeRequired component is shown instead
- [ ] Verify user experience is smooth (no error flashes)

## API Endpoints Validation

### GET /api/billing/me
- [ ] Requires authentication
- [ ] Returns current organization's plan and entitlements
- [ ] Handles missing active organization gracefully
- [ ] Returns correct entitlements based on plan
- [ ] Returns subscription status if available

## Components Validation

### UpgradeRequired
- [ ] Displays message clearly
- [ ] Shows plan comparison (current → required)
- [ ] Shows feature name if provided
- [ ] "Go to Billing" button links to `/billing`
- [ ] "View Plans" button links to `/billing/preview`
- [ ] Has `data-testid="upgrade-required"`

### PlanCard
- [ ] Fetches plan info on mount
- [ ] Displays current plan
- [ ] Shows subscription status if available
- [ ] "Upgrade" button for STARTER
- [ ] "Manage" button for PRO/BUSINESS
- [ ] Has `data-testid="plan-card"`

### PlanStatusWrapper
- [ ] Fetches plan info on mount
- [ ] Compares plan levels correctly
- [ ] Shows UpgradeRequired if plan too low
- [ ] Shows children if plan sufficient
- [ ] Handles loading state

## Integration Points

### Pages with UpgradeRequired
- [ ] `/admin/integrations/ai` - Providers and routes limits
- [ ] `/admin/integrations/webhooks` - BUSINESS plan only
- [ ] `/costs` - Export button gating
- [ ] `/governance` - Retention limits (if applicable)
- [ ] `/alerts/new` - Alert type restrictions (if applicable)

### Client Components Using fetchJson
- [ ] `AiProvidersAdminClient` - Uses fetchJson and handles UpgradeRequiredError
- [ ] Other admin clients use fetchJson for API calls
- [ ] Errors are caught and UpgradeRequired is displayed

## Expected Behavior Summary

### User Flow
1. User with STARTER plan tries to use PRO feature
2. API returns 402/403 with `{code:"upgrade_required", ...}`
3. `fetchJson` intercepts and throws `UpgradeRequiredError`
4. Component catches error and displays `UpgradeRequired`
5. User clicks "Go to Billing" → navigates to `/billing`
6. User upgrades via Stripe
7. Webhook updates plan → feature is now accessible

### UI Patterns
- UpgradeRequired appears as banner at top of page (for page-level gating)
- UpgradeRequired appears inline near blocked action (for action-level gating)
- PlanCard appears in dashboard for admin users
- All upgrade CTAs link to `/billing` (not `/billing/preview` for direct action)

## Notes
- `fetchJson` automatically handles upgrade errors for all API calls
- `PlanStatusWrapper` provides declarative page-level gating
- Components should handle UpgradeRequiredError gracefully
- No raw JSON 403 errors should be shown to users
- Build should pass with TypeScript strict mode

