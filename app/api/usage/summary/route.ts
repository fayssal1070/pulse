/**
 * GET /api/usage/summary
 * Returns usage summary KPIs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin, isFinance, isManager } from '@/lib/admin-helpers'
import { getUsageSummary } from '@/lib/usage/query'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // RBAC: admin/finance/manager see org-wide, user sees only their own
    const isAdminUser = await isAdmin()
    const isFinanceUser = await isFinance()
    const isManagerUser = await isManager()
    const userId = isAdminUser || isFinanceUser || isManagerUser ? undefined : user.id

    const summary = await getUsageSummary(activeOrg.id, userId)

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('Usage summary error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get usage summary' }, { status: 500 })
  }
}

