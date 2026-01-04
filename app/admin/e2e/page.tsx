import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserOrganizations } from '@/lib/organizations'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import E2EChecklistClient from '@/components/admin/e2e-checklist-client'

export default async function E2EPage() {
  const user = await requireAuth()
  
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard?error=admin_required')
  }

  const activeOrg = await getActiveOrganization(user.id)
  if (!activeOrg) {
    redirect('/dashboard')
  }

  // Check DB connectivity and migrations
  let dbOk = false
  try {
    await prisma.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }

  // Check directory
  const [apps, projects, clients, teams] = await Promise.all([
    prisma.app.findMany({ where: { orgId: activeOrg.id }, take: 1 }),
    prisma.project.findMany({ where: { orgId: activeOrg.id }, take: 1 }),
    prisma.client.findMany({ where: { orgId: activeOrg.id }, take: 1 }),
    prisma.team.findMany({ where: { orgId: activeOrg.id }, take: 1 }),
  ])

  const directoryOk = apps.length >= 1 && projects.length >= 1 && clients.length >= 1

  // Check budgets
  const budgets = await prisma.budget.findMany({
    where: { orgId: activeOrg.id, enabled: true },
    take: 1,
  })
  const budgetsOk = budgets.length >= 1

  // Check alert rules
  const alertRules = await prisma.alertRule.findMany({
    where: { orgId: activeOrg.id, enabled: true },
    take: 2,
  })
  const hasDailySpike = alertRules.some((r) => r.type === 'DAILY_SPIKE')
  const hasCurStale = alertRules.some((r) => r.type === 'CUR_STALE')
  const rulesOk = hasDailySpike && hasCurStale

  // Check cron endpoints (get last CronRun)
  const [lastAlerts, lastRetention, lastCur] = await Promise.all([
    prisma.cronRun.findFirst({
      where: { type: 'RUN_ALERTS' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.cronRun.findFirst({
      where: { type: 'APPLY_RETENTION' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.cronRun.findFirst({
      where: { type: 'SYNC_AWS_CUR' },
      orderBy: { startedAt: 'desc' },
    }),
  ])

  const cronAlertsOk = !!lastAlerts
  const cronRetentionOk = !!lastRetention
  const cronCurOk = !!lastCur

  // Check notifications preferences
  const notifications = await prisma.notificationPreference.findMany({
    where: { orgId: activeOrg.id },
    take: 1,
  })
  const notificationsOk = notifications.length >= 1

  const organizations = await getUserOrganizations(user.id)
  const isAdminUser = await isAdmin()

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <E2EChecklistClient
        initialChecks={{
          db: dbOk,
          directory: directoryOk,
          budgets: budgetsOk,
          rules: rulesOk,
          cronAlerts: cronAlertsOk,
          cronRetention: cronRetentionOk,
          cronCur: cronCurOk,
          notifications: notificationsOk,
        }}
        lastCronRuns={{
          alerts: lastAlerts,
          retention: lastRetention,
          cur: lastCur,
        }}
        organizationId={activeOrg.id}
      />
    </AppShell>
  )
}

