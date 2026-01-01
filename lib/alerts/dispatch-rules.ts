/**
 * Dispatch alert rules - Send notifications for rule-based alerts
 * Similar to dispatch.ts but for AlertRule events
 */

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/notifications/email'
import { sendTelegram } from '@/lib/notifications/telegram'
import { formatAlertEmail, formatAlertTelegram } from '@/lib/notifications/format'
import { decrypt } from '@/lib/notifications/encryption'
import type { AlertEventPayload } from './rules-engine'

interface DispatchRulesResult {
  triggered: number
  sentEmail: number
  sentTelegram: number
  errors: string[]
}

/**
 * Get notification recipients for an organization
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
 * Get notification preference for a user
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
 * Get Telegram bot token (decrypted)
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
    console.error(`[DispatchRules] Failed to decrypt Telegram token for org ${orgId}:`, error)
    return null
  }
}

/**
 * Format alert message for email/telegram (simplified version)
 */
function formatRuleAlertMessage(ruleName: string, payload: AlertEventPayload, orgName: string): string {
  return `${payload.severity === 'CRITICAL' ? '🔴' : payload.severity === 'WARN' ? '⚠️' : 'ℹ️'} ${ruleName}: ${payload.message}`
}

/**
 * Dispatch alert rules for a single organization
 */
export async function dispatchRulesForOrg(orgId: string): Promise<DispatchRulesResult> {
  const result: DispatchRulesResult = {
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

    // Get enabled alert rules
    const rules = await prisma.alertRule.findMany({
      where: {
        orgId,
        enabled: true,
      },
    })

    if (rules.length === 0) {
      return result
    }

    // Get recipients
    const recipients = await getRecipients(orgId)
    if (recipients.length === 0) {
      result.errors.push(`No recipients found for org ${orgId}`)
      return result
    }

    // Get Telegram bot token
    const telegramBotToken = await getTelegramBotToken(orgId)

    const now = new Date()

    // Process each rule
    for (const rule of rules) {
      try {
        // Import rules engine dynamically to avoid circular deps
        const { computeAlertRuleMatches } = await import('./rules-engine')
        const { shouldCreateEvent, createAlertEvents } = await import('./events-store')

        // Compute matches
        const payloads = await computeAlertRuleMatches(orgId, rule, now)

        if (payloads.length === 0) {
          continue
        }

        // Check cooldown and create events
        const check = await shouldCreateEvent(rule.id, orgId, now)
        if (!check.should) {
          continue
        }

        // Create events
        const eventIds = await createAlertEvents(orgId, rule.id, payloads)

        if (eventIds.length === 0) {
          continue
        }

        result.triggered += eventIds.length

        // Send notifications for each payload
        for (const payload of payloads) {
          for (const recipient of recipients) {
            try {
              const prefs = await getNotificationPreference(orgId, recipient.userId)

              // Send email if enabled
              if (prefs.emailEnabled) {
                const subject = `Alert: ${rule.name}`
                const html = `
                  <h2>${payload.severity === 'CRITICAL' ? '🔴 CRITICAL' : payload.severity === 'WARN' ? '⚠️ WARNING' : 'ℹ️ INFO'}: ${rule.name}</h2>
                  <p>${payload.message}</p>
                  <p><strong>Amount:</strong> €${payload.amountEUR.toFixed(2)}</p>
                  <p><strong>Period:</strong> ${payload.periodStart.toLocaleDateString()} - ${payload.periodEnd.toLocaleDateString()}</p>
                  <p><small>Organization: ${org.name}</small></p>
                `
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

              // Send Telegram if enabled
              if (prefs.telegramEnabled && prefs.telegramChatId && telegramBotToken) {
                const telegramText = formatRuleAlertMessage(rule.name, payload, org.name)
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

              // Create InAppNotification
              await prisma.inAppNotification.create({
                data: {
                  orgId,
                  userId: null, // Org-wide
                  title: `${payload.severity === 'CRITICAL' ? '🔴' : payload.severity === 'WARN' ? '⚠️' : 'ℹ️'} ${rule.name}`,
                  body: payload.message,
                },
              })
            } catch (error: any) {
              result.errors.push(`Failed to notify user ${recipient.userId}: ${error.message}`)
            }
          }
        }
      } catch (error: any) {
        result.errors.push(`Failed to process rule ${rule.id}: ${error.message}`)
      }
    }
  } catch (error: any) {
    result.errors.push(`Failed to dispatch rules for org ${orgId}: ${error.message}`)
  }

  return result
}

