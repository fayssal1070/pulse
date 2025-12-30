import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/ops/overview
 * Get operations overview (admin only)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    // Build info
    const buildInfo = {
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      commitShaShort: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').substring(0, 7),
      env: process.env.VERCEL_ENV || 'local',
      buildTimestamp: new Date().toISOString(),
      vercelUrl: process.env.VERCEL_URL || null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    }

    // Last cron runs
    const lastCronRunAlerts = await prisma.cronRunLog.findFirst({
      where: { cronName: 'run-alerts' },
      orderBy: { ranAt: 'desc' },
    })

    const lastCronRunCur = await prisma.cronRunLog.findFirst({
      where: { cronName: 'sync-aws-cur' },
      orderBy: { ranAt: 'desc' },
    })

    // Last CUR batch
    const lastCurBatch = await prisma.ingestionBatch.findFirst({
      where: { orgId: activeOrg.id },
      orderBy: { startedAt: 'desc' },
    })

    // Quick counts
    const notificationsUnread = await prisma.inAppNotification.count({
      where: {
        orgId: activeOrg.id,
        readAt: null,
      },
    })

    const budgetsCount = await prisma.budget.count({
      where: { orgId: activeOrg.id },
    })

    const alertRulesCount = await prisma.alertRule.count({
      where: { orgId: activeOrg.id },
    })

    return NextResponse.json({
      buildInfo,
      lastCronRunAlerts: lastCronRunAlerts
        ? {
            id: lastCronRunAlerts.id,
            ranAt: lastCronRunAlerts.ranAt,
            status: lastCronRunAlerts.status,
            orgsProcessed: lastCronRunAlerts.orgsProcessed,
            alertsTriggered: lastCronRunAlerts.alertsTriggered,
            sentEmail: lastCronRunAlerts.sentEmail,
            sentTelegram: lastCronRunAlerts.sentTelegram,
            sentInApp: lastCronRunAlerts.sentInApp,
            durationMs: lastCronRunAlerts.durationMs,
            errorCount: lastCronRunAlerts.errorCount,
            errorSample: lastCronRunAlerts.errorSample,
          }
        : null,
      lastCronRunCur: lastCronRunCur
        ? {
            id: lastCronRunCur.id,
            ranAt: lastCronRunCur.ranAt,
            status: lastCronRunCur.status,
            orgsProcessed: lastCronRunCur.orgsProcessed,
            durationMs: lastCronRunCur.durationMs,
            errorCount: lastCronRunCur.errorCount,
            errorSample: lastCronRunCur.errorSample,
          }
        : null,
      lastCurBatch: lastCurBatch
        ? {
            id: lastCurBatch.id,
            startedAt: lastCurBatch.startedAt,
            finishedAt: lastCurBatch.finishedAt,
            status: lastCurBatch.status,
            objectsProcessed: lastCurBatch.objectsProcessed,
            rowsParsed: lastCurBatch.rowsParsed,
            eventsUpserted: lastCurBatch.eventsUpserted,
            errorsCount: lastCurBatch.errorsCount,
            sampleError: lastCurBatch.sampleError,
          }
        : null,
      counts: {
        notificationsUnread,
        budgetsCount,
        alertRulesCount,
      },
    })
  } catch (error: any) {
    console.error('Error fetching ops overview:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch ops overview' }, { status: 500 })
  }
}

