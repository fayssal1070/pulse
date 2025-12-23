import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncCloudAccountCosts } from '@/lib/aws-sync-pipeline'

// Verify cron secret (set in Vercel environment variables)
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find all active AWS Cost Explorer accounts
    const cloudAccounts = await prisma.cloudAccount.findMany({
      where: {
        provider: 'AWS',
        connectionType: 'COST_EXPLORER',
        status: {
          in: ['active', 'pending', 'error'], // Don't sync disabled accounts
        },
      },
      select: {
        id: true,
        orgId: true,
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
    for (const account of cloudAccounts) {
      try {
        const result = await syncCloudAccountCosts(account.id)
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
  }
}

