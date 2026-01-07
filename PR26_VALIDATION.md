# PR26 Validation - Plans, Entitlements & Feature Gating

## Overview
This document validates the implementation of PR26: Plans, Entitlements & Feature Gating across all endpoints and UI components.

## Test Checklist

### 1. STARTER Plan - Notification Channels Gating
**Test**: Cannot enable Slack/Teams/Webhooks; UI shows upgrade banner
- [ ] Set organization plan to STARTER (or ensure default)
- [ ] Navigate to `/settings/notifications`
- [ ] Verify Telegram toggle is disabled with upgrade message
- [ ] Verify Slack toggle is disabled with upgrade message
- [ ] Verify Teams toggle is disabled with upgrade message
- [ ] Verify webhooks section shows upgrade banner
- [ ] Attempt to enable Telegram via API: `POST /api/settings/notifications` with `telegramEnabled: true`
- [ ] Verify API returns 403 with `code: "upgrade_required"` and `required: "PRO"`
- [ ] Verify error message indicates Telegram requires PRO plan

### 2. STARTER Plan - Alert Rules Limit
**Test**: Cannot create more than 3 alert rules
- [ ] Ensure organization has STARTER plan
- [ ] Create 3 alert rules (should succeed)
- [ ] Attempt to create 4th alert rule via API: `POST /api/organizations/[id]/alerts`
- [ ] Verify API returns 403 with `code: "upgrade_required"` and `required: "PRO"`
- [ ] Verify error message indicates maximum 3 rules on STARTER plan
- [ ] Navigate to `/organizations/[id]/alerts`
- [ ] Verify "New Rule" button is disabled or shows upgrade banner when limit reached

### 3. STARTER Plan - AI Routing Limits
**Test**: Cannot add 2nd provider if limit=1
- [ ] Ensure organization has STARTER plan (maxProviders: 1)
- [ ] Create first AI provider connection: `POST /api/admin/ai/providers`
- [ ] Verify creation succeeds
- [ ] Attempt to create second provider connection
- [ ] Verify API returns 403 with `code: "upgrade_required"` and `required: "PRO"`
- [ ] Verify error message indicates maximum 1 provider on STARTER plan
- [ ] Test routes limit (maxRoutes: 5)
- [ ] Create 5 routes, then attempt 6th
- [ ] Verify 6th route creation returns 403 upgrade_required

### 4. PRO Plan - Notification Channels
**Test**: Telegram OK, Slack still blocked
- [ ] Set organization plan to PRO
- [ ] Navigate to `/settings/notifications`
- [ ] Verify Telegram toggle is enabled (no upgrade banner)
- [ ] Verify Slack toggle is disabled with upgrade message
- [ ] Verify Teams toggle is disabled with upgrade message
- [ ] Enable Telegram via API: `POST /api/settings/notifications` with `telegramEnabled: true`
- [ ] Verify API returns 200 OK
- [ ] Attempt to enable Slack via API
- [ ] Verify API returns 403 with `code: "upgrade_required"` and `required: "BUSINESS"`

### 5. BUSINESS Plan - All Notification Channels
**Test**: Slack/Teams/Webhooks OK
- [ ] Set organization plan to BUSINESS
- [ ] Navigate to `/settings/notifications`
- [ ] Verify all toggles (Telegram, Slack, Teams) are enabled
- [ ] Enable each channel via API
- [ ] Verify all return 200 OK
- [ ] Create webhook: `POST /api/admin/webhooks`
- [ ] Verify webhook creation succeeds (200 OK)

### 6. Retention Days Gating
**Test**: Retention clamp/403 works
- [ ] Ensure organization has STARTER plan (maxRetentionDays: 7)
- [ ] Attempt to set retention to 30 days: `POST /api/governance/retention` with `aiLogRetentionDays: 30`
- [ ] Verify API returns 403 with `code: "upgrade_required"`
- [ ] Verify error message indicates maximum 7 days on STARTER plan
- [ ] Set retention to 7 days (should succeed)
- [ ] Upgrade to PRO plan (maxRetentionDays: 30)
- [ ] Set retention to 30 days (should succeed)
- [ ] Attempt to set retention to 90 days
- [ ] Verify API returns 403 (requires BUSINESS plan)

### 7. API Keys Limits & Rotation Gating
**Test**: API keys limits/rotation gating works
- [ ] Ensure organization has STARTER plan (maxApiKeys: 3, rotation disabled)
- [ ] Create 3 API keys (should succeed)
- [ ] Attempt to create 4th key: `POST /api/admin/api-keys`
- [ ] Verify API returns 403 with `code: "upgrade_required"`
- [ ] Attempt to rotate existing key: `POST /api/admin/api-keys/[id]/rotate`
- [ ] Verify API returns 403 with `code: "upgrade_required"` and `required: "PRO"`
- [ ] Upgrade to PRO plan
- [ ] Verify rotation endpoint now succeeds
- [ ] Test advanced limits (rateLimitRpm, dailyCostLimitEur) on STARTER
- [ ] Verify advanced limits creation returns 403 upgrade_required

### 8. Export Endpoints Gating
**Test**: Costs export requires PRO+, usage export always allowed
- [ ] Ensure organization has STARTER plan (costsExportEnabled: false)
- [ ] Attempt to export costs: `GET /api/costs/export`
- [ ] Verify API returns 403 with `code: "upgrade_required"` and `required: "PRO"`
- [ ] Export usage: `GET /api/usage/export`
- [ ] Verify API returns 200 OK (usage export always allowed)
- [ ] Upgrade to PRO plan
- [ ] Verify costs export now succeeds

### 9. Plan Status in Health Endpoint
**Test**: Admin health shows plan and entitlements
- [ ] Navigate to `/api/admin/health` as admin
- [ ] Verify response includes `planStatus` object
- [ ] Verify `planStatus.plan` matches organization plan
- [ ] Verify `planStatus.entitlements` contains all entitlement limits
- [ ] Navigate to `/admin/health` page
- [ ] Verify plan status is displayed in UI with `data-testid="plan-status"`

### 10. Build & TypeScript
**Test**: Build passes with no TypeScript errors
- [ ] Run `npm run build`
- [ ] Verify build completes successfully
- [ ] Verify no TypeScript compilation errors
- [ ] Verify all imports resolve correctly
- [ ] Run `npm run lint` (if available)
- [ ] Verify no linting errors

## Expected Behavior Summary

### STARTER Plan
- Max 1 AI provider, 5 routes
- Max 3 alert rules
- No Telegram/Slack/Teams/Webhooks
- Retention max 7 days
- Max 3 API keys, no rotation, no advanced limits
- Costs export disabled, usage export enabled

### PRO Plan
- Max 3 AI providers, 25 routes
- Max 20 alert rules
- Telegram enabled, Slack/Teams/Webhooks disabled
- Retention max 30 days
- Max 20 API keys, rotation enabled, advanced limits enabled
- Costs export enabled, usage export enabled

### BUSINESS Plan
- Max 10 AI providers, 200 routes
- Max 1000 alert rules (effectively unlimited)
- All notification channels enabled
- Retention max 90 days
- Max 1000 API keys (effectively unlimited), all features enabled
- All exports enabled

## Error Response Format
All entitlement violations should return:
```json
{
  "ok": false,
  "code": "upgrade_required",
  "feature": "telegram_notifications",
  "plan": "STARTER",
  "required": "PRO",
  "message": "Telegram notifications require PRO plan or higher"
}
```

## UI Components
- `UpgradeRequired` component should appear with `data-testid="upgrade-required"`
- Upgrade banners should link to `/billing/preview`
- Disabled features should show clear upgrade messaging

