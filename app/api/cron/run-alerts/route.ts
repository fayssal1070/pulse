import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { dispatchAlertsForOrg } from '@/lib/alerts/dispatch'

/**
 * Cron job to run alerts dispatch for all organizations
 * Runs every 2 hours
 * Protected by hardcoded secret: Nordic-1987-1070-1990
 */
const CRON_SECRET = 'Nordic-1987-1070-1990'

export async function POST(request: Request) {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  // Strict auth: only accept exact Bearer token
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('[Cron run-alerts] Unauthorized attempt')
    return new Response('Unauthorized', { status: 401 })
  }

  const startedAt = new Date()
  let cronLogId: string | null = null

  try {
    // Create cron log entry
    const cronLog = await prisma.cronRunLog.create({
      data: {
        cronName: 'run-alerts',
        startedAt,
        processedOrgs: 0,
        triggered: 0,
        sentEmail: 0,
        sentTelegram: 0,
        errorsCount: 0,
        success: true,
      },
    })
    cronLogId = cronLog.id

    // Get all active organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    })

    const results = await Promise.allSettled(
      organizations.map((org) => dispatchAlertsForOrg(org.id))
    )

    // Aggregate results
    let totalTriggered = 0
    let totalSentEmail = 0
    let totalSentTelegram = 0
    const allErrors: string[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalTriggered += result.value.triggered
        totalSentEmail += result.value.sentEmail
        totalSentTelegram += result.value.sentTelegram
        allErrors.push(...result.value.errors)
      } else {
        allErrors.push(result.reason?.message || 'Unknown error')
      }
    }

    const finishedAt = new Date()
    const success = allErrors.length === 0

    // Update cron log
    await prisma.cronRunLog.update({
      where: { id: cronLogId },
      data: {
        finishedAt,
        processedOrgs: organizations.length,
        triggered: totalTriggered,
        sentEmail: totalSentEmail,
        sentTelegram: totalSentTelegram,
        errorsCount: allErrors.length,
        lastError: allErrors.length > 0 ? allErrors[0].substring(0, 500) : null,
        success,
      },
    })

    // Minimal server-side log (no secrets)
    console.log(`[Cron run-alerts] Completed: ${organizations.length} orgs, ${totalTriggered} triggered, ${totalSentEmail} email, ${totalSentTelegram} telegram, ${allErrors.length} errors`)

    return NextResponse.json({
      message: `Alerts dispatch completed for ${organizations.length} organizations`,
      processedOrgs: organizations.length,
      triggered: totalTriggered,
      sentEmail: totalSentEmail,
      sentTelegram: totalSentTelegram,
      errorsCount: allErrors.length,
      errors: allErrors.slice(0, 10), // Limit errors in response
    })
  } catch (error: any) {
    // Update cron log on error
    if (cronLogId) {
      await prisma.cronRunLog.update({
        where: { id: cronLogId },
        data: {
          finishedAt: new Date(),
          lastError: error.message?.substring(0, 500) || 'Unknown error',
          success: false,
        },
      }).catch(() => {}) // Ignore update errors
    }

    console.error('[Cron run-alerts] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to run alerts dispatch' },
      { status: 500 }
    )
  }
}

