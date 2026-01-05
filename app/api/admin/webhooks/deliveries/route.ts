/**
 * Webhook deliveries API (admin only)
 * GET /api/admin/webhooks/deliveries
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('webhookId') || undefined
    const eventType = searchParams.get('eventType') || undefined
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const deliveries = await prisma.orgWebhookDelivery.findMany({
      where: {
        orgId: activeOrg.id,
        ...(webhookId ? { webhookId } : {}),
        ...(eventType ? { eventType } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 1000),
      skip: offset,
      select: {
        id: true,
        webhookId: true,
        eventType: true,
        status: true,
        attempt: true,
        httpStatus: true,
        error: true,
        requestId: true,
        deliveredAt: true,
        createdAt: true,
        durationMs: true,
        // Don't return payloadJson in list (too large)
      },
    })

    const total = await prisma.orgWebhookDelivery.count({
      where: {
        orgId: activeOrg.id,
        ...(webhookId ? { webhookId } : {}),
        ...(eventType ? { eventType } : {}),
        ...(status ? { status } : {}),
      },
    })

    return NextResponse.json({
      deliveries,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Get webhook deliveries error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get deliveries' }, { status: 500 })
  }
}

