import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin } from '@/lib/admin-helpers'
import { syncCurForOrg } from '@/lib/aws/cur'

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const isAdminUser = await isAdmin()

    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const orgId = body.orgId

    // If orgId provided, use it; otherwise use active org
    let targetOrgId = orgId
    if (!targetOrgId) {
      const activeOrg = await getActiveOrganization(user.id)
      if (!activeOrg) {
        return NextResponse.json({ error: 'No active organization' }, { status: 400 })
      }
      targetOrgId = activeOrg.id
    }

    const result = await syncCurForOrg(targetOrgId)

    return NextResponse.json({
      success: true,
      batchId: result.batchId,
      objectsProcessed: result.objectsProcessed,
      rowsParsed: result.rowsParsed,
      eventsUpserted: result.eventsUpserted,
      errorsCount: result.errorsCount,
      sampleError: result.sampleError,
    })
  } catch (error: any) {
    console.error('CUR sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync CUR' },
      { status: 500 }
    )
  }
}

