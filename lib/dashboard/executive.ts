/**
 * Executive Dashboard - Server-side query functions
 * Multi-tenant, org-scoped queries for KPIs, trends, top consumers, alerts, recommendations
 */

import { prisma } from '@/lib/prisma'
import { getCostKPIs } from '@/lib/cost-events/query'
import type { CostKPIs, TopConsumer } from '@/lib/cost-events/types'

export interface ExecutiveKPIs {
  aiCostToday: number
  aiCostMTD: number
  awsCostMTD: number
  totalMTD: number
  momDelta: number
  momDeltaPercent: number
  hasData: boolean
}

export interface DailyTrendPoint {
  date: string // ISO date string
  total: number
  aws: number
  ai: number
}

export interface BudgetAlert {
  id: string
  budgetId: string
  budgetName?: string
  scopeType: string
  scopeId: string | null
  scopeName: string
  currentSpend: number
  limit: number
  percentage: number
  status: 'OK' | 'WARNING' | 'EXCEEDED'
  period: 'MONTHLY' | 'DAILY'
}

export interface Recommendation {
  id: string
  type: 'AI_SPIKE' | 'TOP_CONSUMER' | 'STALE_CUR' | 'NO_BUDGET'
  title: string
  description: string
  severity: 'INFO' | 'WARN' | 'CRITICAL'
  cta: {
    label: string
    href: string
  }
}

/**
 * Get executive KPIs for dashboard
 */
export async function getExecutiveKPIs(orgId: string): Promise<ExecutiveKPIs> {
  try {
    const kpis: CostKPIs = await getCostKPIs(orgId)
    
    return {
      aiCostToday: kpis.aiCostToday,
      aiCostMTD: kpis.aiCostMTD,
      awsCostMTD: kpis.awsCostMTD,
      totalMTD: kpis.totalCostMTD,
      momDelta: kpis.totalCostMoMDelta,
      momDeltaPercent: kpis.totalCostMoMDeltaPercent,
      hasData: kpis.totalCostMTD > 0 || kpis.aiCostMTD > 0 || kpis.awsCostMTD > 0,
    }
  } catch (error) {
    console.error('Error fetching executive KPIs:', error)
    return {
      aiCostToday: 0,
      aiCostMTD: 0,
      awsCostMTD: 0,
      totalMTD: 0,
      momDelta: 0,
      momDeltaPercent: 0,
      hasData: false,
    }
  }
}

/**
 * Get daily cost trend (last N days)
 */
export async function getDailyTrend(
  orgId: string,
  days: number = 30,
  filter: 'total' | 'aws' | 'ai' = 'total'
): Promise<DailyTrendPoint[]> {
  try {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Fetch all events in the period
    const events = await prisma.costEvent.findMany({
      where: {
        orgId,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        occurredAt: true,
        source: true,
        amountEur: true,
      },
    })

    // Group by day
    const dailyMap = new Map<string, { total: number; aws: number; ai: number }>()

    for (const event of events) {
      const dateKey = event.occurredAt.toISOString().split('T')[0]
      const existing = dailyMap.get(dateKey) || { total: 0, aws: 0, ai: 0 }
      
      const amount = Number(event.amountEur)
      existing.total += amount
      if (event.source === 'AWS') {
        existing.aws += amount
      } else if (event.source === 'AI') {
        existing.ai += amount
      }
      
      dailyMap.set(dateKey, existing)
    }

    // Generate all days in range (fill gaps with 0)
    const points: DailyTrendPoint[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0]
      const data = dailyMap.get(dateKey) || { total: 0, aws: 0, ai: 0 }
      
      points.push({
        date: dateKey,
        total: data.total,
        aws: data.aws,
        ai: data.ai,
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return points
  } catch (error) {
    console.error('Error fetching daily trend:', error)
    return []
  }
}

/**
 * Get top consumers by dimension
 */
export async function getTopConsumers(
  orgId: string,
  dimension: 'user' | 'team' | 'project' | 'app' | 'client',
  limit: number = 5
): Promise<TopConsumer[]> {
  try {
    const { getTopConsumers: getTopConsumersQuery } = await import('@/lib/cost-events/query')
    
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    
    // Map 'client' to a supported dimension or handle separately
    if (dimension === 'client') {
      // For client, we need to fetch and group manually since it's not directly supported
      const events = await prisma.costEvent.findMany({
        where: {
          orgId,
          occurredAt: { gte: monthStart },
        },
        select: {
          id: true,
          amountEur: true,
          amountUsd: true,
          dimensions: true,
        },
      })

      const total = events.reduce((sum, e) => sum + Number(e.amountEur), 0)
      const grouped = new Map<string, { amountEur: number; amountUsd: number | null; count: number }>()

      for (const event of events) {
        const dims = event.dimensions as any
        const clientId = dims?.clientId || null
        if (!clientId) continue

        const existing = grouped.get(clientId) || { amountEur: 0, amountUsd: null, count: 0 }
        existing.amountEur += Number(event.amountEur)
        if (event.amountUsd) {
          existing.amountUsd = (existing.amountUsd || 0) + Number(event.amountUsd)
        }
        existing.count++
        grouped.set(clientId, existing)
      }

      return Array.from(grouped.entries())
        .map(([id, data]) => ({
          id,
          name: id,
          type: 'app' as const, // Use 'app' as fallback type since 'client' not in TopConsumer type
          amountEur: data.amountEur,
          amountUsd: data.amountUsd,
          eventCount: data.count,
          percentage: total > 0 ? (data.amountEur / total) * 100 : 0,
        }))
        .sort((a, b) => b.amountEur - a.amountEur)
        .slice(0, limit) as TopConsumer[]
    } else {
      return await getTopConsumersQuery(orgId, dimension, limit, monthStart)
    }
  } catch (error) {
    console.error('Error fetching top consumers:', error)
    return []
  }
}

/**
 * Get active budget alerts
 */
export async function getActiveBudgetAlerts(orgId: string): Promise<BudgetAlert[]> {
  try {
    // Get all enabled budgets for org
    const budgets = await prisma.budget.findMany({
      where: { 
        orgId,
        enabled: true,
      },
      select: {
        id: true,
      },
    })

    if (budgets.length === 0) {
      return []
    }

    const alerts: BudgetAlert[] = []

    // Use computeBudgetStatus which already handles scopeName lookup
    const { computeBudgetStatus } = await import('@/lib/alerts/engine')

    for (const budget of budgets) {
      const status = await computeBudgetStatus(orgId, budget.id)
      if (!status) continue

      // Only include if WARNING or CRITICAL
      if (status.status === 'WARNING' || status.status === 'CRITICAL') {
        alerts.push({
          id: budget.id,
          budgetId: budget.id,
          budgetName: status.budgetName,
          scopeType: status.scopeType,
          scopeId: status.scopeId,
          scopeName: status.scopeName,
          currentSpend: status.currentSpend,
          limit: status.limit,
          percentage: status.percentage,
          status: status.status === 'CRITICAL' ? 'EXCEEDED' : 'WARNING',
          period: status.period,
        })
      }
    }

    return alerts.sort((a, b) => b.percentage - a.percentage)
  } catch (error) {
    console.error('Error fetching budget alerts:', error)
    return []
  }
}

/**
 * Get recommendations (rules-based)
 */
export async function getRecommendations(orgId: string): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = []

  try {
    const now = new Date()
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 1. Check for AI spend spike (last 3 days vs average)
    const [aiLast3Days, aiLast30Days] = await Promise.all([
      prisma.costEvent.aggregate({
        where: {
          orgId,
          source: 'AI',
          occurredAt: { gte: threeDaysAgo },
        },
        _sum: { amountEur: true },
      }),
      prisma.costEvent.aggregate({
        where: {
          orgId,
          source: 'AI',
          occurredAt: { gte: thirtyDaysAgo },
        },
        _sum: { amountEur: true },
      }),
    ])

    const ai3Days = Number(aiLast3Days._sum.amountEur || 0)
    const ai30Days = Number(aiLast30Days._sum.amountEur || 0)
    const aiDailyAvg = ai30Days / 30
    const ai3DaysAvg = ai3Days / 3

    if (aiDailyAvg > 0 && ai3DaysAvg > aiDailyAvg * 1.5) {
      recommendations.push({
        id: 'ai-spike',
        type: 'AI_SPIKE',
        title: 'AI Spend Spike Detected',
        description: `AI costs increased by ${((ai3DaysAvg / aiDailyAvg - 1) * 100).toFixed(0)}% in the last 3 days compared to the 30-day average.`,
        severity: 'WARN',
        cta: {
          label: 'View AI Costs',
          href: '/costs?source=AI',
        },
      })
    }

    // 2. Check for top consumer exceeding 35%
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const totalMTD = await prisma.costEvent.aggregate({
      where: {
        orgId,
        occurredAt: { gte: monthStart },
      },
      _sum: { amountEur: true },
    })

    const totalAmount = Number(totalMTD._sum.amountEur || 0)

    if (totalAmount > 0) {
      // Check top user
      const topUsers = await getTopConsumers(orgId, 'user', 1)
      if (topUsers.length > 0 && topUsers[0].percentage > 35) {
        recommendations.push({
          id: 'top-consumer-user',
          type: 'TOP_CONSUMER',
          title: 'Top Consumer Alert',
          description: `${topUsers[0].name} accounts for ${topUsers[0].percentage.toFixed(1)}% of total costs this month.`,
          severity: 'INFO',
          cta: {
            label: 'View Details',
            href: '/costs?userId=' + topUsers[0].id,
          },
        })
      }
    }

    // 3. Check for stale CUR sync
    const curAccount = await prisma.cloudAccount.findFirst({
      where: {
        orgId,
        provider: 'AWS',
        connectionType: 'CUR',
        status: 'active',
      },
      select: {
        lastCurSyncAt: true,
      },
    })

    if (curAccount?.lastCurSyncAt) {
      const daysSinceSync = (now.getTime() - curAccount.lastCurSyncAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceSync > 2) {
        recommendations.push({
          id: 'stale-cur',
          type: 'STALE_CUR',
          title: 'CUR Sync Stale',
          description: `AWS CUR hasn't been synced in ${Math.floor(daysSinceSync)} days. Last sync: ${curAccount.lastCurSyncAt.toLocaleDateString()}.`,
          severity: 'WARN',
          cta: {
            label: 'Sync Now',
            href: '/accounts',
          },
        })
      }
    }

    // 4. Check if no budgets exist
    const budgetCount = await prisma.budget.count({
      where: { orgId },
    })

    if (budgetCount === 0 && totalAmount > 0) {
      recommendations.push({
        id: 'no-budget',
        type: 'NO_BUDGET',
        title: 'No Budgets Configured',
        description: 'Create budgets to track spending and receive alerts when thresholds are exceeded.',
        severity: 'INFO',
        cta: {
          label: 'Create Budget',
          href: '/budgets',
        },
      })
    }

    // Limit to 3 recommendations
    return recommendations.slice(0, 3)
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return []
  }
}

