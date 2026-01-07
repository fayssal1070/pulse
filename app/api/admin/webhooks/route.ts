/**
 * Webhooks API - CRUD operations (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'
import { encryptWebhookSecret } from '@/lib/webhooks/crypto'
import { getOrgPlan, getEntitlements, assertEntitlement, EntitlementError } from '@/lib/billing/entitlements'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const webhooks = await prisma.orgWebhook.findMany({
      where: { orgId: activeOrg.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        enabled: true,
        events: true,
        createdAt: true,
        updatedAt: true,
        // Never return secret
      },
    })

    return NextResponse.json({ webhooks })
  } catch (error: any) {
    console.error('Get webhooks error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get webhooks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const body = await request.json()
    const { url, events, enabled = true } = body

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'url and events (array) are required' },
        { status: 400 }
      )
    }

    // Check entitlements: webhooks
    try {
      const plan = await getOrgPlan(activeOrg.id)
      const entitlements = getEntitlements(plan)
      assertEntitlement(entitlements, 'webhooks')
    } catch (error: any) {
      if (error instanceof EntitlementError) {
        const plan = await getOrgPlan(activeOrg.id)
        return NextResponse.json(
          {
            ok: false,
            code: 'upgrade_required',
            feature: error.feature,
            plan,
            required: error.requiredPlan,
            message: error.message,
          },
          { status: 403 }
        )
      }
      throw error
    }

    // Generate secret (32 bytes, hex) and encrypt
    const plainSecret = randomBytes(32).toString('hex')
    const { secretEnc, secretHash } = encryptWebhookSecret(plainSecret)

    const webhook = await prisma.orgWebhook.create({
      data: {
        orgId: activeOrg.id,
        url,
        secretEnc,
        secretHash,
        events,
        enabled: enabled !== false,
      },
      select: {
        id: true,
        url: true,
        enabled: true,
        events: true,
        createdAt: true,
        // Never return secret
      },
    })

    return NextResponse.json({ webhook })
  } catch (error: any) {
    console.error('Create webhook error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create webhook' }, { status: 500 })
  }
}

