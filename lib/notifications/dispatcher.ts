/**
 * Notification dispatcher with retry support and delivery tracking
 */

import { prisma } from '@/lib/prisma'
import { sendEmail } from './email'
import { sendTelegram } from './telegram'
import { sendSlack } from './slack'
import { sendTeams } from './teams'
import { decrypt } from './encryption'

export type NotificationChannel = 'EMAIL' | 'TELEGRAM' | 'INAPP' | 'SLACK' | 'TEAMS'

export interface NotificationPayload {
  orgId: string
  userId?: string
  channel: NotificationChannel
  notificationId?: string
  title?: string
  text: string
  html?: string
  email?: string
  telegramChatId?: string
  slackWebhookUrl?: string
  teamsWebhookUrl?: string
}

const MAX_ATTEMPTS = 4
const RETRY_BACKOFFS = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000, 6 * 60 * 60 * 1000] // 5m, 30m, 2h, 6h

/**
 * Calculate next retry time based on attempt number
 */
function getNextRetryAt(attempt: number): Date | null {
  if (attempt >= MAX_ATTEMPTS) {
    return null // Max attempts reached, no more retries
  }
  const backoffMs = RETRY_BACKOFFS[attempt - 1] || RETRY_BACKOFFS[RETRY_BACKOFFS.length - 1]
  return new Date(Date.now() + backoffMs)
}

/**
 * Create or update NotificationDelivery record
 */
async function createDelivery(payload: NotificationPayload, status: string, attempt: number, error?: string): Promise<string> {
  const nextRetryAt = status === 'RETRYING' ? getNextRetryAt(attempt) : null

  // Check if delivery already exists (for retries)
  const existing = await prisma.notificationDelivery.findFirst({
    where: {
      orgId: payload.orgId,
      notificationId: payload.notificationId || null,
      channel: payload.channel,
      status: { in: ['PENDING', 'RETRYING'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    // Update existing delivery
    await prisma.notificationDelivery.update({
      where: { id: existing.id },
      data: {
        status,
        attempt,
        lastError: error || null,
        nextRetryAt,
        updatedAt: new Date(),
      },
    })
    return existing.id
  } else {
    // Create new delivery
    const delivery = await prisma.notificationDelivery.create({
      data: {
        orgId: payload.orgId,
        notificationId: payload.notificationId || null,
        channel: payload.channel,
        status,
        attempt,
        lastError: error || null,
        nextRetryAt,
      },
    })
    return delivery.id
  }
}

/**
 * Send notification and track delivery
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
  let deliveryId: string | undefined

  try {
    // Create initial delivery record (PENDING)
    deliveryId = await createDelivery(payload, 'PENDING', 1)

    let result: { success: boolean; error?: string }

    // Send based on channel
    switch (payload.channel) {
      case 'EMAIL':
        if (!payload.email) {
          throw new Error('Email address required for EMAIL channel')
        }
        result = await sendEmail({
          to: payload.email,
          subject: payload.title || 'Pulse Notification',
          html: payload.html || payload.text,
        })
        break

      case 'TELEGRAM':
        if (!payload.telegramChatId) {
          throw new Error('Telegram chat ID required for TELEGRAM channel')
        }
        // Get bot token
        const integration = await prisma.orgIntegration.findUnique({
          where: { orgId: payload.orgId },
          select: { telegramBotTokenEnc: true },
        })
        if (!integration?.telegramBotTokenEnc) {
          throw new Error('Telegram bot token not configured')
        }
        const botToken = decrypt(integration.telegramBotTokenEnc)
        result = await sendTelegram({
          botToken,
          chatId: payload.telegramChatId,
          text: payload.text,
        })
        break

      case 'SLACK':
        if (!payload.slackWebhookUrl) {
          throw new Error('Slack webhook URL required for SLACK channel')
        }
        result = await sendSlack({
          webhookUrl: payload.slackWebhookUrl,
          text: payload.text,
          title: payload.title,
        })
        break

      case 'TEAMS':
        if (!payload.teamsWebhookUrl) {
          throw new Error('Teams webhook URL required for TEAMS channel')
        }
        result = await sendTeams({
          webhookUrl: payload.teamsWebhookUrl,
          text: payload.text,
          title: payload.title,
        })
        break

      case 'INAPP':
        // In-app notifications are handled directly in the transaction
        // Mark as SENT immediately
        if (deliveryId) {
          await prisma.notificationDelivery.update({
            where: { id: deliveryId },
            data: { status: 'SENT', updatedAt: new Date() },
          })
        }
        return { success: true, deliveryId }

      default:
        throw new Error(`Unsupported channel: ${payload.channel}`)
    }

    // Update delivery status
    if (result.success) {
      if (deliveryId) {
        await prisma.notificationDelivery.update({
          where: { id: deliveryId },
          data: { status: 'SENT', updatedAt: new Date() },
        })
      }
      return { success: true, deliveryId }
    } else {
      // Mark for retry
      const nextRetryAt = getNextRetryAt(1)
      if (deliveryId) {
        await prisma.notificationDelivery.update({
          where: { id: deliveryId },
          data: {
            status: nextRetryAt ? 'RETRYING' : 'FAILED',
            attempt: 1,
            lastError: result.error || 'Send failed',
            nextRetryAt,
            updatedAt: new Date(),
          },
        })
      }
      return { success: false, deliveryId, error: result.error }
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error'
    
    // Mark for retry or fail
    const nextRetryAt = getNextRetryAt(1)
    if (deliveryId) {
      await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: nextRetryAt ? 'RETRYING' : 'FAILED',
          attempt: 1,
          lastError: errorMessage,
          nextRetryAt,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create delivery record even if initial creation failed
      deliveryId = await createDelivery(payload, nextRetryAt ? 'RETRYING' : 'FAILED', 1, errorMessage)
    }

    return { success: false, deliveryId, error: errorMessage }
  }
}

/**
 * Retry a failed notification delivery
 */
export async function retryDelivery(deliveryId: string): Promise<{ success: boolean; error?: string }> {
  const delivery = await prisma.notificationDelivery.findUnique({
    where: { id: deliveryId },
  })

  if (!delivery) {
    return { success: false, error: 'Delivery not found' }
  }

  if (delivery.status !== 'RETRYING') {
    return { success: false, error: `Delivery is not in RETRYING status (current: ${delivery.status})` }
  }

  if (delivery.attempt >= MAX_ATTEMPTS) {
    // Mark as failed
    await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'FAILED', nextRetryAt: null, updatedAt: new Date() },
    })
    return { success: false, error: 'Max attempts reached' }
  }

  // Reconstruct payload from delivery record
  // Note: We need to get webhook URLs from OrgIntegration
  const integration = await prisma.orgIntegration.findUnique({
    where: { orgId: delivery.orgId },
  })

  let payload: NotificationPayload = {
    orgId: delivery.orgId,
    channel: delivery.channel as NotificationChannel,
    notificationId: delivery.notificationId || undefined,
    text: '', // Will be reconstructed if needed
  }

  // Get webhook URLs if needed
  if (delivery.channel === 'SLACK' && integration?.slackWebhookUrlEnc) {
    payload.slackWebhookUrl = decrypt(integration.slackWebhookUrlEnc)
  } else if (delivery.channel === 'TEAMS' && integration?.teamsWebhookUrlEnc) {
    payload.teamsWebhookUrl = decrypt(integration.teamsWebhookUrlEnc)
  }

  // For now, we'll mark as failed if we can't reconstruct
  // In a real implementation, you might want to store more context
  if ((delivery.channel === 'SLACK' && !payload.slackWebhookUrl) ||
      (delivery.channel === 'TEAMS' && !payload.teamsWebhookUrl)) {
    await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: { status: 'FAILED', nextRetryAt: null, updatedAt: new Date() },
    })
    return { success: false, error: 'Cannot retry: missing configuration' }
  }

  // Update attempt count before retry
  const newAttempt = delivery.attempt + 1
  const nextRetryAt = getNextRetryAt(newAttempt)

  // Retry send
  const result = await dispatchNotification(payload)

  if (!result.success) {
    // Update delivery with new attempt
    await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        attempt: newAttempt,
        lastError: result.error || 'Retry failed',
        nextRetryAt: nextRetryAt || null,
        status: nextRetryAt ? 'RETRYING' : 'FAILED',
        updatedAt: new Date(),
      },
    })
  }

  return result
}

