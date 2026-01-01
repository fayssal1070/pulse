import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { getCostEvents } from '@/lib/costs/query'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/costs' })
    const role = await getUserRole(activeOrg.id)

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const orderBy = (searchParams.get('orderBy') as 'occurredAt' | 'amountEur') || 'occurredAt'
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc'

    // Build filters
    const filters = {
      orgId: activeOrg.id,
      dateRange: (searchParams.get('dateRange') as any) || 'last30',
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      provider: (searchParams.get('provider') as any) || 'ALL',
      model: searchParams.get('model') || undefined,
      userId: searchParams.get('userId') || undefined,
      teamId: searchParams.get('teamId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      appId: searchParams.get('appId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      search: searchParams.get('search') || undefined,
    }

    // RBAC: users can only see their own costs
    const userIdForRBAC = role === 'user' ? user.id : undefined

    const { events, totalCount } = await getCostEvents(filters, page, pageSize, orderBy, order, userIdForRBAC)

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        occurredAt: e.occurredAt.toISOString(),
        rawRef: e.rawRef,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching cost events:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


