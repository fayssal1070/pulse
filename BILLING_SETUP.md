# Stripe Billing Setup Guide

## Overview

This guide explains how to set up Stripe billing for PULSE, including creating Price IDs, configuring environment variables, and testing webhooks.

## Prerequisites

- Stripe account (https://stripe.com)
- Access to Stripe Dashboard
- Vercel project with environment variable access

## Step 1: Create Products and Prices in Stripe

### 1.1 Create Pro Product

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `PULSE Pro`
   - **Description**: `Pro plan with 3 cloud accounts, 10 alerts, 5 members`
   - **Pricing model**: `Standard pricing`
   - **Price**: `€49.00 EUR`
   - **Billing period**: `Monthly`
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_...`)

### 1.2 Create Business Product

1. Click **"+ Add product"** again
2. Fill in:
   - **Name**: `PULSE Business`
   - **Description**: `Business plan with 10 cloud accounts, 50 alerts, 20 members`
   - **Pricing model**: `Standard pricing`
   - **Price**: `€149.00 EUR`
   - **Billing period**: `Monthly`
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_...`)

## Step 2: Configure Environment Variables

### 2.1 Local Development (.env.local)

Add these variables to your `.env.local` file:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_BUSINESS=price_...

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.2 Vercel Production

1. Go to your Vercel project → Settings → Environment Variables
2. Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production, Preview, Development |
| `STRIPE_PRICE_ID_PRO` | `price_...` | Production, Preview, Development |
| `STRIPE_PRICE_ID_BUSINESS` | `price_...` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production, Preview, Development |

**Important**: Use test keys (`sk_test_...`) for Preview/Development, and live keys (`sk_live_...`) for Production.

## Step 3: Set Up Webhook Endpoint

### 3.1 Local Development (Stripe CLI)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (starts with `whsec_...`) and add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 3.2 Production (Stripe Dashboard)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Fill in:
   - **Endpoint URL**: `https://your-domain.vercel.app/api/webhooks/stripe`
   - **Description**: `PULSE Production Webhook`
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.paid`
4. Click **"Add endpoint"**
5. **Copy the Signing secret** (starts with `whsec_...`) and add it to Vercel as `STRIPE_WEBHOOK_SECRET`

## Step 4: Test Webhook Locally

1. Start your local server: `npm run dev`
2. In another terminal, run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Trigger a test event:
   ```bash
   stripe trigger checkout.session.completed
   ```
4. Check your server logs for webhook processing

## Step 5: Verify Setup

### 5.1 Test Checkout Flow

1. Start local server with Stripe CLI forwarding
2. Navigate to `/pricing`
3. Click "Upgrade to Pro" (must be logged in with an organization)
4. Complete Stripe Checkout (use test card: `4242 4242 4242 4242`)
5. Verify redirect to `/organizations/[id]/billing?success=true`
6. Check database: `Organization.plan` should be `PRO`

### 5.2 Test Portal Flow

1. After successful checkout, go to `/organizations/[id]/billing`
2. Click "Manage Billing"
3. Verify redirect to Stripe Customer Portal
4. Test canceling subscription
5. Verify webhook updates `cancelAtPeriodEnd = true`

## Troubleshooting

### Webhook Not Receiving Events

- Verify webhook URL is correct (no trailing slash)
- Check Stripe Dashboard → Webhooks → Recent events
- Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint secret
- Check server logs for signature verification errors

### Checkout Not Redirecting

- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check `success_url` and `cancel_url` in checkout session creation
- Ensure organization ID is passed in metadata

### Subscription Not Updating

- Check webhook events in Stripe Dashboard
- Verify webhook handler logs (check for errors)
- Ensure `STRIPE_PRICE_IDS` match your Price IDs
- Check database for `Organization` updates

## Security Notes

- **Never commit** `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to git
- Use test keys for development
- Verify webhook signatures (already implemented)
- All billing routes require authentication and ownership verification

## Next Steps

After setup, test the complete flow:
1. Create organization (defaults to FREE)
2. Upgrade to Pro via checkout
3. Verify limits (3 cloud accounts, 10 alerts, 5 members)
4. Test limit enforcement (try creating 4th cloud account)
5. Test portal (cancel subscription)
6. Verify downgrade to FREE after cancellation



