/**
 * GET /api/billing/seats
 * Get seat usage information for current organization
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { getOrgPlan, getSeatLimit } from '@/lib/billing/entitlements'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrgBasic = await getActiveOrganization(user.id)
    
    if (!activeOrgBasic) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Fetch full organization with seat fields
    const activeOrg = await prisma.organization.findUnique({
      where: { id: activeOrgBasic.id },
      select: {
        id: true,
        plan: true,
        seatLimit: true,
        seatEnforcement: true,
      },
    })

    if (!activeOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get effective plan and seat limit
    const plan = await getOrgPlan(activeOrg.id)
    const limit = activeOrg.seatLimit || getSeatLimit(plan)

    // Count active memberships
    const used = await prisma.membership.count({
      where: {
        orgId: activeOrg.id,
        status: 'active',
      },
    })

    return NextResponse.json({
      used,
      limit,
      available: Math.max(0, limit - used),
      enforcement: activeOrg.seatEnforcement,
    })
  } catch (error: any) {
    console.error('Error fetching seat info:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

