/**
 * CostEvent query functions - KPIs and aggregations
 */

import { prisma } from '@/lib/prisma'
import type {
  CostEventFilters,
  CostEventGroupBy,
  CostEventAggregation,
  CostKPIs,
  TopConsumer,
} from './types'

/**
 * Get cost KPIs for an organization (today, MTD, last month, MoM delta)
 */
export async function getCostKPIs(orgId: string): Promise<CostKPIs> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // AI costs
  const [aiToday, aiMTD, aiLastMonth] = await Promise.all([
    // AI cost today
    prisma.costEvent.aggregate({
      where: {
        orgId,
        source: 'AI',
        occurredAt: { gte: todayStart },
      },
      _sum: { amountEur: true },
    }),
    // AI cost MTD
    prisma.costEvent.aggregate({
      where: {
        orgId,
        source: 'AI',
        occurredAt: { gte: monthStart },
      },
      _sum: { amountEur: true },
    }),
    // AI cost last month
    prisma.costEvent.aggregate({
      where: {
        orgId,
        source: 'AI',
        occurredAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amountEur: true },
    }),
  ])

  // AWS costs
  const [awsToday, awsMTD, awsLastMonth] = await Promise.all([
    // AWS cost today
    prisma.costEvent.aggregate({
      where: {
        orgId,
        source: 'AWS',
        occurredAt: { gte: todayStart },
      },
      _sum: { amountEur: true },
    }),
    // AWS cost MTD
    prisma.costEvent.aggregate({
      where: {
        orgId,
        source: 'AWS',
        occurredAt: { gte: monthStart },
      },
      _sum: { amountEur: true },
    }),
    // AWS cost last month
    prisma.costEvent.aggregate({
      where: {
        orgId,
        source: 'AWS',
        occurredAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amountEur: true },
    }),
  ])

  const aiCostToday = Number(aiToday._sum.amountEur || 0)
  const aiCostMTD = Number(aiMTD._sum.amountEur || 0)
  const aiCostLastMonth = Number(aiLastMonth._sum.amountEur || 0)
  const aiCostMoMDelta = aiCostMTD - aiCostLastMonth
  const aiCostMoMDeltaPercent =
    aiCostLastMonth > 0 ? (aiCostMoMDelta / aiCostLastMonth) * 100 : 0

  const awsCostToday = Number(awsToday._sum.amountEur || 0)
  const awsCostMTD = Number(awsMTD._sum.amountEur || 0)
  const awsCostLastMonth = Number(awsLastMonth._sum.amountEur || 0)
  const awsCostMoMDelta = awsCostMTD - awsCostLastMonth
  const awsCostMoMDeltaPercent =
    awsCostLastMonth > 0 ? (awsCostMoMDelta / awsCostLastMonth) * 100 : 0

  const totalCostToday = aiCostToday + awsCostToday
  const totalCostMTD = aiCostMTD + awsCostMTD
  const totalCostLastMonth = aiCostLastMonth + awsCostLastMonth
  const totalCostMoMDelta = totalCostMTD - totalCostLastMonth
  const totalCostMoMDeltaPercent =
    totalCostLastMonth > 0 ? (totalCostMoMDelta / totalCostLastMonth) * 100 : 0

  return {
    aiCostToday,
    aiCostMTD,
    aiCostLastMonth,
    aiCostMoMDelta,
    aiCostMoMDeltaPercent,
    awsCostToday,
    awsCostMTD,
    awsCostLastMonth,
    awsCostMoMDelta,
    awsCostMoMDeltaPercent,
    totalCostToday,
    totalCostMTD,
    totalCostLastMonth,
    totalCostMoMDelta,
    totalCostMoMDeltaPercent,
  }
}

/**
 * Get top N consumers by type
 */
export async function getTopConsumers(
  orgId: string,
  type: 'user' | 'team' | 'project' | 'app' | 'service' | 'model',
  limit: number = 5,
  startDate?: Date,
  endDate?: Date
): Promise<TopConsumer[]> {
  const where: any = { orgId }
  if (startDate) where.occurredAt = { ...where.occurredAt, gte: startDate }
  if (endDate) where.occurredAt = { ...where.occurredAt, lte: endDate }

  // Get total for percentage calculation
  const total = await prisma.costEvent.aggregate({
    where,
    _sum: { amountEur: true },
  })
  const totalAmount = Number(total._sum.amountEur || 0)

  // Group by dimension
  const dimensionKey =
    type === 'user'
      ? 'userId'
      : type === 'team'
        ? 'teamId'
        : type === 'project'
          ? 'projectId'
          : type === 'app'
            ? 'appId'
            : type === 'model'
              ? 'model'
              : 'service'

  // For service, use service field directly
  if (type === 'service') {
    const results = await prisma.costEvent.groupBy({
      by: ['service'],
      where,
      _sum: { amountEur: true, amountUsd: true },
      _count: { id: true },
      orderBy: { _sum: { amountEur: 'desc' } },
      take: limit,
    })

    return results.map((r) => ({
      id: r.service,
      name: r.service,
      type: 'service' as const,
      amountEur: Number(r._sum.amountEur || 0),
      amountUsd: r._sum.amountUsd ? Number(r._sum.amountUsd) : null,
      eventCount: r._count.id,
      percentage: totalAmount > 0 ? (Number(r._sum.amountEur || 0) / totalAmount) * 100 : 0,
    }))
  }

  // For dimensions, we need to extract from JSON
  // Note: Prisma doesn't support JSON field grouping directly, so we'll fetch and group in memory
  const events = await prisma.costEvent.findMany({
    where,
    select: {
      id: true,
      amountEur: true,
      amountUsd: true,
      dimensions: true,
      service: true, // For model type
    },
  })

  // Group in memory
  const grouped = new Map<string, { amountEur: number; amountUsd: number | null; count: number }>()

  for (const event of events) {
    let key: string | null = null

    if (type === 'model') {
      key = event.service || 'unknown'
    } else {
      const dims = event.dimensions as any
      key = dims?.[dimensionKey] || null
    }

    if (!key) continue

    const existing = grouped.get(key) || { amountEur: 0, amountUsd: null, count: 0 }
    existing.amountEur += Number(event.amountEur)
    if (event.amountUsd) {
      existing.amountUsd = (existing.amountUsd || 0) + Number(event.amountUsd)
    }
    existing.count++
    grouped.set(key, existing)
  }

  // Convert to array and sort
  const topConsumers: TopConsumer[] = Array.from(grouped.entries())
    .map(([id, data]) => ({
      id,
      name: id,
      type,
      amountEur: data.amountEur,
      amountUsd: data.amountUsd,
      eventCount: data.count,
      percentage: totalAmount > 0 ? (data.amountEur / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amountEur - a.amountEur)
    .slice(0, limit)

  return topConsumers
}

/**
 * Query cost events with filters and optional grouping
 */
export async function queryCostEvents(
  filters: CostEventFilters,
  groupBy?: CostEventGroupBy
): Promise<CostEventAggregation[]> {
  const where: any = {
    orgId: filters.orgId,
  }

  if (filters.source) where.source = filters.source
  if (filters.provider) where.provider = filters.provider
  if (filters.service) where.service = filters.service
  if (filters.costCategory) where.costCategory = filters.costCategory

  if (filters.startDate || filters.endDate) {
    where.occurredAt = {}
    if (filters.startDate) where.occurredAt.gte = filters.startDate
    if (filters.endDate) where.occurredAt.lte = filters.endDate
  }

  // Dimension filters (JSON field filtering)
  if (filters.projectId || filters.teamId || filters.userId || filters.appId || filters.clientId || filters.model) {
    // Prisma doesn't support complex JSON filtering, so we'll filter in memory after fetch
    // For MVP, we'll fetch and filter
  }

  // If no grouping, return single aggregation
  if (!groupBy || Object.keys(groupBy).length === 0) {
    const result = await prisma.costEvent.aggregate({
      where,
      _sum: { amountEur: true, amountUsd: true },
      _count: { id: true },
    })

    return [
      {
        totalAmountEur: Number(result._sum.amountEur || 0),
        totalAmountUsd: result._sum.amountUsd ? Number(result._sum.amountUsd) : null,
        eventCount: result._count.id,
      },
    ]
  }

  // Group by fields
  const by: string[] = []
  if (groupBy.source) by.push('source')
  if (groupBy.provider) by.push('provider')
  if (groupBy.service) by.push('service')
  if (groupBy.costCategory) by.push('costCategory')

  // Note: Prisma groupBy doesn't support JSON fields, so for dimensions we'll need to group in memory
  // For MVP, we'll handle service/provider grouping and do dimension grouping separately if needed

  if (by.length === 0) {
    // No valid groupBy fields, return single aggregation
    const result = await prisma.costEvent.aggregate({
      where,
      _sum: { amountEur: true, amountUsd: true },
      _count: { id: true },
    })

    return [
      {
        totalAmountEur: Number(result._sum.amountEur || 0),
        totalAmountUsd: result._sum.amountUsd ? Number(result._sum.amountUsd) : null,
        eventCount: result._count.id,
      },
    ]
  }

  const results = await prisma.costEvent.groupBy({
    by: by as any,
    where,
    _sum: { amountEur: true, amountUsd: true },
    _count: { id: true },
  })

  return results.map((r) => ({
    totalAmountEur: Number(r._sum.amountEur || 0),
    totalAmountUsd: r._sum.amountUsd ? Number(r._sum.amountUsd) : null,
    eventCount: r._count.id,
    groupBy: Object.fromEntries(by.map((key) => [key, (r as any)[key] || null])),
  }))
}

