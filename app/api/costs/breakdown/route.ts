import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { getCostsBreakdown } from '@/lib/costs/query'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/costs' })
    const role = await getUserRole(activeOrg.id)

    const searchParams = request.nextUrl.searchParams
    const dimension = (searchParams.get('dimension') as 'users' | 'teams' | 'projects' | 'apps' | 'clients' | 'models') || 'users'
    const limit = parseInt(searchParams.get('limit') || '10')

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

    const breakdown = await getCostsBreakdown(filters, dimension, limit, userIdForRBAC)

    return NextResponse.json({ breakdown })
  } catch (error: any) {
    console.error('Error fetching costs breakdown:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}


