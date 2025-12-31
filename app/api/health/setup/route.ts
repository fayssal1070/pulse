import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Fetch org with CUR fields
    const orgWithCur = await prisma.organization.findUnique({
      where: { id: activeOrg.id },
      select: {
        awsCurEnabled: true,
        awsCurBucket: true,
        aiGatewayEnabled: true,
      },
    })

    // Check AWS CUR
    const awsCurConfigured = orgWithCur?.awsCurEnabled && !!orgWithCur?.awsCurBucket
    const lastCurBatch = await prisma.ingestionBatch.findFirst({
      where: { orgId: activeOrg.id },
      orderBy: { finishedAt: 'desc' },
      select: { finishedAt: true, status: true },
    })
    const lastCurSyncAt = lastCurBatch?.finishedAt || null
    const curHealthy = lastCurBatch && lastCurBatch.status === 'SUCCESS' && lastCurBatch.finishedAt
      ? Date.now() - lastCurBatch.finishedAt.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
      : false

    // Check AI Gateway
    const aiGatewayConfigured = !!process.env.OPENAI_API_KEY || orgWithCur?.aiGatewayEnabled || false
    const hasAiPolicies = await prisma.aiPolicy.count({
      where: { orgId: activeOrg.id, enabled: true },
    }) > 0
    const hasTestRequest = await prisma.aiRequestLog.count({
      where: { orgId: activeOrg.id, statusCode: 200 },
      take: 1,
    }) > 0

    // Check Budgets
    const budgetsCount = await prisma.budget.count({
      where: { orgId: activeOrg.id, enabled: true },
    })
    const budgetsCreated = budgetsCount > 0

    // Check Notifications
    const notificationPrefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
      select: { emailEnabled: true, telegramEnabled: true },
    })
    const notificationsConfigured = !!notificationPrefs && (notificationPrefs.emailEnabled || notificationPrefs.telegramEnabled)

    // Check Cron health
    const lastCronRun = await prisma.cronRunLog.findFirst({
      where: { cronName: 'run-alerts' },
      orderBy: { ranAt: 'desc' },
      select: { ranAt: true, status: true },
    })
    const cronHealthy = lastCronRun && lastCronRun.status === 'OK' && lastCronRun.ranAt
      ? Date.now() - lastCronRun.ranAt.getTime() < 4 * 60 * 60 * 1000 // 4 hours
      : false

    return NextResponse.json({
      awsCur: {
        configured: awsCurConfigured,
        lastSyncAt: lastCurSyncAt?.toISOString() || null,
        healthy: curHealthy,
      },
      aiGateway: {
        configured: aiGatewayConfigured,
        hasPolicies: hasAiPolicies,
        hasTestRequest,
      },
      budgets: {
        created: budgetsCreated,
        count: budgetsCount,
      },
      notifications: {
        configured: notificationsConfigured,
      },
      cron: {
        healthy: cronHealthy,
        lastRunAt: lastCronRun?.ranAt.toISOString() || null,
      },
    })
  } catch (error: any) {
    console.error('Error checking setup health:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

