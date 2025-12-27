import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById, isOrganizationOwner } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      )
    }

    // Verify user is owner
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
      },
    })

    if (!orgWithStripe || !orgWithStripe.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const origin = new URL(baseUrl).origin

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: orgWithStripe.stripeCustomerId,
      return_url: `${origin}/organizations/${orgId}/billing`,
    })

    return NextResponse.json({ portalUrl: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

