import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/cron/status
 * Get cron execution status (admin only)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole('admin', activeOrg.id)

    // Get last run for run-alerts cron
    const lastRun = await prisma.cronRunLog.findFirst({
      where: { cronName: 'run-alerts' },
      orderBy: { ranAt: 'desc' },
    })

    // Calculate next expected run (every 2 hours)
    let nextExpectedRunHint: string | null = null
    if (lastRun?.ranAt) {
      const nextRun = new Date(lastRun.ranAt)
      nextRun.setHours(nextRun.getHours() + 2)
      nextExpectedRunHint = nextRun.toISOString()
    }

    return NextResponse.json({
      cronName: 'run-alerts',
      lastRun: lastRun
        ? {
            id: lastRun.id,
            ranAt: lastRun.ranAt,
            status: lastRun.status,
            orgsProcessed: lastRun.orgsProcessed,
            alertsTriggered: lastRun.alertsTriggered,
            sentEmail: lastRun.sentEmail,
            sentTelegram: lastRun.sentTelegram,
            sentInApp: lastRun.sentInApp,
            errorCount: lastRun.errorCount,
            errorSample: lastRun.errorSample,
          }
        : null,
      nextExpectedRunHint,
    })
  } catch (error: any) {
    console.error('Error fetching cron status:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch cron status' }, { status: 500 })
  }
}

