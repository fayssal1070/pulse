import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { exportAiRequestLogsCsv } from '@/lib/governance/ai-logs'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/governance' })
    const role = await getUserRole(activeOrg.id)

    const searchParams = request.nextUrl.searchParams

    // Build filters
    const filters = {
      orgId: activeOrg.id,
      dateRange: (searchParams.get('dateRange') as any) || 'last30',
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      provider: searchParams.get('provider') || undefined,
      model: searchParams.get('model') || undefined,
      statusCode: (searchParams.get('statusCode') as any) || 'all',
      userId: searchParams.get('userId') || undefined,
      teamId: searchParams.get('teamId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      appId: searchParams.get('appId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      search: searchParams.get('search') || undefined,
    }

    // RBAC: users can only export their own logs
    const userIdForRBAC = role === 'user' ? user.id : undefined

    const csv = await exportAiRequestLogsCsv(filters, userIdForRBAC)

    const filename = `ai-logs-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting AI logs:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

