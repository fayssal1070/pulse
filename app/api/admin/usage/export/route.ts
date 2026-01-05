/**
 * Usage export endpoint - CSV export of CostEvents (admin/finance only)
 * GET /api/admin/usage/export?dateRange=...&provider=...
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

    // Allow admin or finance role
    try {
      await requireRole(activeOrg.id, 'admin')
    } catch {
      await requireRole(activeOrg.id, 'finance')
    }

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30d' // default 30 days
    const provider = searchParams.get('provider') || null

    // Parse date range
    const now = new Date()
    let startDate: Date
    if (dateRange.endsWith('d')) {
      const days = parseInt(dateRange.slice(0, -1))
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    } else if (dateRange.endsWith('m')) {
      const months = parseInt(dateRange.slice(0, -1))
      startDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // default 30 days
    }

    // Fetch cost events
    const costEvents = await prisma.costEvent.findMany({
      where: {
        orgId: activeOrg.id,
        source: 'AI',
        occurredAt: { gte: startDate },
        ...(provider ? { provider } : {}),
      },
      include: {
        team: { select: { name: true } },
        project: { select: { name: true } },
        app: { select: { name: true, slug: true } },
        client: { select: { name: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 10000, // Limit to 10k rows
    })

    // Fetch users for userId lookup
    const userIds = [...new Set(costEvents.map((e) => (e.dimensions as any)?.userId).filter(Boolean))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, email: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u.email]))

    // Generate CSV
    const headers = [
      'Date',
      'Provider',
      'Model',
      'Amount (EUR)',
      'Tokens',
      'Team',
      'Project',
      'App',
      'Client',
      'User',
    ]
    const rows = costEvents.map((event) => {
      const dims = (event.dimensions as any) || {}
      return [
        event.occurredAt.toISOString(),
        event.provider,
        dims.model || '',
        event.amountEur.toString(),
        event.quantity?.toString() || '',
        event.team?.name || '',
        event.project?.name || '',
        event.app?.name || '',
        event.client?.name || '',
        dims.userId ? userMap.get(dims.userId) || dims.userId : '',
      ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    })

    const csv = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="usage-export-${activeOrg.id}-${Date.now()}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Usage export error:', error)
    return NextResponse.json({ error: error.message || 'Failed to export usage' }, { status: 500 })
  }
}

