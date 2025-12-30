import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/ops/cron-runs
 * Get cron run logs (admin only)
 * Query params: job (run-alerts|sync-aws-cur), limit (default 50)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const { searchParams } = new URL(request.url)
    const job = searchParams.get('job') || null
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: any = {}
    if (job && (job === 'run-alerts' || job === 'sync-aws-cur')) {
      where.cronName = job
    }

    const runs = await prisma.cronRunLog.findMany({
      where,
      orderBy: { ranAt: 'desc' },
      take: Math.min(limit, 100), // Max 100
    })

    return NextResponse.json({
      runs: runs.map((run) => ({
        id: run.id,
        cronName: run.cronName,
        ranAt: run.ranAt,
        status: run.status,
        orgsProcessed: run.orgsProcessed,
        alertsTriggered: run.alertsTriggered,
        sentEmail: run.sentEmail,
        sentTelegram: run.sentTelegram,
        sentInApp: run.sentInApp,
        durationMs: run.durationMs,
        errorCount: run.errorCount,
        errorSample: run.errorSample,
      })),
      count: runs.length,
    })
  } catch (error: any) {
    console.error('Error fetching cron runs:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch cron runs' }, { status: 500 })
  }
}

