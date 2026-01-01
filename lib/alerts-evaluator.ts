import { prisma } from './prisma'
import { getCurrentMonthCosts } from './budget'

export interface AlertEvaluationResult {
  alertId: string
  orgId: string
  triggered: boolean
  amountEUR: number
  message: string
  periodStart: Date
  periodEnd: Date
  metadata?: any
}

/**
 * Evaluate a MONTHLY_BUDGET alert
 */
export async function evaluateMonthlyBudgetAlert(
  alert: {
    id: string
    orgId: string
    name: string
    thresholdEUR: number | null
    lastTriggeredAt: Date | null
    cooldownHours: number
  }
): Promise<AlertEvaluationResult | null> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Check cooldown
  if (alert.lastTriggeredAt) {
    const hoursSinceLastTrigger =
      (now.getTime() - alert.lastTriggeredAt.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastTrigger < alert.cooldownHours) {
      return null // Still in cooldown
    }
  }

  // Get month-to-date costs
  const spentMTD = await getCurrentMonthCosts(alert.orgId)

  // Check thresholds: 50%, 80%, 100%
  if (!alert.thresholdEUR) {
    return null // No threshold set
  }

  const thresholds = [
    { percent: 50, value: alert.thresholdEUR * 0.5 },
    { percent: 80, value: alert.thresholdEUR * 0.8 },
    { percent: 100, value: alert.thresholdEUR },
  ]

  // Find which threshold was crossed (if any)
  let triggeredThreshold = null
  for (const threshold of thresholds) {
    if (spentMTD >= threshold.value) {
      triggeredThreshold = threshold
    }
  }

  if (!triggeredThreshold) {
    return null // No threshold crossed
  }

  // Check if we already triggered for this threshold today
  // (Simple check: if lastTriggeredAt is today and we're at the same threshold, skip)
  if (alert.lastTriggeredAt) {
    const lastTriggeredDate = new Date(alert.lastTriggeredAt)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastTriggeredDay = new Date(
      lastTriggeredDate.getFullYear(),
      lastTriggeredDate.getMonth(),
      lastTriggeredDate.getDate()
    )

    if (lastTriggeredDay.getTime() === today.getTime()) {
      // Already triggered today, skip to avoid spam
      return null
    }
  }

  const percentage = (spentMTD / alert.thresholdEUR) * 100
  const message = `${alert.name}: Monthly budget ${triggeredThreshold.percent}% threshold reached. Spent ${spentMTD.toFixed(2)} EUR (${percentage.toFixed(1)}%) of ${alert.thresholdEUR.toFixed(2)} EUR budget.`

  return {
    alertId: alert.id,
    orgId: alert.orgId,
    triggered: true,
    amountEUR: spentMTD,
    message,
    periodStart: startOfMonth,
    periodEnd: now,
    metadata: {
      thresholdPercent: triggeredThreshold.percent,
      budgetEUR: alert.thresholdEUR,
      percentage,
    },
  }
}

/**
 * Evaluate a DAILY_SPIKE alert
 */
export async function evaluateDailySpikeAlert(
  alert: {
    id: string
    orgId: string
    name: string
    thresholdEUR: number | null
    spikePercent: number | null
    lookbackDays: number
    lastTriggeredAt: Date | null
    cooldownHours: number
  }
): Promise<AlertEvaluationResult | null> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  today.setHours(0, 0, 0, 0)

  // Check cooldown
  if (alert.lastTriggeredAt) {
    const hoursSinceLastTrigger =
      (now.getTime() - alert.lastTriggeredAt.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastTrigger < alert.cooldownHours) {
      return null // Still in cooldown
    }
  }

  // Get today's costs
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const todayCosts = await prisma.costRecord.aggregate({
    where: {
      orgId: alert.orgId,
      date: {
        gte: today,
        lte: todayEnd,
      },
    },
    _sum: {
      amountEUR: true,
    },
  })

  const todayAmount = todayCosts._sum.amountEUR || 0

  // Get baseline (average of last N days, excluding today)
  const baselineStart = new Date(today)
  baselineStart.setDate(baselineStart.getDate() - alert.lookbackDays)

  const baselineCosts = await prisma.costRecord.aggregate({
    where: {
      orgId: alert.orgId,
      date: {
        gte: baselineStart,
        lt: today, // Exclude today
      },
    },
    _sum: {
      amountEUR: true,
    },
  })

  const baselineTotal = baselineCosts._sum.amountEUR || 0
  const baselineAverage = baselineTotal / alert.lookbackDays

  // Check if triggered by fixed threshold
  if (alert.thresholdEUR && todayAmount >= alert.thresholdEUR) {
    const message = `${alert.name}: Daily threshold exceeded. Today's spend: ${todayAmount.toFixed(2)} EUR (threshold: ${alert.thresholdEUR.toFixed(2)} EUR).`

    return {
      alertId: alert.id,
      orgId: alert.orgId,
      triggered: true,
      amountEUR: todayAmount,
      message,
      periodStart: today,
      periodEnd: todayEnd,
      metadata: {
        baselineAverage,
        spikePercent: baselineAverage > 0 ? ((todayAmount - baselineAverage) / baselineAverage) * 100 : 999,
        thresholdType: 'fixed',
      },
    }
  }

  // Check if triggered by spike percentage
  if (alert.spikePercent && baselineAverage > 0) {
    const spikePercent = ((todayAmount - baselineAverage) / baselineAverage) * 100

    if (spikePercent >= alert.spikePercent) {
      const message = `${alert.name}: Daily spike detected. Today's spend: ${todayAmount.toFixed(2)} EUR (${spikePercent.toFixed(1)}% increase vs ${alert.lookbackDays}-day average of ${baselineAverage.toFixed(2)} EUR).`

      return {
        alertId: alert.id,
        orgId: alert.orgId,
        triggered: true,
        amountEUR: todayAmount,
        message,
        periodStart: today,
        periodEnd: todayEnd,
        metadata: {
          baselineAverage,
          spikePercent,
          thresholdType: 'percentage',
        },
      }
    }
  }

  // Handle edge case: baseline = 0 but today > 0
  if (baselineAverage === 0 && todayAmount > 0 && alert.spikePercent) {
    // This is a spike from zero, treat as 999% spike
    const message = `${alert.name}: Daily spike detected. Today's spend: ${todayAmount.toFixed(2)} EUR (new activity detected, baseline was 0 EUR).`

    return {
      alertId: alert.id,
      orgId: alert.orgId,
      triggered: true,
      amountEUR: todayAmount,
      message,
      periodStart: today,
      periodEnd: todayEnd,
      metadata: {
        baselineAverage: 0,
        spikePercent: 999,
        thresholdType: 'percentage',
      },
    }
  }

  return null // No trigger
}

/**
 * Evaluate all enabled alerts for an organization
 */
export async function evaluateOrganizationAlerts(orgId: string): Promise<AlertEvaluationResult[]> {
  const alerts = await prisma.alertRule.findMany({
    where: {
      orgId,
      enabled: true,
    },
  })

  const results: AlertEvaluationResult[] = []

  for (const alert of alerts) {
    let result: AlertEvaluationResult | null = null

    if (alert.type === 'MONTHLY_BUDGET') {
      result = await evaluateMonthlyBudgetAlert({
        id: alert.id,
        orgId: alert.orgId,
        name: alert.name,
        thresholdEUR: alert.thresholdEUR,
        lastTriggeredAt: alert.lastTriggeredAt,
        cooldownHours: alert.cooldownHours,
      })
    } else if (alert.type === 'DAILY_SPIKE') {
      result = await evaluateDailySpikeAlert({
        id: alert.id,
        orgId: alert.orgId,
        name: alert.name,
        thresholdEUR: alert.thresholdEUR || 0,
        spikePercent: alert.spikePercent,
        lookbackDays: alert.lookbackDays,
        lastTriggeredAt: alert.lastTriggeredAt,
        cooldownHours: alert.cooldownHours,
      })
    }

    if (result && result.triggered) {
      results.push(result)
    }
  }

  return results
}

/**
 * Create AlertEvent and InAppNotification from evaluation result
 */
export async function createAlertNotifications(
  result: AlertEvaluationResult,
  userIds: string[] // Members of the organization
): Promise<void> {
  // Create AlertEvent
  await prisma.alertEvent.create({
    data: {
      orgId: result.orgId,
      alertId: result.alertId,
      triggeredAt: new Date(),
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      amountEUR: result.amountEUR,
      message: result.message,
      metadata: result.metadata ? JSON.stringify(result.metadata) : null,
    },
  })

  // Update alert's lastTriggeredAt
  await prisma.alertRule.update({
    where: { id: result.alertId },
    data: {
      lastTriggeredAt: new Date(),
    },
  })

  // Create InAppNotification for each user
  const notifications = userIds.map((userId) => ({
    orgId: result.orgId,
    userId,
    title: 'Alert Triggered',
    body: result.message,
  }))

  if (notifications.length > 0) {
    await prisma.inAppNotification.createMany({
      data: notifications,
    })
  }

  // Also create an org-wide notification (userId = null)
  await prisma.inAppNotification.create({
    data: {
      orgId: result.orgId,
      userId: null,
      title: 'Alert Triggered',
      body: result.message,
    },
  })
}




