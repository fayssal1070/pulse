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
      orderBy: { startedAt: 'desc' },
    })

    // Calculate next expected run (every 2 hours)
    let nextExpectedRunHint: string | null = null
    if (lastRun?.startedAt) {
      const nextRun = new Date(lastRun.startedAt)
      nextRun.setHours(nextRun.getHours() + 2)
      nextExpectedRunHint = nextRun.toISOString()
    }

    return NextResponse.json({
      cronName: 'run-alerts',
      lastRunAt: lastRun?.startedAt || null,
      lastRunSummary: lastRun
        ? {
            processedOrgs: lastRun.processedOrgs,
            triggered: lastRun.triggered,
            sentEmail: lastRun.sentEmail,
            sentTelegram: lastRun.sentTelegram,
            errorsCount: lastRun.errorsCount,
            success: lastRun.success,
            finishedAt: lastRun.finishedAt,
          }
        : null,
      lastError: lastRun?.lastError || null,
      nextExpectedRunHint,
    })
  } catch (error: any) {
    console.error('Error fetching cron status:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch cron status' }, { status: 500 })
  }
}

