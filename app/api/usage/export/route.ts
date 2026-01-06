/**
 * GET /api/usage/export?startDate=...&endDate=...&format=csv
 * Returns CSV export of usage data
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin, isFinance, isManager } from '@/lib/admin-helpers'
import { getUsageExport } from '@/lib/usage/query'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // RBAC: Only admin/finance can export
    const isAdminUser = await isAdmin()
    const isFinanceUser = await isFinance()
    if (!isAdminUser && !isFinanceUser) {
      return NextResponse.json({ error: 'Admin or finance access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const dateRange = searchParams.get('dateRange') || 'mtd'
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

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

    const exportData = await getUsageExport(activeOrg.id, startDate, endDate)

    // Convert to CSV
    const headers = ['Date', 'App', 'Project', 'Client', 'Team', 'Provider', 'AmountEUR', 'UserEmail', 'Source', 'RawRef']
    const csvRows = [
      headers.join(','),
      ...exportData.map((row) =>
        [
          row.date,
          `"${row.app.replace(/"/g, '""')}"`,
          `"${row.project.replace(/"/g, '""')}"`,
          `"${row.client.replace(/"/g, '""')}"`,
          `"${row.team.replace(/"/g, '""')}"`,
          row.provider,
          row.amountEUR.toFixed(4),
          row.userEmail ? `"${row.userEmail.replace(/"/g, '""')}"` : '',
          row.source,
          row.rawRef ? `"${row.rawRef.replace(/"/g, '""')}"` : '',
        ].join(',')
      ),
    ]

    const csv = csvRows.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pulse-usage-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Usage export error:', error)
    return NextResponse.json({ error: error.message || 'Failed to export usage data' }, { status: 500 })
  }
}

