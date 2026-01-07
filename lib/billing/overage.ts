/**
 * PR30: Usage overage calculation and billing
 * Computes monthly usage and overage amounts for Stripe billing
 */

import { prisma } from '@/lib/prisma'
import { getOrgPlan, getEntitlements } from './entitlements'

export interface MonthlyUsageData {
  totalSpendEUR: number
  includedSpendEUR: number
  overageSpendEUR: number
  overageAmountEUR: number
}

/**
 * Compute monthly usage for an organization
 * Aggregates AI costs from CostEvent for the given month
 */
export async function computeMonthlyUsage(
  orgId: string,
  year: number,
  month: number
): Promise<MonthlyUsageData> {
  // Date range for the month
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  // Aggregate AI costs for the month
  const costEvents = await prisma.costEvent.findMany({
    where: {
      orgId,
      source: 'AI',
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      amountEur: true,
    },
  })

  // Sum total spend
  const totalSpendEUR = costEvents.reduce(
    (sum, event) => sum + parseFloat(event.amountEur.toString()),
    0
  )

  // Get plan entitlements
  const plan = await getOrgPlan(orgId)
  const entitlements = getEntitlements(plan)
  const includedSpendEUR = entitlements.includedMonthlySpendEUR

  // Calculate overage
  const overageSpendEUR = Math.max(0, totalSpendEUR - includedSpendEUR)
  const overageAmountEUR = overageSpendEUR * entitlements.overagePricePerEUR

  return {
    totalSpendEUR,
    includedSpendEUR,
    overageSpendEUR,
    overageAmountEUR,
  }
}

/**
 * Compute current month usage (for real-time display)
 */
export async function computeCurrentMonthUsage(orgId: string): Promise<MonthlyUsageData> {
  const now = new Date()
  return computeMonthlyUsage(orgId, now.getFullYear(), now.getMonth() + 1)
}

/**
 * Get or create MonthlyUsage record for a month
 */
export async function getOrCreateMonthlyUsage(
  orgId: string,
  year: number,
  month: number
) {
  // Try to find existing
  let usage = await prisma.monthlyUsage.findUnique({
    where: {
      orgId_year_month: {
        orgId,
        year,
        month,
      },
    },
  })

  if (!usage) {
    // Compute and create
    const data = await computeMonthlyUsage(orgId, year, month)
    
    usage = await prisma.monthlyUsage.create({
      data: {
        orgId,
        year,
        month,
        totalSpendEUR: data.totalSpendEUR,
        includedSpendEUR: data.includedSpendEUR,
        overageSpendEUR: data.overageSpendEUR,
        overageAmountEUR: data.overageAmountEUR,
      },
    })
  }

  return usage
}

/**
 * Update MonthlyUsage with latest data
 */
export async function updateMonthlyUsage(
  orgId: string,
  year: number,
  month: number
) {
  const data = await computeMonthlyUsage(orgId, year, month)

  return prisma.monthlyUsage.upsert({
    where: {
      orgId_year_month: {
        orgId,
        year,
        month,
      },
    },
    create: {
      orgId,
      year,
      month,
      ...data,
    },
    update: {
      totalSpendEUR: data.totalSpendEUR,
      includedSpendEUR: data.includedSpendEUR,
      overageSpendEUR: data.overageSpendEUR,
      overageAmountEUR: data.overageAmountEUR,
      updatedAt: new Date(),
    },
  })
}

/**
 * Check if organization is over quota (for warnings)
 */
export async function isOverQuota(orgId: string): Promise<{
  isOver: boolean
  current: number
  included: number
  percentage: number
}> {
  const data = await computeCurrentMonthUsage(orgId)
  const isOver = data.totalSpendEUR > data.includedSpendEUR
  const percentage = data.includedSpendEUR > 0 
    ? (data.totalSpendEUR / data.includedSpendEUR) * 100 
    : 0

  return {
    isOver,
    current: data.totalSpendEUR,
    included: data.includedSpendEUR,
    percentage,
  }
}

