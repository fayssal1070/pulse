import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { dispatchAlertsForOrg } from '@/lib/alerts/dispatch'
import { dispatchRulesForOrg } from '@/lib/alerts/dispatch-rules'

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
  const startTime = Date.now()

  // Create CronRun log entry
  let cronRunId: string | null = null
  try {
    const cronRun = await prisma.cronRun.create({
      data: {
        type: 'RUN_ALERTS',
        status: 'FAIL', // Will update to SUCCESS on completion
        startedAt: ranAt,
      },
    })
    cronRunId = cronRun.id
  } catch (error) {
    // Never fail the cron response if logging fails
    console.error('Failed to create CronRun log:', error)
  }

  try {
    // Get all active organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    })

    // Dispatch both budget alerts (PR5) and rule-based alerts (PR9)
    const budgetResults = await Promise.allSettled(
      organizations.map((org) => dispatchAlertsForOrg(org.id))
    )

    const rulesResults = await Promise.allSettled(
      organizations.map((org) => dispatchRulesForOrg(org.id))
    )

    // Aggregate results
    let totalTriggered = 0
    let totalSentEmail = 0
    let totalSentTelegram = 0
    let totalSentInApp = 0
    const allErrors: string[] = []

    // Process budget alerts
    for (const result of budgetResults) {
      if (result.status === 'fulfilled') {
        totalTriggered += result.value.triggered
        totalSentEmail += result.value.sentEmail
        totalSentTelegram += result.value.sentTelegram
        totalSentInApp += result.value.triggered
        allErrors.push(...result.value.errors)
      } else {
        allErrors.push(`Budget alerts: ${result.reason?.message || 'Unknown error'}`)
      }
    }

    // Process rule-based alerts
    for (const result of rulesResults) {
      if (result.status === 'fulfilled') {
        totalTriggered += result.value.triggered
        totalSentEmail += result.value.sentEmail
        totalSentTelegram += result.value.sentTelegram
        totalSentInApp += result.value.triggered
        allErrors.push(...result.value.errors)
      } else {
        allErrors.push(`Rule alerts: ${result.reason?.message || 'Unknown error'}`)
      }
    }

    const status = allErrors.length === 0 ? 'OK' : 'ERROR'
    const durationMs = Date.now() - startTime
    const finishedAt = new Date()

    // Update CronRun log
    if (cronRunId) {
      try {
        await prisma.cronRun.update({
          where: { id: cronRunId },
          data: {
            status: allErrors.length === 0 ? 'SUCCESS' : 'FAIL',
            finishedAt,
            error: allErrors.length > 0 ? allErrors[0].substring(0, 1000) : null,
            metaJson: JSON.stringify({
              orgsProcessed: organizations.length,
              triggered: totalTriggered,
              sentEmail: totalSentEmail,
              sentTelegram: totalSentTelegram,
              sentInApp: totalSentInApp,
              durationMs,
              errorsCount: allErrors.length,
            }),
          },
        })
      } catch (error) {
        // Never fail the cron response if logging fails
        console.error('Failed to update CronRun log:', error)
      }
    }

    // Insert proof log (always, even if no alerts) - keep existing CronRunLog for backward compatibility
    try {
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
          durationMs,
          errorCount: allErrors.length,
          errorSample: allErrors.length > 0 ? allErrors[0].substring(0, 500) : null,
        },
      })
    } catch (error) {
      // Never fail the cron response if logging fails
      console.error('Failed to create CronRunLog:', error)
    }

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
    const durationMs = Date.now() - startTime
    const finishedAt = new Date()

    // Update CronRun log on error
    if (cronRunId) {
      try {
        await prisma.cronRun.update({
          where: { id: cronRunId },
          data: {
            status: 'FAIL',
            finishedAt,
            error: error.message?.substring(0, 1000) || 'Unknown error',
            metaJson: JSON.stringify({ durationMs }),
          },
        })
      } catch (logError) {
        // Never fail the cron response if logging fails
        console.error('Failed to update CronRun log on error:', logError)
      }
    }

    // Insert proof log on error - keep existing CronRunLog for backward compatibility
    try {
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
          durationMs,
          errorCount: 1,
          errorSample: error.message?.substring(0, 500) || 'Unknown error',
        },
      })
    } catch (logError) {
      // Ignore insert errors if DB fails
      console.error('Failed to create CronRunLog on error:', logError)
    }

    console.error('CRON_RUN_ALERTS_ERROR:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to run alerts dispatch' },
      { status: 500 }
    )
  }
}

