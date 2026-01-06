/**
 * Cron job to retry failed notification deliveries
 * POST /api/cron/retry-notifications
 * Protected by CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { retryDelivery } from '@/lib/notifications/dispatcher'

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '') || request.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find deliveries that are RETRYING and nextRetryAt <= now
    const pendingRetries = await prisma.notificationDelivery.findMany({
      where: {
        status: 'RETRYING',
        nextRetryAt: {
          lte: now,
        },
      },
      take: 100, // Process max 100 at a time
    })

    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const delivery of pendingRetries) {
      try {
        const result = await retryDelivery(delivery.id)
        if (result.success) {
          successCount++
        } else {
          failCount++
          if (result.error) {
            errors.push(`${delivery.channel} (${delivery.id}): ${result.error}`)
          }
        }
      } catch (error: any) {
        failCount++
        errors.push(`${delivery.channel} (${delivery.id}): ${error.message}`)
      }
    }

    // Record cron run
    await prisma.cronRun.create({
      data: {
        type: 'RETRY_NOTIFICATIONS',
        status: failCount === 0 ? 'SUCCESS' : 'FAIL',
        startedAt: now,
        finishedAt: new Date(),
        error: failCount > 0 ? errors.slice(0, 1).join('; ') : null,
        metaJson: JSON.stringify({
          total: pendingRetries.length,
          success: successCount,
          failed: failCount,
          processedOrgs: new Set(pendingRetries.map((d) => d.orgId)).size,
          errors: errors.slice(0, 10), // Limit error details
        }),
      },
    })

    return NextResponse.json({
      success: true,
      processed: pendingRetries.length,
      successCount,
      failCount,
      errors: errors.slice(0, 5),
    })
  } catch (error: any) {
    console.error('[RetryNotifications] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retry notifications' },
      { status: 500 }
    )
  }
}

