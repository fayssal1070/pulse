import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Check admin access
    const adminUser = await isAdmin()
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all organizations with alert stats
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
      },
    })

    const stats = await Promise.all(
      organizations.map(async (org) => {
        const [alertCount, lastEvent, recentEvents] = await Promise.all([
          prisma.alertRule.count({
            where: { orgId: org.id },
          }),
          prisma.alertEvent.findFirst({
            where: { orgId: org.id },
            orderBy: { triggeredAt: 'desc' },
            select: { triggeredAt: true },
          }),
          prisma.alertEvent.findMany({
            where: {
              orgId: org.id,
              triggeredAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
              },
            },
            orderBy: { triggeredAt: 'desc' },
            take: 10,
            select: {
              id: true,
              alertId: true,
              triggeredAt: true,
              amountEUR: true,
              message: true,
            },
          }),
        ])

        return {
          orgId: org.id,
          orgName: org.name,
          alertCount,
          lastRunAt: lastEvent?.triggeredAt || null,
          triggeredLast24h: recentEvents.length,
          recentEvents: recentEvents.map((e) => ({
            id: e.id,
            alertId: e.alertId,
            triggeredAt: e.triggeredAt,
            amountEUR: e.amountEUR,
            message: e.message,
          })),
        }
      })
    )

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalOrganizations: organizations.length,
      stats,
    })
  } catch (error) {
    console.error('Error fetching alert debug info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





