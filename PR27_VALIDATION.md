# PR27 Validation - Stripe Subscriptions + Plan Sync

## Overview
This document validates the implementation of PR27: Stripe Subscriptions + Plan Sync for SaaS monetization.

## Prerequisites

### Environment Variables
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_PRICE_STARTER_MONTHLY` - Price ID for STARTER plan
- `STRIPE_PRICE_PRO_MONTHLY` - Price ID for PRO plan
- `STRIPE_PRICE_BUSINESS_MONTHLY` - Price ID for BUSINESS plan
- `STRIPE_PORTAL_RETURN_URL` (optional) - Return URL for billing portal
- `NEXT_PUBLIC_BASE_URL` or `VERCEL_URL` - Base URL for success/cancel URLs

### Stripe Setup
1. Create products in Stripe Dashboard:
   - STARTER (monthly)
   - PRO (monthly)
   - BUSINESS (monthly)
2. Get price IDs (price_xxx) and set in ENV
3. Create webhook endpoint in Stripe Dashboard:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Test Checklist

### 1. Starter -> Checkout -> Webhook -> Plan becomes STARTER/ACTIVE
**Test**:
- [ ] Navigate to `/billing` as admin
- [ ] Click "Upgrade / Change Plan"
- [ ] Select STARTER plan (or use API: `POST /api/billing/checkout` with `{ plan: "STARTER" }`)
- [ ] Complete Stripe Checkout flow
- [ ] Verify redirect to `/billing/success`
- [ ] Trigger webhook event manually or wait for Stripe webhook
- [ ] Check database: `Organization.plan` should be `STARTER`
- [ ] Check database: `Organization.subscriptionStatus` should be `active` or `trialing`
- [ ] Check database: `Organization.stripeCustomerId` should be set
- [ ] Check database: `Organization.stripeSubscriptionId` should be set
- [ ] Verify `StripeEvent` table has event with status `PROCESSED`

### 2. Upgrade Pro -> Webhook -> Plan PRO/ACTIVE
**Test**:
- [ ] With existing STARTER subscription, navigate to `/billing`
- [ ] Click "Upgrade / Change Plan"
- [ ] Select PRO plan
- [ ] Complete checkout
- [ ] Trigger webhook `customer.subscription.updated` manually or wait
- [ ] Check database: `Organization.plan` should be `PRO`
- [ ] Check database: `Organization.stripePriceId` should match PRO price ID
- [ ] Verify entitlements unlock (e.g., can create more alert rules, enable Telegram)

### 3. Cancel at Period End -> Portal -> Webhook Updates cancelAtPeriodEnd
**Test**:
- [ ] With active subscription, navigate to `/billing`
- [ ] Click "Manage Billing" (opens Stripe Customer Portal)
- [ ] In portal, cancel subscription "at period end"
- [ ] Return to `/billing`
- [ ] Trigger webhook `customer.subscription.updated` manually or wait
- [ ] Check database: `Organization.cancelAtPeriodEnd` should be `true`
- [ ] Verify billing page shows cancellation notice
- [ ] Verify subscription still active until period end

### 4. Payment Failed -> Status PAST_DUE -> Gating Forces STARTER
**Test**:
- [ ] With active subscription, simulate payment failure in Stripe Dashboard
- [ ] Trigger webhook `invoice.payment_failed` or `customer.subscription.updated`
- [ ] Check database: `Organization.subscriptionStatus` should be `past_due`
- [ ] Verify `getOrgPlan()` returns `STARTER` (due to non-active status)
- [ ] Verify feature gating applies (e.g., cannot create >3 alert rules)
- [ ] Attempt to use PRO features → should get upgrade_required error

### 5. Webhook Idempotence: Same Event Twice Does Nothing
**Test**:
- [ ] Process a webhook event (e.g., `checkout.session.completed`)
- [ ] Verify `StripeEvent` table has entry with status `PROCESSED`
- [ ] Resend same event ID from Stripe (or manually call webhook with same event.id)
- [ ] Verify webhook handler returns 200 with `already_processed`
- [ ] Verify `Organization` table was NOT updated again
- [ ] Verify `StripeEvent` status remains `PROCESSED`

### 6. Billing Page Shows Correct Info
**Test**:
- [ ] Navigate to `/billing` as admin
- [ ] Verify current plan is displayed with `data-testid="billing-plan"`
- [ ] Verify subscription status is displayed with `data-testid="billing-status"`
- [ ] Verify renewal date is displayed if `currentPeriodEnd` is set
- [ ] Verify cancellation notice if `cancelAtPeriodEnd` is true
- [ ] Click "Upgrade / Change Plan" → verify checkout flow starts
- [ ] If `stripeCustomerId` exists, verify "Manage Billing" button appears
- [ ] Click "Manage Billing" → verify Stripe Portal opens

### 7. Subscription Deleted -> Downgrades to STARTER
**Test**:
- [ ] Cancel subscription completely in Stripe (not "at period end")
- [ ] Trigger webhook `customer.subscription.deleted`
- [ ] Check database: `Organization.plan` should be `STARTER`
- [ ] Check database: `Organization.subscriptionStatus` should be `canceled`
- [ ] Check database: `Organization.stripeSubscriptionId` should be `null`
- [ ] Verify `stripeCustomerId` is preserved (for potential re-subscription)

### 8. Admin Health Includes Stripe Info
**Test**:
- [ ] Navigate to `/api/admin/health` as admin
- [ ] Verify response includes `stripe` object:
  - `customerId` matches `Organization.stripeCustomerId`
  - `subscriptionId` matches `Organization.stripeSubscriptionId`
  - `subscriptionStatus` matches `Organization.subscriptionStatus`
  - `currentPeriodEnd` matches `Organization.currentPeriodEnd`
  - `lastStripeEvent` shows most recent event for org

### 9. Integration with PR26 Gating
**Test**:
- [ ] With STARTER plan and active subscription:
  - [ ] Verify max 3 alert rules can be created
  - [ ] Verify Telegram cannot be enabled (requires PRO)
  - [ ] Verify costs export blocked (requires PRO)
- [ ] Upgrade to PRO via Stripe:
  - [ ] Verify webhook updates plan to PRO
  - [ ] Verify can create 20 alert rules
  - [ ] Verify Telegram can be enabled
  - [ ] Verify costs export works
- [ ] Payment fails → status becomes `past_due`:
  - [ ] Verify `getOrgPlan()` returns `STARTER` (not PRO)
  - [ ] Verify PRO features are blocked again

### 10. Error Handling & Fail-Safe
**Test**:
- [ ] With `STRIPE_SECRET_KEY` unset:
  - [ ] Verify `/api/billing/checkout` returns 503 with clear message
  - [ ] Verify `/api/billing/portal` returns 503 with clear message
- [ ] With invalid webhook signature:
  - [ ] Verify webhook returns 400 with error message
  - [ ] Verify no database updates occur
- [ ] With unknown event type:
  - [ ] Verify webhook returns 200 (no crash)
  - [ ] Verify event is stored in `StripeEvent` table
  - [ ] Verify processing error is logged

## Database Schema Validation

### Organization Table
- [ ] `plan` column exists and defaults to `STARTER`
- [ ] `stripeCustomerId` is unique and nullable
- [ ] `stripeSubscriptionId` is unique and nullable
- [ ] `subscriptionStatus` is nullable string
- [ ] `currentPeriodEnd` is nullable DateTime
- [ ] `cancelAtPeriodEnd` is boolean (default false)
- [ ] `trialEndsAt` is nullable DateTime

### StripeEvent Table
- [ ] Table exists with columns: `id`, `type`, `createdAt`, `processedAt`, `orgId`, `status`, `error`
- [ ] `id` is unique (Stripe event ID)
- [ ] Indexes exist on `type`, `status`, `createdAt`, `orgId`
- [ ] Foreign key to `Organization` (onDelete: SetNull)

## API Endpoints Validation

### POST /api/billing/checkout
- [ ] Requires admin authentication
- [ ] Creates Stripe customer if not exists
- [ ] Creates checkout session with correct price ID
- [ ] Includes `orgId` in metadata
- [ ] Returns checkout URL

### POST /api/billing/portal
- [ ] Requires admin authentication
- [ ] Returns 400 if no `stripeCustomerId`
- [ ] Creates portal session
- [ ] Returns portal URL

### POST /api/webhooks/stripe
- [ ] Verifies webhook signature
- [ ] Implements idempotence (checks `StripeEvent` table)
- [ ] Processes events: checkout.session.completed, customer.subscription.*, invoice.*
- [ ] Updates `Organization` correctly
- [ ] Stores events in `StripeEvent` table
- [ ] Returns 200 for all processed events (even failures)

## UI Pages Validation

### /billing
- [ ] Requires admin authentication
- [ ] Displays current plan, status, renewal date
- [ ] Shows cancellation notice if applicable
- [ ] "Upgrade / Change Plan" button works
- [ ] "Manage Billing" button appears if customer exists
- [ ] Handles canceled checkout (shows message)

### /billing/success
- [ ] Displays success message
- [ ] Shows session ID if provided
- [ ] Redirects to `/billing` after 3 seconds

## Build & Deployment
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Migration SQL runs successfully
- [ ] Prisma schema is valid
- [ ] All environment variables documented

## Expected Behavior Summary

### Subscription Flow
1. Admin selects plan → Checkout → Payment → Webhook → Plan updated
2. Portal allows cancel/upgrade/downgrade → Webhook → Plan updated
3. Payment fails → Webhook → Status `past_due` → Gating downgrades to STARTER
4. Subscription canceled → Webhook → Plan `STARTER`, status `canceled`

### Gating Integration
- Active/Trialing subscription → Use plan from Stripe
- Past due/Unpaid/Canceled → Treat as STARTER for gating
- No subscription → Use plan field or default to STARTER

## Notes
- Webhook events are processed asynchronously, so plan updates may take a few seconds
- Stripe Customer Portal handles all subscription management (upgrade/downgrade/cancel)
- Always verify webhook signature to prevent unauthorized updates
- Event idempotence prevents duplicate processing of the same event

