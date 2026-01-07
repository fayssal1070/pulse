import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { exportCostEventsCsv } from '@/lib/costs/query'
import { getOrgPlan, getEntitlements, assertEntitlement, EntitlementError } from '@/lib/billing/entitlements'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/costs' })
    const role = await getUserRole(activeOrg.id)

    const searchParams = request.nextUrl.searchParams

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

    // Check entitlements: costs export
    try {
      const plan = await getOrgPlan(activeOrg.id)
      const entitlements = getEntitlements(plan)
      assertEntitlement(entitlements, 'costs_export')
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

    // RBAC: users can only export their own costs
    const userIdForRBAC = role === 'user' ? user.id : undefined

    const csv = await exportCostEventsCsv(filters, userIdForRBAC)

    const filename = `cost-events-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting cost events:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}




