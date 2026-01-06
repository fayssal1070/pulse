/**
 * Admin API for viewing notification deliveries
 * GET /api/admin/notifications/deliveries
 * Admin only
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
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const limit = parseInt(searchParams.get('limit') || '200')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: any = {
      orgId: activeOrg.id,
    }

    if (status) {
      whereClause.status = status
    }
    if (channel) {
      whereClause.channel = channel
    }

    const [deliveries, total] = await prisma.$transaction([
      prisma.notificationDelivery.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notificationDelivery.count({ where: whereClause }),
    ])

    return NextResponse.json({ deliveries, total })
  } catch (error: any) {
    console.error('Get notification deliveries error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get deliveries' }, { status: 500 })
  }
}

