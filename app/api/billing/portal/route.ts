/**
 * POST /api/billing/portal
 * Create Stripe Customer Portal session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireAdmin } from '@/lib/admin-helpers'
import { getStripeClient } from '@/lib/stripe/client'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    await requireAdmin()

    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    if (!activeOrg.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please create a subscription first.' },
        { status: 400 }
      )
    }

    const stripe = getStripeClient()
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || `${baseUrl}/billing`

    const session = await stripe.billingPortal.sessions.create({
      customer: activeOrg.stripeCustomerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
