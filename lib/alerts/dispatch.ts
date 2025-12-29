/**
 * Alert dispatch service
 * Handles triggering alerts, creating events, and sending notifications
 */

import { prisma } from '@/lib/prisma'
import { computeActiveAlerts, type ActiveAlert } from './engine'
import { sendEmail } from '@/lib/notifications/email'
import { sendTelegram } from '@/lib/notifications/telegram'
import { formatAlertEmail, formatAlertTelegram } from '@/lib/notifications/format'
import { decrypt } from '@/lib/notifications/encryption'

interface DispatchResult {
  triggered: number
  sentEmail: number
  sentTelegram: number
  errors: string[]
}

/**
 * Check if alert should trigger (cooldown + dedup)
 */
async function shouldTrigger(alertId: string, orgId: string, now: Date): Promise<{ should: boolean; reason?: string }> {
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
 * Get notification recipients for an organization
 * Returns users with roles: admin, finance, manager
 */
async function getRecipients(orgId: string): Promise<Array<{ userId: string; email: string; role: string }>> {
  const memberships = await prisma.membership.findMany({
    where: {
      orgId,
      role: { in: ['admin', 'finance', 'manager', 'owner'] },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  return memberships.map((m) => ({
    userId: m.user.id,
    email: m.user.email,
    role: m.role,
  }))
}

/**
 * Get or create notification preference for a user
 */
async function getNotificationPreference(orgId: string, userId: string) {
  let pref = await prisma.notificationPreference.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
  })

  if (!pref) {
    // Create default preference
    pref = await prisma.notificationPreference.create({
      data: {
        orgId,
        userId,
        emailEnabled: true,
        telegramEnabled: false,
      },
    })
  }

  return pref
}

/**
 * Get Telegram bot token for organization (decrypted)
 */
async function getTelegramBotToken(orgId: string): Promise<string | null> {
  const integration = await prisma.orgIntegration.findUnique({
    where: { orgId },
    select: { telegramBotTokenEnc: true },
  })

  if (!integration?.telegramBotTokenEnc) {
    return null
  }

  try {
    return decrypt(integration.telegramBotTokenEnc)
  } catch (error) {
    console.error(`[Dispatch] Failed to decrypt Telegram token for org ${orgId}:`, error)
    return null
  }
}

/**
 * Dispatch alerts for a single organization
 */
export async function dispatchAlertsForOrg(orgId: string): Promise<DispatchResult> {
  const result: DispatchResult = {
    triggered: 0,
    sentEmail: 0,
    sentTelegram: 0,
    errors: [],
  }

  try {
    // Get organization name
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    })

    if (!org) {
      result.errors.push(`Organization ${orgId} not found`)
      return result
    }

    // Compute active alerts
    const activeAlerts = await computeActiveAlerts(orgId)

    if (activeAlerts.length === 0) {
      return result // No alerts to dispatch
    }

    // Get recipients
    const recipients = await getRecipients(orgId)
    if (recipients.length === 0) {
      result.errors.push(`No recipients found for org ${orgId}`)
      return result
    }

    // Get Telegram bot token (once per org)
    const telegramBotToken = await getTelegramBotToken(orgId)

    const now = new Date()

    // Process each alert
    for (const alert of activeAlerts) {
      try {
        // Check if should trigger
        const triggerCheck = await shouldTrigger(alert.budgetId, orgId, now)
        if (!triggerCheck.should) {
          continue // Skip due to cooldown or dedup
        }

        // Calculate period for AlertEvent
        const periodStart = alert.period === 'DAILY' 
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
          : new Date(now.getFullYear(), now.getMonth(), 1)
        const periodEnd = now

        // Create AlertEvent and InAppNotification in transaction
        await prisma.$transaction(async (tx) => {
          // Create AlertEvent
          await tx.alertEvent.create({
            data: {
              orgId,
              alertId: alert.budgetId,
              triggeredAt: now,
              periodStart,
              periodEnd,
              amountEUR: alert.currentSpend,
              message: `${alert.budgetName} exceeded ${alert.percentage.toFixed(1)}% (${alert.status})`,
              metadata: JSON.stringify({
                limit: alert.limit,
                percentage: alert.percentage,
                scopeType: alert.scopeType,
                scopeId: alert.scopeId,
              }),
            },
          })

          // Create InAppNotification (org-wide, userId = null)
          await tx.inAppNotification.create({
            data: {
              orgId,
              userId: null, // Org-wide
              title: `${alert.status === 'CRITICAL' ? '🔴' : '⚠️'} ${alert.budgetName}`,
              body: `Budget exceeded ${alert.percentage.toFixed(1)}% (€${alert.currentSpend.toFixed(2)} / €${alert.limit.toFixed(2)})`,
            },
          })

          // Update AlertRule lastTriggeredAt
          await tx.alertRule.update({
            where: { id: alert.budgetId },
            data: { lastTriggeredAt: now },
          })
        })

        result.triggered++

        // Send notifications to each recipient
        for (const recipient of recipients) {
          try {
            const prefs = await getNotificationPreference(orgId, recipient.userId)

            // Send email if enabled
            if (prefs.emailEnabled) {
              const { subject, html } = formatAlertEmail(alert, org.name)
              const emailResult = await sendEmail({
                to: recipient.email,
                subject,
                html,
              })

              if (emailResult.success) {
                result.sentEmail++
              } else {
                result.errors.push(`Email failed for ${recipient.email}: ${emailResult.error}`)
              }
            }

            // Send Telegram if enabled and bot token available
            if (prefs.telegramEnabled && prefs.telegramChatId && telegramBotToken) {
              const telegramText = formatAlertTelegram(alert, org.name)
              const telegramResult = await sendTelegram({
                botToken: telegramBotToken,
                chatId: prefs.telegramChatId,
                text: telegramText,
              })

              if (telegramResult.success) {
                result.sentTelegram++
              } else {
                result.errors.push(`Telegram failed for user ${recipient.userId}: ${telegramResult.error}`)
              }
            }
          } catch (error: any) {
            // Fail soft - log but continue
            result.errors.push(`Failed to notify user ${recipient.userId}: ${error.message}`)
          }
        }
      } catch (error: any) {
        // Fail soft - log but continue with next alert
        result.errors.push(`Failed to process alert ${alert.budgetId}: ${error.message}`)
      }
    }
  } catch (error: any) {
    result.errors.push(`Failed to dispatch alerts for org ${orgId}: ${error.message}`)
  }

  return result
}

