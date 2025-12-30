import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const role = await getUserRole(activeOrg.id)
    const searchParams = request.nextUrl.searchParams

    // Build where clause (same as /api/logs/ai)
    const where: any = {
      orgId: activeOrg.id,
    }

    if (role === 'user') {
      where.userId = user.id
    }

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const model = searchParams.get('model')
    const status = searchParams.get('status')

    if (startDate) where.occurredAt = { ...where.occurredAt, gte: new Date(startDate) }
    if (endDate) where.occurredAt = { ...where.occurredAt, lte: new Date(endDate) }
    if (model) where.model = model
    if (status === 'success') where.statusCode = 200
    if (status === 'error') where.statusCode = { not: 200 }
    if (status === 'blocked') where.statusCode = 403

    const logs = await prisma.aiRequestLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 10000, // Limit exports to 10k rows
    })

    // Generate CSV
    const headers = [
      'Date',
      'User ID',
      'Team ID',
      'Project ID',
      'App ID',
      'Client ID',
      'Provider',
      'Model',
      'Input Tokens',
      'Output Tokens',
      'Total Tokens',
      'Cost (EUR)',
      'Latency (ms)',
      'Status Code',
      'Prompt Hash',
    ]

    const rows = logs.map((log) => [
      log.occurredAt.toISOString(),
      log.userId || '',
      log.teamId || '',
      log.projectId || '',
      log.appId || '',
      log.clientId || '',
      log.provider || '',
      log.model || '',
      log.inputTokens?.toString() || '0',
      log.outputTokens?.toString() || '0',
      log.totalTokens?.toString() || '0',
      log.estimatedCostEur ? Number(log.estimatedCostEur).toFixed(4) : '0',
      log.latencyMs?.toString() || '0',
      log.statusCode?.toString() || '',
      log.promptHash || '',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ai-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting AI logs:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

