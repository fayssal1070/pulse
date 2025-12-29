import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { dispatchAlertsForOrg } from '@/lib/alerts/dispatch'

/**
 * Cron job to run alerts dispatch for all organizations
 * Runs every 2 hours
 * Protected by CRON_SECRET environment variable
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_RUN_ALERTS_AUTH_FAIL: CRON_SECRET not configured')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Strict auth: only accept Authorization: Bearer <CRON_SECRET>
  // Reject query params, other headers, etc.
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('CRON_RUN_ALERTS_AUTH_FAIL: Invalid or missing Authorization header')
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('CRON_RUN_ALERTS_AUTH_OK')

  const ranAt = new Date()
  let cronLogId: string | null = null

  try {
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
    let totalSentInApp = 0
    const allErrors: string[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalTriggered += result.value.triggered
        totalSentEmail += result.value.sentEmail
        totalSentTelegram += result.value.sentTelegram
        // Count InAppNotifications created (1 per triggered alert)
        totalSentInApp += result.value.triggered
        allErrors.push(...result.value.errors)
      } else {
        allErrors.push(result.reason?.message || 'Unknown error')
      }
    }

    const status = allErrors.length === 0 ? 'OK' : 'ERROR'

    // Insert proof log (always, even if no alerts)
    await prisma.cronRunLog.create({
      data: {
        cronName: 'run-alerts',
        ranAt,
        status,
        orgsProcessed: organizations.length,
        alertsTriggered: totalTriggered,
        sentEmail: totalSentEmail,
        sentTelegram: totalSentTelegram,
        sentInApp: totalSentInApp,
        errorCount: allErrors.length,
        errorSample: allErrors.length > 0 ? allErrors[0].substring(0, 500) : null,
      },
    })

    // Minimal server-side log (no secrets)
    console.log(`CRON_RUN_ALERTS_COMPLETED: ${organizations.length} orgs, ${totalTriggered} triggered, ${totalSentEmail} email, ${totalSentTelegram} telegram, ${totalSentInApp} in-app, ${allErrors.length} errors`)

    return NextResponse.json({
      message: `Alerts dispatch completed for ${organizations.length} organizations`,
      processedOrgs: organizations.length,
      triggered: totalTriggered,
      sentEmail: totalSentEmail,
      sentTelegram: totalSentTelegram,
      sentInApp: totalSentInApp,
      errorsCount: allErrors.length,
      errors: allErrors.slice(0, 10), // Limit errors in response
    })
  } catch (error: any) {
    // Insert proof log on error
    await prisma.cronRunLog.create({
      data: {
        cronName: 'run-alerts',
        ranAt,
        status: 'ERROR',
        orgsProcessed: 0,
        alertsTriggered: 0,
        sentEmail: 0,
        sentTelegram: 0,
        sentInApp: 0,
        errorCount: 1,
        errorSample: error.message?.substring(0, 500) || 'Unknown error',
      },
    }).catch(() => {}) // Ignore insert errors if DB fails

    console.error('CRON_RUN_ALERTS_ERROR:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to run alerts dispatch' },
      { status: 500 }
    )
  }
}

