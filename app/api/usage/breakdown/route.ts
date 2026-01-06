/**
 * GET /api/usage/breakdown?dimension=app|provider|user|project&startDate=...&endDate=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin, isFinance, isManager } from '@/lib/admin-helpers'
import { getUsageBreakdown } from '@/lib/usage/query'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const dimension = searchParams.get('dimension') as 'app' | 'provider' | 'user' | 'project'
    const dateRange = searchParams.get('dateRange') || 'mtd'
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!dimension || !['app', 'provider', 'user', 'project'].includes(dimension)) {
      return NextResponse.json({ error: 'Invalid dimension. Must be app, provider, user, or project' }, { status: 400 })
    }

    // Calculate date range
    let startDate: Date
    let endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr)
      endDate = new Date(endDateStr)
      endDate.setHours(23, 59, 59, 999)
    } else {
      switch (dateRange) {
        case '7d':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 30)
          break
        case 'mtd':
          startDate = new Date()
          startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
          break
        case 'lastMonth':
          startDate = new Date()
          startDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
          endDate.setHours(23, 59, 59, 999)
          break
        default:
          startDate = new Date()
          startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      }
    }

    startDate.setHours(0, 0, 0, 0)

    // RBAC
    const isAdminUser = await isAdmin()
    const isFinanceUser = await isFinance()
    const isManagerUser = await isManager()
    const userId = isAdminUser || isFinanceUser || isManagerUser ? undefined : user.id

    const breakdown = await getUsageBreakdown(activeOrg.id, dimension, startDate, endDate, userId)

    return NextResponse.json(breakdown)
  } catch (error: any) {
    console.error('Usage breakdown error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get usage breakdown' }, { status: 500 })
  }
}

