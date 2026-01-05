/**
 * Webhook delivery detail API (admin only)
 * GET /api/admin/webhooks/deliveries/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const { id } = await params

    const delivery = await prisma.orgWebhookDelivery.findFirst({
      where: {
        id,
        orgId: activeOrg.id, // Ensure org scoping
      },
      include: {
        webhook: {
          select: {
            id: true,
            url: true,
            events: true,
          },
        },
      },
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Parse payload JSON if present
    let payload = null
    if (delivery.payloadJson) {
      try {
        payload = JSON.parse(delivery.payloadJson)
      } catch (e) {
        payload = delivery.payloadJson
      }
    }

    return NextResponse.json({
      delivery: {
        ...delivery,
        payload,
      },
    })
  } catch (error: any) {
    console.error('Get webhook delivery error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get delivery' }, { status: 500 })
  }
}

