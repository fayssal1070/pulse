import { prisma } from './prisma'
import { syncAWSCosts, AWSSyncResult } from './aws-cost-explorer'
import { SYNC_CONFIG } from './aws-sync-config'

export interface SyncPipelineResult {
  cloudAccountId: string
  orgId: string
  success: boolean
  recordsCount: number
  totalAmount: number
  error?: string
  services?: string[]
}

/**
 * Sync costs for a single AWS CloudAccount
 * Includes lock to prevent parallel syncs for the same account
 * @param cloudAccountId - The ID of the cloud account to sync
 * @param force - If true, bypasses the 6-hour minimum interval check (for manual syncs). Default: false (for cron)
 */
export async function syncCloudAccountCosts(
  cloudAccountId: string,
  force: boolean = false // If true, bypass 6h check (for manual "Sync Now")
): Promise<SyncPipelineResult> {
  // Acquire account-specific lock
  const accountLockId = `aws-sync-${cloudAccountId}`
  const now = new Date()
  const lockExpiry = new Date(now.getTime() + 10 * 60 * 1000) // 10 minutes lock

  // Check if account is already being synced
  const existingLock = await prisma.jobLock.findUnique({
    where: { id: accountLockId },
  })

  if (existingLock && existingLock.lockedUntil > now) {
    return {
      cloudAccountId,
      orgId: '',
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: 'Sync already in progress for this account. Please wait.',
    }
  }

  // Acquire lock
  await prisma.jobLock.upsert({
    where: { id: accountLockId },
    create: {
      id: accountLockId,
      lockedUntil: lockExpiry,
    },
    update: {
      lockedUntil: lockExpiry,
    },
  })

  try {
    const cloudAccount = await prisma.cloudAccount.findUnique({
      where: { id: cloudAccountId },
      select: {
        id: true,
        orgId: true,
        provider: true,
        connectionType: true,
        roleArn: true,
        externalId: true,
        status: true,
        lastSyncedAt: true,
      },
    })

  if (!cloudAccount) {
    return {
      cloudAccountId,
      orgId: '',
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: 'Cloud account not found',
    }
  }

  // Only sync AWS Cost Explorer accounts
  if (cloudAccount.provider !== 'AWS' || cloudAccount.connectionType !== 'COST_EXPLORER') {
    return {
      cloudAccountId,
      orgId: cloudAccount.orgId,
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: 'Not an AWS Cost Explorer account',
    }
  }

  if (!cloudAccount.roleArn || !cloudAccount.externalId) {
    await prisma.jobLock.update({
      where: { id: accountLockId },
      data: { lockedUntil: new Date() },
    })
    return {
      cloudAccountId,
      orgId: cloudAccount.orgId,
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: 'Missing roleArn or externalId',
    }
  }

  // Check if synced recently (unless force=true for manual sync)
  // The lock DB above prevents parallel syncs, but this check prevents unnecessary syncs for cron
  if (!force && cloudAccount.lastSyncedAt) {
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    if (cloudAccount.lastSyncedAt > sixHoursAgo) {
      await prisma.jobLock.update({
        where: { id: accountLockId },
        data: { lockedUntil: new Date() },
      })
      const minutesSince = Math.floor((now.getTime() - cloudAccount.lastSyncedAt.getTime()) / 60000)
      return {
        cloudAccountId,
        orgId: cloudAccount.orgId,
        success: false,
        recordsCount: 0,
        totalAmount: 0,
        error: `Synced ${minutesSince} minutes ago. Cost Explorer updates every 24 hours. Please wait at least 6 hours between syncs.`,
      }
    }
  }

  // Sync costs
  const syncResult = await syncAWSCosts(
    cloudAccount.roleArn,
    cloudAccount.externalId,
    cloudAccount.orgId
  )

  if (!syncResult.success) {
    // Update cloud account with error
    await prisma.cloudAccount.update({
      where: { id: cloudAccountId },
      data: {
        status: 'error',
        lastSyncError: syncResult.error || 'Unknown error',
        lastSyncedAt: new Date(),
      },
    })

    return {
      cloudAccountId,
      orgId: cloudAccount.orgId,
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: syncResult.error,
    }
  }

    // Upsert cost records
    // First, fetch the cost data again to get individual records
    const { fetchDailyCosts } = await import('./aws-cost-explorer')
    const endDate = new Date()
    endDate.setHours(0, 0, 0, 0)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - SYNC_CONFIG.AWS_SYNC_LOOKBACK_DAYS)

  const costData = await fetchDailyCosts(
    cloudAccount.roleArn,
    cloudAccount.externalId,
    startDate,
    endDate
  )

  // Group by date and service
  const dailyTotals = new Map<string, { service: string; amount: number; currency: string }>()

  for (const record of costData) {
    const key = `${record.date}:${record.service}`
    const existing = dailyTotals.get(key)

    if (existing) {
      existing.amount += record.amount
    } else {
      dailyTotals.set(key, {
        service: record.service,
        amount: record.amount,
        currency: record.currency,
      })
    }
  }

  // Debug: Log before DB insert
  const isDebug = process.env.AWS_SYNC_DEBUG === '1'
  let recordsWithAmountGreaterThanZero = 0
  let totalAmountBeforeInsert = 0

  for (const [key, data] of dailyTotals) {
    if (data.amount > 0) {
      recordsWithAmountGreaterThanZero++
      totalAmountBeforeInsert += data.amount
    }
  }

  if (isDebug) {
    console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
      stage: 'before_db_insert',
      dailyTotalsSize: dailyTotals.size,
      recordsWithAmountGreaterThanZero,
      totalAmountBeforeInsert,
      sampleRecords: Array.from(dailyTotals.entries()).slice(0, 3).map(([key, data]) => ({
        key,
        service: data.service,
        amount: data.amount,
        currency: data.currency,
        amountEUR: data.currency === 'EUR' ? data.amount : data.amount * 0.92,
      })),
    }))
  }

  // Upsert cost records
  let upsertedCount = 0
  let totalAmountEURInserted = 0
  for (const [key, data] of dailyTotals) {
    const [dateStr] = key.split(':')
    const date = new Date(dateStr + 'T00:00:00Z')

    // Convert to EUR if needed
    const amountEUR = data.currency === 'EUR' ? data.amount : data.amount * 0.92
    const roundedAmountEUR = Math.round(amountEUR * 100) / 100

    // Use upsert to avoid duplicates (based on orgId + date + provider + service)
    // Since we don't have a unique constraint, we'll delete and recreate for simplicity
    await prisma.costRecord.deleteMany({
      where: {
        orgId: cloudAccount.orgId,
        date: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
        provider: 'AWS',
        service: data.service,
      },
    })

    await prisma.costRecord.create({
      data: {
        orgId: cloudAccount.orgId,
        date,
        provider: 'AWS',
        service: data.service,
        amountEUR: roundedAmountEUR,
        currency: data.currency,
      },
    })

    totalAmountEURInserted += roundedAmountEUR
    upsertedCount++
  }

  // Debug: Log after DB insert
  if (isDebug) {
    console.log('[AWS_SYNC_DEBUG]', JSON.stringify({
      stage: 'after_db_insert',
      upsertedCount,
      totalAmountEURInserted,
    }))
  }

    // Update cloud account status
    await prisma.cloudAccount.update({
      where: { id: cloudAccountId },
      data: {
        status: 'active',
        lastSyncedAt: new Date(),
        lastSyncError: null,
      },
    })

    // Release lock
    await prisma.jobLock.update({
      where: { id: accountLockId },
      data: { lockedUntil: new Date() },
    })

    return {
      cloudAccountId,
      orgId: cloudAccount.orgId,
      success: true,
      recordsCount: upsertedCount,
      totalAmount: syncResult.totalAmount,
      services: syncResult.services,
    }
  } catch (error) {
    // Release lock on error
    await prisma.jobLock.update({
      where: { id: accountLockId },
      data: { lockedUntil: new Date() },
    }).catch(() => {}) // Ignore errors when releasing

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      cloudAccountId,
      orgId: '',
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: errorMessage,
    }
  }
}

/**
 * Sync all AWS Cost Explorer accounts for an organization
 */
export async function syncOrganizationAWSCosts(orgId: string): Promise<SyncPipelineResult[]> {
  const cloudAccounts = await prisma.cloudAccount.findMany({
    where: {
      orgId,
      provider: 'AWS',
      connectionType: 'COST_EXPLORER',
      status: {
        in: ['active', 'pending', 'error'], // Don't sync disabled accounts
      },
    },
  })

  const results: SyncPipelineResult[] = []

  for (const account of cloudAccounts) {
    try {
      const result = await syncCloudAccountCosts(account.id)
      results.push(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({
        cloudAccountId: account.id,
        orgId,
        success: false,
        recordsCount: 0,
        totalAmount: 0,
        error: errorMessage,
      })
    }
  }

  return results
}

