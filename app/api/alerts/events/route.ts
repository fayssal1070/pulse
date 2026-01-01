import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/alerts' })
    const role = await getUserRole(activeOrg.id)

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const dateRange = searchParams.get('dateRange') || 'last30'
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    // Build date range
    let endDate = new Date()
    let startDate = new Date()

    if (dateRange === 'last7') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (dateRange === 'last30') {
      startDate.setDate(startDate.getDate() - 30)
    } else if (dateRange === 'mtd') {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    } else if (dateRange === 'custom') {
      const customStart = searchParams.get('startDate')
      const customEnd = searchParams.get('endDate')
      if (customStart) startDate = new Date(customStart)
      if (customEnd) endDate = new Date(customEnd)
    }

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    // Build where clause
    const where: any = {
      orgId: activeOrg.id,
      triggeredAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    // RBAC: users can only see events that concern them (if rule has user scope in metadata)
    // For now, users see all events (could be enhanced to filter by metadata.userId)
    // Admin/finance/manager see all events

    if (severity) {
      where.severity = severity
    }

    if (type) {
      where.alertRule = {
        type,
      }
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { alertRule: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Get events with pagination
    const [events, totalCount] = await Promise.all([
      prisma.alertEvent.findMany({
        where,
        include: {
          alertRule: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { triggeredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.alertEvent.count({ where }),
    ])

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        triggeredAt: e.triggeredAt.toISOString(),
        periodStart: e.periodStart.toISOString(),
        periodEnd: e.periodEnd.toISOString(),
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching alert events:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

