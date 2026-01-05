/**
 * Alert Events Store - Handle deduplication, cooldown, and event creation
 */

import { prisma } from '@/lib/prisma'
import type { AlertEventPayload } from './rules-engine'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

/**
 * Check if alert should trigger (cooldown + dedup)
 */
export async function shouldCreateEvent(
  alertId: string,
  orgId: string,
  now: Date
): Promise<{ should: boolean; reason?: string }> {
  // Get alert rule
  const alertRule = await prisma.alertRule.findUnique({
    where: { id: alertId, orgId },
    select: {
      id: true,
      cooldownHours: true,
      lastTriggeredAt: true,
    },
  })

  if (!alertRule) {
    return { should: false, reason: 'Alert rule not found' }
  }

  // Check cooldown
  if (alertRule.lastTriggeredAt) {
    const cooldownMs = (alertRule.cooldownHours || 24) * 60 * 60 * 1000
    const timeSinceLastTrigger = now.getTime() - alertRule.lastTriggeredAt.getTime()

    if (timeSinceLastTrigger < cooldownMs) {
      const remainingHours = Math.ceil((cooldownMs - timeSinceLastTrigger) / (60 * 60 * 1000))
      return { should: false, reason: `Cooldown active (${remainingHours}h remaining)` }
    }
  }

  // Check dedup: look for recent AlertEvent with same alertId and overlapping period
  // For simplicity, check if there's an event in the last hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const recentEvent = await prisma.alertEvent.findFirst({
    where: {
      alertId,
      orgId,
      triggeredAt: { gte: oneHourAgo },
    },
  })

  if (recentEvent) {
    return { should: false, reason: 'Duplicate alert (recent event exists)' }
  }

  return { should: true }
}

/**
 * Create AlertEvent and update AlertRule.lastTriggeredAt
 */
export async function createAlertEvent(
  orgId: string,
  alertId: string,
  payload: AlertEventPayload
): Promise<string> {
  const event = await prisma.$transaction(async (tx) => {
    // Create AlertEvent
    const newEvent = await tx.alertEvent.create({
      data: {
        orgId,
        alertId,
        triggeredAt: new Date(),
        periodStart: payload.periodStart,
        periodEnd: payload.periodEnd,
        severity: payload.severity,
        amountEUR: payload.amountEUR,
        message: payload.message,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      },
    })

    // Update AlertRule lastTriggeredAt
    await tx.alertRule.update({
      where: { id: alertId },
      data: { lastTriggeredAt: new Date() },
    })

    return newEvent
  })

  // Dispatch webhook (fail-soft, async - after transaction)
  dispatchWebhook(orgId, 'alert_event.triggered', {
    alertEventId: event.id,
    alertId,
    severity: payload.severity,
    amountEUR: payload.amountEUR,
    message: payload.message,
  }).catch(() => {
    // Fail-soft: already handled in dispatchWebhook
  })

  return event.id
}

/**
 * Batch create events (with dedup check for each)
 */
export async function createAlertEvents(
  orgId: string,
  alertId: string,
  payloads: AlertEventPayload[]
): Promise<string[]> {
  const now = new Date()
  const createdIds: string[] = []

  for (const payload of payloads) {
    // Check if should create
    const check = await shouldCreateEvent(alertId, orgId, now)
    if (!check.should) {
      continue
    }

    // Create event
    const eventId = await createAlertEvent(orgId, alertId, payload)
    createdIds.push(eventId)
  }

  return createdIds
}

