import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * Debug endpoint to check cost data for the active organization
 * Returns: orgId, count, min/max date, sum_30d (amountEUR)
 * No secrets exposed
 * 
 * Alternative route without underscore for better Vercel compatibility
 * Original route: /api/_debug/costs
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const orgId = await getActiveOrganizationId(user.id)

    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found' },
        { status: 400 }
      )
    }

    // Get count
    const count = await prisma.costRecord.count({
      where: { orgId },
    })

    // Get min/max date
    const dateStats = await prisma.costRecord.aggregate({
      where: { orgId },
      _min: { date: true },
      _max: { date: true },
    })

    // Get sum for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const [sum30d, count30d, awsAccount] = await Promise.all([
      prisma.costRecord.aggregate({
        where: {
          orgId,
          date: { gte: thirtyDaysAgo },
        },
        _sum: {
          amountEUR: true,
        },
      }),
      prisma.costRecord.count({
        where: {
          orgId,
          date: { gte: thirtyDaysAgo },
        },
      }),
      prisma.cloudAccount.findFirst({
        where: {
          orgId,
          provider: 'AWS',
          connectionType: 'COST_EXPLORER',
          status: 'active',
        },
        select: {
          id: true,
          lastSyncedAt: true,
          notes: true,
        },
        orderBy: {
          lastSyncedAt: 'desc',
        },
      }),
    ])

    // Parse lastAwsFetch from CloudAccount notes
    let lastAwsFetch = null
    if (awsAccount?.notes) {
      try {
        const notes = JSON.parse(awsAccount.notes)
        if (notes.lastAwsFetch) {
          lastAwsFetch = notes.lastAwsFetch
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Enrich lastAwsFetch with debug fields if AWS_SYNC_DEBUG is enabled
    const isDebug = process.env.AWS_SYNC_DEBUG === '1' || process.env.AWS_SYNC_DEBUG === 'true'
    const enrichedLastAwsFetch = lastAwsFetch && isDebug ? {
      ...lastAwsFetch,
      // Ensure all debug fields are included
      start: lastAwsFetch.timePeriod?.start,
      end: lastAwsFetch.timePeriod?.end,
      metric: lastAwsFetch.metric,
      granularity: lastAwsFetch.granularity || 'DAILY',
      firstResultTotalAmount: lastAwsFetch.firstResultTotal?.amount,
      firstResultTotalUnit: lastAwsFetch.firstResultTotal?.unit,
      sampleGroups: lastAwsFetch.sampleGroups || [],
      computedTotalFromAws: lastAwsFetch.computedTotalFromAws || lastAwsFetch.totalFromAws,
    } : lastAwsFetch

    return NextResponse.json({
      orgId,
      count,
      minDate: dateStats._min.date?.toISOString() || null,
      maxDate: dateStats._max.date?.toISOString() || null,
      sum_30d: sum30d._sum.amountEUR || 0,
      count_30d: count30d,
      awsAccount: awsAccount ? {
        id: awsAccount.id,
        lastSyncedAt: awsAccount.lastSyncedAt?.toISOString() || null,
      } : null,
      lastAwsFetch: enrichedLastAwsFetch,
      deployment: {
        env: process.env.VERCEL_ENV || 'development',
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
        commitShaShort: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').substring(0, 7),
      },
    })
  } catch (error) {
    console.error('Debug costs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

