import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { canCreateAlerts } from '@/lib/auth/rbac'
import { computeActiveAlerts } from '@/lib/alerts/engine'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Check RBAC: admin, finance, manager can view all alerts
    // Users can view alerts but with limited scope (for now, allow all)
    const canView = await canCreateAlerts(activeOrg.id)
    if (!canView) {
      // For users, we could filter alerts by their scope, but for MVP allow all
      // return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const alerts = await computeActiveAlerts(activeOrg.id)

    return NextResponse.json({ alerts })
  } catch (error: any) {
    console.error('Get active alerts error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch alerts' }, { status: 500 })
  }
}

