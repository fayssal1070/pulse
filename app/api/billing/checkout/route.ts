/**
 * POST /api/billing/checkout
 * Create Stripe Checkout Session for subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'
import { getStripeClient } from '@/lib/stripe/client'
import { getPriceIdForPlan } from '@/lib/stripe/plans'
import type { Plan } from '@/lib/billing/entitlements'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    await requireAdmin()

    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()
    const { plan, interval = 'monthly' } = body

    // Validate plan
    if (!plan || !['STARTER', 'PRO', 'BUSINESS'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be STARTER, PRO, or BUSINESS' },
        { status: 400 }
      )
    }

    // Get Stripe client
    const stripe = getStripeClient()
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Get price ID
    const priceId = getPriceIdForPlan(plan as Plan, interval)
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan ${plan}` },
        { status: 500 }
      )
    }

    // Get or create Stripe customer
    let customerId = activeOrg.stripeCustomerId

    if (!customerId) {
      // Create customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          orgId: activeOrg.id,
          orgName: activeOrg.name,
        },
      })
      customerId = customer.id

      // Save customer ID to organization
      await prisma.organization.update({
        where: { id: activeOrg.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Determine success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || `${baseUrl}/billing`
    const successUrl = `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/billing?canceled=1`

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orgId: activeOrg.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          orgId: activeOrg.id,
          plan: plan,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    if (error.type === 'StripeCardError') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
