import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById, isOrganizationOwner } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { orgId, plan } = await request.json()

    if (!orgId || !plan) {
      return NextResponse.json(
        { error: 'orgId and plan are required' },
        { status: 400 }
      )
    }

    if (plan !== 'PRO' && plan !== 'BUSINESS') {
      return NextResponse.json(
        { error: 'Invalid plan. Must be PRO or BUSINESS' },
        { status: 400 }
      )
    }

    // Verify user is owner of the organization
    const organization = await getOrganizationById(orgId, user.id)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    const isOwner = await isOrganizationOwner(orgId, user.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only organization owners can manage billing' },
        { status: 403 }
      )
    }

    // Get full organization with Stripe fields
    const orgWithStripe = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        stripeCustomerId: true,
        plan: true,
      },
    })

    if (!orgWithStripe) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const priceId = STRIPE_PRICE_IDS[plan as 'PRO' | 'BUSINESS']
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this plan' },
        { status: 500 }
      )
    }

    // Get or create Stripe customer
    let customerId = orgWithStripe.stripeCustomerId

    if (!customerId) {
      // Get user email for Stripe customer
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      })

      const customer = await stripe.customers.create({
        email: userData?.email || undefined,
        metadata: {
          orgId,
          userId: user.id,
        },
      })

      customerId = customer.id

      // Save customer ID to organization
      await prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customerId },
      })
    }

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const origin = new URL(baseUrl).origin

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
      success_url: `${origin}/organizations/${orgId}/billing?success=true`,
      cancel_url: `${origin}/organizations/${orgId}/billing?canceled=true`,
      metadata: {
        orgId,
        userId: user.id,
        plan,
      },
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

