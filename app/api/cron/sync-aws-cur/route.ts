import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { syncCurForOrg } from '@/lib/aws/cur'

export async function POST(request: Request) {
  // Verify CRON_SECRET
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  // Strict auth: only accept Authorization: Bearer <CRON_SECRET>
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('CRON_SYNC_CUR_AUTH_FAIL: Invalid or missing Authorization header')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('CRON_SYNC_CUR_AUTH_OK')

  const ranAt = new Date()
  const startTime = Date.now()

  try {
    // Get all orgs with CUR enabled
    const orgs = await prisma.organization.findMany({
      where: {
        awsCurEnabled: true,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const results = []
    let totalEventsUpserted = 0
    let totalErrors = 0
    const allErrors: string[] = []

    for (const org of orgs) {
      try {
        const result = await syncCurForOrg(org.id)
        results.push({
          orgId: org.id,
          orgName: org.name,
          success: true,
          batchId: result.batchId,
          eventsUpserted: result.eventsUpserted,
          errorsCount: result.errorsCount,
        })
        totalEventsUpserted += result.eventsUpserted
        totalErrors += result.errorsCount
        if (result.sampleError) {
          allErrors.push(result.sampleError)
        }
      } catch (error: any) {
        results.push({
          orgId: org.id,
          orgName: org.name,
          success: false,
          error: error.message,
        })
        totalErrors++
        allErrors.push(error.message || 'Unknown error')
      }
    }

    const status = allErrors.length === 0 ? 'OK' : 'ERROR'
    const durationMs = Date.now() - startTime

    // Insert proof log (always, even if no orgs)
    await prisma.cronRunLog.create({
      data: {
        cronName: 'sync-aws-cur',
        ranAt,
        status,
        orgsProcessed: orgs.length,
        alertsTriggered: 0,
        sentEmail: 0,
        sentTelegram: 0,
        sentInApp: 0,
        durationMs,
        errorCount: totalErrors,
        errorSample: allErrors.length > 0 ? allErrors[0].substring(0, 500) : null,
      },
    })

    console.log(`CRON_SYNC_CUR_COMPLETED: ${orgs.length} orgs, ${totalEventsUpserted} events, ${totalErrors} errors`)

    return NextResponse.json({
      success: true,
      orgsProcessed: orgs.length,
      eventsUpserted: totalEventsUpserted,
      errorsCount: totalErrors,
      results,
    })
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    // Insert proof log on error
    await prisma.cronRunLog.create({
      data: {
        cronName: 'sync-aws-cur',
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
    }).catch(() => {}) // Ignore insert errors if DB fails

    console.error('CRON_SYNC_CUR_ERROR:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to sync CUR' }, { status: 500 })
  }
}

