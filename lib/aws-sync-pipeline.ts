import { prisma } from './prisma'
import { syncAWSCosts, AWSSyncResult } from './aws-cost-explorer'

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
 */
export async function syncCloudAccountCosts(
  cloudAccountId: string
): Promise<SyncPipelineResult> {
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
    return {
      cloudAccountId,
      orgId: cloudAccount.orgId,
      success: false,
      recordsCount: 0,
      totalAmount: 0,
      error: 'Missing roleArn or externalId',
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
  startDate.setDate(startDate.getDate() - 30)

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

  // Upsert cost records
  let upsertedCount = 0
  for (const [key, data] of dailyTotals) {
    const [dateStr] = key.split(':')
    const date = new Date(dateStr + 'T00:00:00Z')

    // Convert to EUR if needed
    const amountEUR = data.currency === 'EUR' ? data.amount : data.amount * 0.92

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
        amountEUR: Math.round(amountEUR * 100) / 100,
        currency: data.currency,
      },
    })

    upsertedCount++
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

  return {
    cloudAccountId,
    orgId: cloudAccount.orgId,
    success: true,
    recordsCount: upsertedCount,
    totalAmount: syncResult.totalAmount,
    services: syncResult.services,
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

