# Billing & Entitlements Test Plan

## Overview

This document describes test scenarios for Stripe billing integration and feature limits enforcement.

## Prerequisites

- Stripe test account configured
- Environment variables set (see `BILLING_SETUP.md`)
- Test organization created
- Stripe CLI installed (for local webhook testing)

## Test Scenarios

### 1. Free Plan Default

**Setup**: Create a new organization

**Steps**:
1. Register new user
2. Create organization
3. Check organization plan in database: `SELECT plan FROM "Organization" WHERE id = '...'`

**Expected**:
- `plan = 'FREE'`
- All Stripe fields are `NULL`

**Verify**:
- Can create 1 cloud account
- Can create 1 alert
- Can have 1 member (owner)
- Cannot create 2nd cloud account (limit reached)
- Cannot create 2nd alert (limit reached)
- Cannot invite member (limit reached)

---

### 2. Upgrade Flow (Free → Pro)

**Setup**: Organization on FREE plan

**Steps**:
1. Navigate to `/pricing`
2. Click "Upgrade to Pro" (must be logged in)
3. Complete Stripe Checkout with test card: `4242 4242 4242 4242`
4. Use any future expiry date and any CVC
5. Verify redirect to `/organizations/[id]/billing?success=true`

**Expected**:
- Redirect to billing page with success message
- Organization plan updated to `PRO`
- `stripeCustomerId` set
- `stripeSubscriptionId` set
- `subscriptionStatus = 'active'`
- `currentPeriodEnd` set (30 days from now)

**Verify**:
- Can create up to 3 cloud accounts
- Can create up to 10 alerts
- Can invite up to 5 members total
- Cannot create 4th cloud account (limit reached)
- Cannot create 11th alert (limit reached)
- Cannot invite 6th member (limit reached)

---

### 3. Upgrade Flow (Free → Business)

**Steps**:
1. Navigate to `/pricing`
2. Click "Upgrade to Business"
3. Complete Stripe Checkout
4. Verify redirect

**Expected**:
- Same as Pro upgrade
- Plan = `BUSINESS`
- Limits: 10 cloud accounts, 50 alerts, 20 members

---

### 4. Upgrade Flow (Pro → Business)

**Setup**: Organization on PRO plan

**Steps**:
1. Navigate to `/organizations/[id]/billing`
2. Click "Upgrade to Business"
3. Complete checkout

**Expected**:
- Plan updated to `BUSINESS`
- Subscription updated (not new subscription)
- Limits increased immediately

---

### 5. Customer Portal Access

**Setup**: Organization with active subscription

**Steps**:
1. Navigate to `/organizations/[id]/billing`
2. Click "Manage Billing"
3. Verify redirect to Stripe Portal

**Expected**:
- Redirect to Stripe-hosted portal
- Can view subscription details
- Can update payment method
- Can cancel subscription

---

### 6. Cancel Subscription (Portal)

**Setup**: Organization on PRO plan

**Steps**:
1. Go to billing page
2. Click "Manage Billing"
3. In Stripe Portal, click "Cancel subscription"
4. Confirm cancellation
5. Return to PULSE billing page

**Expected**:
- `cancelAtPeriodEnd = true`
- `subscriptionStatus` still `active` (until period end)
- Plan remains `PRO` until period end
- Limits still apply until period end

**Verify**:
- After `currentPeriodEnd` passes, webhook should downgrade to FREE
- Limits reduced to FREE (1/1/1)
- Existing resources not deleted, but new ones blocked

---

### 7. Webhook: checkout.session.completed

**Setup**: Stripe CLI forwarding webhooks locally

**Steps**:
1. Trigger test event: `stripe trigger checkout.session.completed`
2. Check server logs
3. Verify database update

**Expected**:
- Webhook received and verified
- Organization updated with subscription details
- Plan set to PRO or BUSINESS based on metadata

---

### 8. Webhook: customer.subscription.updated

**Steps**:
1. In Stripe Dashboard, update subscription (e.g., change plan)
2. Check webhook logs
3. Verify database update

**Expected**:
- `subscriptionStatus` updated
- `currentPeriodEnd` updated if changed
- `cancelAtPeriodEnd` updated if changed

---

### 9. Webhook: customer.subscription.deleted

**Steps**:
1. Cancel subscription in Stripe Dashboard (immediate)
2. Check webhook logs
3. Verify database update

**Expected**:
- Plan downgraded to `FREE`
- `subscriptionStatus = 'canceled'`
- `stripeSubscriptionId` set to `NULL`
- Limits reduced immediately

---

### 10. Limit Enforcement: Cloud Accounts

**Setup**: FREE plan organization

**Steps**:
1. Create 1 cloud account (should succeed)
2. Try to create 2nd cloud account via:
   - AWS wizard: `/organizations/[id]/cloud-accounts/connect/aws`
   - Or API: `POST /api/cloud-accounts`

**Expected**:
- First creation: Success
- Second creation: HTTP 402 with error:
  ```
  LIMIT_REACHED: Maximum 1 cloud account allowed on FREE plan. Upgrade to add more.
  ```
- UI shows error message with "Upgrade" link

**Verify**:
- Error message is clear and actionable
- Link points to `/organizations/[id]/billing` or `/pricing`

---

### 11. Limit Enforcement: Alerts

**Setup**: FREE plan organization

**Steps**:
1. Create 1 alert (should succeed)
2. Try to create 2nd alert via:
   - UI: `/organizations/[id]/alerts/new`
   - Or API: `POST /api/organizations/[id]/alerts`

**Expected**:
- First creation: Success
- Second creation: HTTP 402 with error:
  ```
  LIMIT_REACHED: Maximum 1 alert allowed on FREE plan. Upgrade to add more.
  ```

**Verify**:
- Error message displayed in UI
- Upgrade link present

---

### 12. Limit Enforcement: Team Members

**Setup**: FREE plan organization (1 member = owner)

**Steps**:
1. Navigate to `/team`
2. Try to invite a member

**Expected**:
- HTTP 402 with error:
  ```
  LIMIT_REACHED: Maximum 1 member allowed on FREE plan. Upgrade to add more.
  ```

**Verify**:
- Error message in invite form
- Upgrade link present

---

### 13. Limit Enforcement: Pro Plan

**Setup**: PRO plan organization

**Steps**:
1. Create 3 cloud accounts (should all succeed)
2. Try to create 4th cloud account

**Expected**:
- First 3: Success
- 4th: HTTP 402 with limit message

**Repeat for**:
- Alerts (10 max)
- Members (5 max)

---

### 14. Usage Display (Billing Page)

**Steps**:
1. Navigate to `/organizations/[id]/billing`
2. Check "Usage & Limits" table

**Expected**:
- Shows current usage (e.g., "2 / 3 cloud accounts")
- Shows progress bar
- Shows "X remaining" or "Limit reached"
- If at limit, shows yellow banner with upgrade link

---

### 15. Pricing Page Integration

**Steps**:
1. Not logged in: Go to `/pricing`
2. Click "Get Started" on Pro plan

**Expected**:
- Redirects to `/login?redirect=/pricing`
- After login, redirects back to `/pricing`

**Steps** (logged in, no org):
1. Logged in, no organization: Go to `/pricing`
2. Click "Upgrade to Pro"

**Expected**:
- Shows "Create Organization" button
- Redirects to `/organizations/new` if clicked

**Steps** (logged in, FREE plan):
1. Logged in, FREE plan org: Go to `/pricing`
2. Click "Upgrade to Pro"

**Expected**:
- Creates checkout session
- Redirects to Stripe Checkout

**Steps** (logged in, PRO plan):
1. Logged in, PRO plan org: Go to `/pricing`
2. Check Pro plan button

**Expected**:
- Shows "Current Plan" (not clickable)
- Business plan shows "Upgrade to Business"

---

### 16. Error Handling: Invalid Price ID

**Setup**: Set `STRIPE_PRICE_ID_PRO` to invalid value

**Steps**:
1. Try to upgrade to Pro

**Expected**:
- Error: "Price ID not configured for this plan"
- No checkout session created

---

### 17. Error Handling: Webhook Signature Invalid

**Setup**: Set wrong `STRIPE_WEBHOOK_SECRET`

**Steps**:
1. Send test webhook event

**Expected**:
- HTTP 400: "Webhook Error: ..."
- No database update

---

### 18. Multi-Org Security

**Setup**: User with 2 organizations (org1, org2)

**Steps**:
1. Upgrade org1 to PRO
2. Try to access org2 billing: `/organizations/[org2_id]/billing`

**Expected**:
- If user is owner of org2: Can access
- If user is not owner: Redirect to `/organizations/[org2_id]`

**Steps**:
1. Try to upgrade org2 using org1's checkout session metadata

**Expected**:
- Webhook verifies `orgId` in metadata
- Only updates the correct organization

---

### 19. Payment Failure Handling

**Steps**:
1. Create subscription with card that will fail
2. Wait for `invoice.payment_failed` webhook
3. Check database

**Expected**:
- `subscriptionStatus = 'past_due'`
- Plan remains active (grace period)
- Limits still apply

**Steps** (after payment succeeds):
1. Retry payment in Stripe Dashboard
2. Wait for `invoice.paid` webhook

**Expected**:
- `subscriptionStatus = 'active'`
- `currentPeriodEnd` updated

---

### 20. Edge Cases

#### 20.1 Organization without Stripe Customer

**Steps**:
1. Create organization (FREE)
2. Try to access portal: `/organizations/[id]/billing` → "Manage Billing"

**Expected**:
- Error: "No active subscription found"
- Button disabled or shows error

#### 20.2 Subscription Already Canceled

**Steps**:
1. Cancel subscription (immediate)
2. Check billing page

**Expected**:
- Plan = FREE
- Status = Canceled
- No "Manage Billing" button (or shows error)

#### 20.3 At Limit, Then Upgrade

**Steps**:
1. FREE plan, 1 cloud account (at limit)
2. Upgrade to PRO
3. Try to create 2nd cloud account

**Expected**:
- Upgrade succeeds
- Can now create 2nd and 3rd cloud accounts
- Cannot create 4th (new limit)

---

## Checklist

- [ ] Free plan defaults correctly
- [ ] Upgrade Free → Pro works
- [ ] Upgrade Free → Business works
- [ ] Upgrade Pro → Business works
- [ ] Customer Portal accessible
- [ ] Cancel subscription works
- [ ] Webhook: checkout.session.completed
- [ ] Webhook: subscription.updated
- [ ] Webhook: subscription.deleted
- [ ] Webhook: invoice.payment_failed
- [ ] Webhook: invoice.paid
- [ ] Cloud account limit enforced (FREE)
- [ ] Cloud account limit enforced (PRO)
- [ ] Alert limit enforced (FREE)
- [ ] Alert limit enforced (PRO)
- [ ] Member limit enforced (FREE)
- [ ] Member limit enforced (PRO)
- [ ] Usage display correct
- [ ] Pricing page integration works
- [ ] Multi-org security verified
- [ ] Error handling works
- [ ] Edge cases handled

## Test Data

### Test Cards (Stripe Test Mode)

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

### Test Scenarios

1. **New User Flow**:
   - Register → Create Org (FREE) → Upgrade to Pro → Use features

2. **Existing User Flow**:
   - Login → Select Org → Upgrade → Use features

3. **Cancel Flow**:
   - Upgrade → Use features → Cancel → Verify downgrade

4. **Limit Testing**:
   - Create resources up to limit → Verify blocking → Upgrade → Verify unblocking

## Notes

- All limits are enforced server-side (API routes)
- UI shows helpful error messages with upgrade links
- Webhooks are idempotent (safe to retry)
- Multi-org isolation is strict (all queries filter by orgId)



