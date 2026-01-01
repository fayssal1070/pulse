/**
 * Alert Rules Engine V2 - Compute rule matches and generate AlertEvent payloads
 * Supports: DAILY_SPIKE, TOP_CONSUMER_SHARE, CUR_STALE, NO_BUDGETS, BUDGET_STATUS
 */

import { prisma } from '@/lib/prisma'
import { computeActiveAlerts } from './engine'

export type AlertRuleType =
  | 'DAILY_SPIKE'
  | 'TOP_CONSUMER_SHARE'
  | 'CUR_STALE'
  | 'NO_BUDGETS'
  | 'BUDGET_STATUS'

export type AlertSeverity = 'INFO' | 'WARN' | 'CRITICAL'

export interface AlertEventPayload {
  severity: AlertSeverity
  amountEUR: number
  message: string
  periodStart: Date
  periodEnd: Date
  metadata?: Record<string, any>
}

export interface AlertRule {
  id: string
  orgId: string
  name: string
  type: string
  enabled: boolean
  thresholdEUR: number | null
  spikePercent: number | null
  topSharePercent: number | null
  lookbackDays: number
  providerFilter: string | null
  cooldownHours: number
  lastTriggeredAt: Date | null
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Compute alert rule matches for a specific rule
 */
export async function computeAlertRuleMatches(
  orgId: string,
  rule: AlertRule,
  now: Date = new Date()
): Promise<AlertEventPayload[]> {
  if (!rule.enabled) {
    return []
  }

  switch (rule.type) {
    case 'DAILY_SPIKE':
      return await computeDailySpike(orgId, rule, now)
    case 'TOP_CONSUMER_SHARE':
      return await computeTopConsumerShare(orgId, rule, now)
    case 'CUR_STALE':
      return await computeCurStale(orgId, rule, now)
    case 'NO_BUDGETS':
      return await computeNoBudgets(orgId, rule, now)
    case 'BUDGET_STATUS':
      return await computeBudgetStatus(orgId, rule, now)
    default:
      console.warn(`Unknown alert rule type: ${rule.type}`)
      return []
  }
}

/**
 * DAILY_SPIKE: Alert when daily cost spikes vs baseline
 */
async function computeDailySpike(
  orgId: string,
  rule: AlertRule,
  now: Date
): Promise<AlertEventPayload[]> {
  if (!rule.spikePercent) {
    return []
  }

  const lookbackDays = rule.lookbackDays || 7
  const spikePercent = rule.spikePercent

  // Calculate baseline: average daily cost over lookbackDays
  const baselineStart = new Date(now)
  baselineStart.setDate(baselineStart.getDate() - lookbackDays)
  baselineStart.setHours(0, 0, 0, 0)

  const baselineEnd = new Date(now)
  baselineEnd.setDate(baselineEnd.getDate() - 1)
  baselineEnd.setHours(23, 59, 59, 999)

  // Last 24 hours
  const last24hStart = new Date(now)
  last24hStart.setHours(now.getHours() - 24)

  // Build where clause
  const where: any = {
    orgId,
    occurredAt: {},
  }

  // Provider filter
  if (rule.providerFilter && rule.providerFilter !== 'TOTAL') {
    if (rule.providerFilter === 'AWS') {
      where.source = 'AWS'
    } else {
      where.source = 'AI'
      where.provider = rule.providerFilter.toLowerCase()
    }
  }

  // Get baseline average
  where.occurredAt = { gte: baselineStart, lte: baselineEnd }
  const baselineEvents = await prisma.costEvent.findMany({
    where,
    select: { amountEur: true },
  })

  const baselineTotal = baselineEvents.reduce((sum, e) => sum + Number(e.amountEur), 0)
  const baselineAvg = baselineTotal / lookbackDays

  // Get last 24h
  where.occurredAt = { gte: last24hStart, lte: now }
  const last24hEvents = await prisma.costEvent.findMany({
    where,
    select: { amountEur: true },
  })

  const last24hTotal = last24hEvents.reduce((sum, e) => sum + Number(e.amountEur), 0)

  // Check spike
  if (baselineAvg > 0 && last24hTotal > baselineAvg * (1 + spikePercent / 100)) {
    const spikeAmount = last24hTotal - baselineAvg
    const spikePercentActual = (last24hTotal / baselineAvg - 1) * 100
    const spikePercentActualFormatted = spikePercentActual.toFixed(1)

    const severity: AlertSeverity = spikePercentActual > spikePercent * 2 ? 'CRITICAL' : 'WARN'

    return [
      {
        severity,
        amountEUR: last24hTotal,
        message: `Daily cost spike: €${last24hTotal.toFixed(2)} (+${spikePercentActualFormatted}% vs ${lookbackDays}-day avg €${baselineAvg.toFixed(2)})`,
        periodStart: last24hStart,
        periodEnd: now,
        metadata: {
          baselineAvg,
          last24hTotal,
          spikePercent: spikePercentActual,
          lookbackDays,
        },
      },
    ]
  }

  return []
}

/**
 * TOP_CONSUMER_SHARE: Alert when top consumer exceeds share threshold
 */
async function computeTopConsumerShare(
  orgId: string,
  rule: AlertRule,
  now: Date
): Promise<AlertEventPayload[]> {
  if (!rule.topSharePercent) {
    return []
  }

  // MTD period
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  mtdStart.setHours(0, 0, 0, 0)

  // Build where clause
  const where: any = {
    orgId,
    occurredAt: { gte: mtdStart, lte: now },
  }

  // Provider filter
  if (rule.providerFilter && rule.providerFilter !== 'TOTAL') {
    if (rule.providerFilter === 'AWS') {
      where.source = 'AWS'
    } else {
      where.source = 'AI'
      where.provider = rule.providerFilter.toLowerCase()
    }
  }

  // Get all events
  const events = await prisma.costEvent.findMany({
    where,
    select: {
      amountEur: true,
      dimensions: true,
    },
  })

  // Group by userId (default dimension)
  const userTotals = new Map<string, number>()
  let totalCost = 0

  for (const event of events) {
    const dims = (event.dimensions as any) || {}
    const userId = dims.userId || 'unknown'
    const amount = Number(event.amountEur)
    userTotals.set(userId, (userTotals.get(userId) || 0) + amount)
    totalCost += amount
  }

  if (totalCost === 0) {
    return []
  }

  // Find top consumer
  let topUserId = ''
  let topAmount = 0
  for (const [userId, amount] of userTotals.entries()) {
    if (amount > topAmount) {
      topAmount = amount
      topUserId = userId
    }
  }

  const topShare = (topAmount / totalCost) * 100

  if (topShare > rule.topSharePercent) {
    return [
      {
        severity: 'WARN',
        amountEUR: topAmount,
        message: `Top consumer (${topUserId}) accounts for ${topShare.toFixed(1)}% of MTD costs (€${topAmount.toFixed(2)} / €${totalCost.toFixed(2)})`,
        periodStart: mtdStart,
        periodEnd: now,
        metadata: {
          topUserId,
          topAmount,
          totalCost,
          topShare,
        },
      },
    ]
  }

  return []
}

/**
 * CUR_STALE: Alert when AWS CUR sync is stale (>48h)
 */
async function computeCurStale(orgId: string, rule: AlertRule, now: Date): Promise<AlertEventPayload[]> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      awsCurEnabled: true,
    },
  })

  if (!org?.awsCurEnabled) {
    return [] // Not applicable
  }

  // Get last batch
  const lastBatch = await prisma.ingestionBatch.findFirst({
    where: {
      orgId,
      source: 'AWS_CUR',
    },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  })

  if (!lastBatch) {
    return [
      {
        severity: 'WARN',
        amountEUR: 0,
        message: 'AWS CUR sync has never run',
        periodStart: now,
        periodEnd: now,
        metadata: { orgId },
      },
    ]
  }

  const hoursSinceLastSync = (now.getTime() - lastBatch.startedAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastSync > 48) {
    return [
      {
        severity: 'WARN',
        amountEUR: 0,
        message: `AWS CUR sync is stale: last sync ${Math.round(hoursSinceLastSync)}h ago`,
        periodStart: lastBatch.startedAt,
        periodEnd: now,
        metadata: {
          hoursSinceLastSync: Math.round(hoursSinceLastSync),
          lastSyncAt: lastBatch.startedAt.toISOString(),
        },
      },
    ]
  }

  return []
}

/**
 * NO_BUDGETS: Alert when no budgets are configured
 */
async function computeNoBudgets(orgId: string, rule: AlertRule, now: Date): Promise<AlertEventPayload[]> {
  const budgetCount = await prisma.budget.count({
    where: { orgId },
  })

  if (budgetCount === 0) {
    return [
      {
        severity: 'INFO',
        amountEUR: 0,
        message: 'No budgets configured for this organization',
        periodStart: now,
        periodEnd: now,
        metadata: { orgId },
      },
    ]
  }

  return []
}

/**
 * BUDGET_STATUS: Reuse computeActiveAlerts from PR5
 */
async function computeBudgetStatus(
  orgId: string,
  rule: AlertRule,
  now: Date
): Promise<AlertEventPayload[]> {
  const activeAlerts = await computeActiveAlerts(orgId)

  if (activeAlerts.length === 0) {
    return []
  }

  // Convert ActiveAlert[] to AlertEventPayload[]
  return activeAlerts.map((alert) => {
    const periodStart =
      alert.period === 'DAILY'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth(), 1)
    periodStart.setHours(0, 0, 0, 0)

    return {
      severity: alert.status === 'CRITICAL' ? 'CRITICAL' : 'WARN',
      amountEUR: alert.currentSpend,
      message: `${alert.budgetName} exceeded ${alert.percentage.toFixed(1)}% (${alert.status})`,
      periodStart,
      periodEnd: now,
      metadata: {
        budgetId: alert.budgetId,
        limit: alert.limit,
        percentage: alert.percentage,
        scopeType: alert.scopeType,
        scopeId: alert.scopeId,
      },
    }
  })
}

