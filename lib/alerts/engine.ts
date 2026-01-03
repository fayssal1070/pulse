/**
 * Alerts Engine - Compute budget status and active alerts
 */

import { prisma } from '@/lib/prisma'

export type BudgetStatus = 'OK' | 'WARNING' | 'CRITICAL'

export interface BudgetStatusResult {
  budgetId: string
  budgetName: string
  scopeType: string
  scopeId: string | null
  scopeName: string
  period: 'MONTHLY' | 'DAILY'
  currentSpend: number
  limit: number
  percentage: number
  status: BudgetStatus
  alertThresholdPct: number
}

export interface ActiveAlert {
  id: string
  budgetId: string
  budgetName: string
  scopeType: string
  scopeId: string | null
  scopeName: string
  currentSpend: number
  limit: number
  percentage: number
  status: BudgetStatus
  period: 'MONTHLY' | 'DAILY'
}

/**
 * Compute budget status for a specific budget
 */
export async function computeBudgetStatus(
  orgId: string,
  budgetId: string
): Promise<BudgetStatusResult | null> {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId, orgId },
      select: {
        id: true,
        name: true,
        scopeType: true,
        scopeId: true,
        period: true,
        amountEur: true,
        alertThresholdPct: true,
        enabled: true,
      },
    })

    if (!budget || !budget.enabled) {
      return null
    }

    // Calculate current spend based on period
    const now = new Date()
    let startDate: Date

    if (budget.period === 'DAILY') {
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
    } else {
      // MONTHLY
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
    }

    // Build where clause for CostEvent
    const where: any = {
      orgId,
      occurredAt: { gte: startDate },
    }

    // Filter by scope if applicable
    let currentSpend = 0

    if (budget.scopeType === 'ORG') {
      // Sum all events for org
      const result = await prisma.costEvent.aggregate({
        where,
        _sum: { amountEur: true },
      })
      currentSpend = Number(result._sum.amountEur || 0)
    } else if (budget.scopeId) {
      // Filter by dimension
      const dimensionKey =
        budget.scopeType === 'TEAM'
          ? 'teamId'
          : budget.scopeType === 'PROJECT'
            ? 'projectId'
            : budget.scopeType === 'APP'
              ? 'appId'
              : budget.scopeType === 'CLIENT'
                ? 'clientId'
                : null

      if (dimensionKey) {
        // Use direct columns if available (after Prisma regeneration), otherwise fallback to dimensions JSON
        const whereWithScope: any = { ...where }
        
        // Try direct column first (will work after Prisma regeneration)
        if (dimensionKey === 'teamId') {
          whereWithScope.teamId = budget.scopeId
        } else if (dimensionKey === 'projectId') {
          whereWithScope.projectId = budget.scopeId
        } else if (dimensionKey === 'appId') {
          whereWithScope.appId = budget.scopeId
        } else if (dimensionKey === 'clientId') {
          whereWithScope.clientId = budget.scopeId
        }

        try {
          const result = await prisma.costEvent.aggregate({
            where: whereWithScope,
            _sum: { amountEur: true },
          })
          currentSpend = Number(result._sum.amountEur || 0)
        } catch (error) {
          // Fallback to dimensions JSON if direct columns not available
          const events = await prisma.costEvent.findMany({
            where,
            select: {
              amountEur: true,
              dimensions: true,
            },
          })

          for (const event of events) {
            const dims = event.dimensions as any
            if (dims?.[dimensionKey] === budget.scopeId) {
              currentSpend += Number(event.amountEur)
            }
          }
        }
      }
    }

    const limit = Number(budget.amountEur)
    const percentage = limit > 0 ? (currentSpend / limit) * 100 : 0
    const threshold = budget.alertThresholdPct || 80

    let status: BudgetStatus = 'OK'
    if (percentage >= 100) {
      status = 'CRITICAL'
    } else if (percentage >= threshold) {
      status = 'WARNING'
    }

    // Fetch scope name from Directory
    let scopeName = 'Organization'
    if (budget.scopeId) {
      if (budget.scopeType === 'APP') {
        const app = await (prisma as any).app.findFirst({
          where: { id: budget.scopeId, orgId },
          select: { name: true },
        })
        scopeName = app?.name || budget.scopeId
      } else if (budget.scopeType === 'PROJECT') {
        const project = await (prisma as any).project.findFirst({
          where: { id: budget.scopeId, orgId },
          select: { name: true },
        })
        scopeName = project?.name || budget.scopeId
      } else if (budget.scopeType === 'CLIENT') {
        const client = await (prisma as any).client.findFirst({
          where: { id: budget.scopeId, orgId },
          select: { name: true },
        })
        scopeName = client?.name || budget.scopeId
      } else if (budget.scopeType === 'TEAM') {
        const team = await (prisma as any).team.findFirst({
          where: { id: budget.scopeId, orgId },
          select: { name: true },
        })
        scopeName = team?.name || budget.scopeId
      }
    }

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      scopeType: budget.scopeType,
      scopeId: budget.scopeId,
      scopeName,
      period: budget.period as 'MONTHLY' | 'DAILY',
      currentSpend,
      limit,
      percentage,
      status,
      alertThresholdPct: threshold,
    }
  } catch (error) {
    console.error('Error computing budget status:', error)
    return null
  }
}

/**
 * Compute all active alerts for an organization
 */
export async function computeActiveAlerts(orgId: string): Promise<ActiveAlert[]> {
  try {
    // Get all enabled budgets
    const budgets = await prisma.budget.findMany({
      where: {
        orgId,
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        scopeType: true,
        scopeId: true,
        period: true,
        amountEur: true,
        alertThresholdPct: true,
      },
    })

    const alerts: ActiveAlert[] = []

    for (const budget of budgets) {
      const status = await computeBudgetStatus(orgId, budget.id)
      if (status && (status.status === 'WARNING' || status.status === 'CRITICAL')) {
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
          status: status.status,
          period: status.period,
        })
      }
    }

    // Sort by percentage (highest first)
    return alerts.sort((a, b) => b.percentage - a.percentage)
  } catch (error) {
    console.error('Error computing active alerts:', error)
    return []
  }
}

