import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncCloudAccountCosts } from '@/lib/aws-sync-pipeline'
import { acquireJobLock, releaseJobLock } from '@/lib/job-lock'
import { SYNC_CONFIG } from '@/lib/aws-sync-config'

// Verify cron secret (set in Vercel environment variables)
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Acquire job lock to prevent parallel runs
  const lockAcquired = await acquireJobLock()
  if (!lockAcquired) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Sync already in progress, skipping this run',
    })
  }

  try {
    // Calculate minimum time since last sync (skip accounts synced within last 6 hours)
    // Cost Explorer updates every 24 hours, so syncing more frequently is unnecessary
    const minTimeSinceLastSync = new Date()
    minTimeSinceLastSync.setHours(
      minTimeSinceLastSync.getHours() - SYNC_CONFIG.MIN_SYNC_INTERVAL_HOURS
    )

    // Find all active AWS Cost Explorer accounts that need syncing
    const cloudAccounts = await prisma.cloudAccount.findMany({
      where: {
        provider: 'AWS',
        connectionType: 'COST_EXPLORER',
        status: {
          in: ['active', 'pending', 'error'], // Don't sync disabled accounts
        },
        OR: [
          { lastSyncedAt: null }, // Never synced
          { lastSyncedAt: { lt: minTimeSinceLastSync } }, // Synced more than N minutes ago
        ],
      },
      select: {
        id: true,
        orgId: true,
        lastSyncedAt: true,
      },
      take: SYNC_CONFIG.MAX_ACCOUNTS_PER_RUN, // Limit accounts per run
      orderBy: {
        lastSyncedAt: 'asc', // Sync oldest first
      },
    })

    const results: Array<{
      cloudAccountId: string
      orgId: string
      success: boolean
      recordsCount: number
      error?: string
    }> = []

    // Sync each account (with error handling to prevent one failure from stopping others)
    // Use force=false (default) to respect the 6-hour minimum interval for cron
    for (const account of cloudAccounts) {
      try {
        const result = await syncCloudAccountCosts(account.id, false)
        results.push({
          cloudAccountId: account.id,
          orgId: account.orgId,
          success: result.success,
          recordsCount: result.recordsCount,
          error: result.error,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to sync cloud account ${account.id}:`, errorMessage)

        // Update account with error
        await prisma.cloudAccount.update({
          where: { id: account.id },
          data: {
            status: 'error',
            lastSyncError: errorMessage,
            lastSyncedAt: new Date(),
          },
        })

        results.push({
          cloudAccountId: account.id,
          orgId: account.orgId,
          success: false,
          recordsCount: 0,
          error: errorMessage,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const totalRecords = results.reduce((sum, r) => sum + r.recordsCount, 0)

    return NextResponse.json({
      success: true,
      syncedAccounts: results.length,
      successfulSyncs: successCount,
      totalRecords,
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    // Always release the lock
    await releaseJobLock()
  }
}

