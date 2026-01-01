import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

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
    console.warn('CRON_APPLY_RETENTION_AUTH_FAIL: Invalid or missing Authorization header')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('CRON_APPLY_RETENTION_AUTH_OK')

  const ranAt = new Date()
  const startTime = Date.now()

  try {
    // Get all organizations with their retention settings
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        aiLogRetentionDays: true,
      },
    })

    let totalDeleted = 0
    const results = []

    for (const org of orgs) {
      const retentionDays = org.aiLogRetentionDays || 90
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      try {
        // Delete logs older than retention period
        // IMPORTANT: Do NOT delete CostEvents
        // Use occurredAt (when the request happened) for retention, not createdAt
        const result = await prisma.aiRequestLog.deleteMany({
          where: {
            orgId: org.id,
            occurredAt: {
              lt: cutoffDate,
            },
          },
        })

        const deletedCount = result.count
        totalDeleted += deletedCount

        results.push({
          orgId: org.id,
          orgName: org.name,
          retentionDays,
          deletedCount,
        })

        if (deletedCount > 0) {
          console.log(`Deleted ${deletedCount} AI logs for org ${org.name} (older than ${retentionDays} days)`)
        }
      } catch (error: any) {
        results.push({
          orgId: org.id,
          orgName: org.name,
          error: error.message,
        })
        console.error(`Error applying retention for org ${org.id}:`, error)
      }
    }

    const status = results.some((r) => r.error) ? 'ERROR' : 'OK'
    const durationMs = Date.now() - startTime

    // Insert proof log
    await prisma.cronRunLog.create({
      data: {
        cronName: 'apply-retention',
        ranAt,
        status,
        orgsProcessed: orgs.length,
        alertsTriggered: 0,
        sentEmail: 0,
        sentTelegram: 0,
        sentInApp: 0,
        durationMs,
        errorCount: results.filter((r) => r.error).length,
        errorSample: results.find((r) => r.error)?.error?.substring(0, 500) || null,
      },
    })

    console.log(`CRON_APPLY_RETENTION_COMPLETED: ${orgs.length} orgs, ${totalDeleted} logs deleted`)

    return NextResponse.json({
      success: true,
      orgsProcessed: orgs.length,
      totalDeleted,
      results,
    })
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    // Insert proof log on error
    await prisma.cronRunLog.create({
      data: {
        cronName: 'apply-retention',
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

    console.error('CRON_APPLY_RETENTION_ERROR:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to apply retention' }, { status: 500 })
  }
}

