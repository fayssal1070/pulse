/**
 * GET /api/usage/timeseries?dimension=app|provider|user|project&id=...&days=7|30
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin, isFinance, isManager } from '@/lib/admin-helpers'
import { getUsageTimeseries } from '@/lib/usage/query'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const dimension = searchParams.get('dimension') as 'app' | 'provider' | 'user' | 'project'
    const id = searchParams.get('id')
    const days = parseInt(searchParams.get('days') || '7')

    if (!dimension || !['app', 'provider', 'user', 'project'].includes(dimension)) {
      return NextResponse.json({ error: 'Invalid dimension' }, { status: 400 })
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    if (days !== 7 && days !== 30) {
      return NextResponse.json({ error: 'days must be 7 or 30' }, { status: 400 })
    }

    // RBAC
    const isAdminUser = await isAdmin()
    const isFinanceUser = await isFinance()
    const isManagerUser = await isManager()
    const userId = isAdminUser || isFinanceUser || isManagerUser ? undefined : user.id

    const timeseries = await getUsageTimeseries(activeOrg.id, dimension, id, days, userId)

    return NextResponse.json(timeseries)
  } catch (error: any) {
    console.error('Usage timeseries error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get usage timeseries' }, { status: 500 })
  }
}

