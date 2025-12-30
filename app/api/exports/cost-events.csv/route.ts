import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const role = await getUserRole(activeOrg.id)
    const searchParams = request.nextUrl.searchParams

    // Build where clause (same as /api/costs)
    const where: any = {
      orgId: activeOrg.id,
    }

    const source = searchParams.get('source')
    const provider = searchParams.get('provider')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (source) where.source = source
    if (provider) where.provider = provider
    if (startDate) where.occurredAt = { ...where.occurredAt, gte: new Date(startDate) }
    if (endDate) where.occurredAt = { ...where.occurredAt, lte: new Date(endDate) }

    let events = await prisma.costEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 10000, // Limit exports to 10k rows
    })

    // RBAC: users can only export their own costs
    if (role === 'user') {
      events = events.filter((e) => {
        const dims = (e.dimensions as any) || {}
        return dims.userId === user.id
      })
    }

    // Generate CSV
    const headers = [
      'Date',
      'Source',
      'Provider',
      'Service',
      'Model',
      'Amount (EUR)',
      'Amount (USD)',
      'Currency',
      'User ID',
      'Team ID',
      'Project ID',
      'App ID',
      'Client ID',
      'Category',
    ]

    const rows = events.map((e) => {
      const dims = (e.dimensions as any) || {}
      return [
        e.occurredAt.toISOString(),
        e.source,
        e.provider || '',
        e.service || '',
        dims.model || '',
        Number(e.amountEur).toFixed(4),
        e.amountUsd ? Number(e.amountUsd).toFixed(4) : '',
        e.currency,
        dims.userId || '',
        dims.teamId || '',
        dims.projectId || '',
        dims.appId || '',
        dims.clientId || '',
        e.costCategory || '',
      ]
    })

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="cost-events-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting cost events:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

