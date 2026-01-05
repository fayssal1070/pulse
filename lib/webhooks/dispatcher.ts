/**
 * Webhook dispatcher for events
 * Fail-soft: errors should not break main request flow
 */

import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

export type WebhookEvent = 'cost_event.created' | 'alert_event.triggered' | 'ai_request.completed'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  orgId: string
  data: Record<string, any>
}

/**
 * Sign payload with HMAC SHA256
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Deliver webhook with retry (3 attempts, exponential backoff)
 */
async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string,
  attempt: number = 1
): Promise<boolean> {
  const maxAttempts = 3
  const payloadStr = JSON.stringify(payload)
  const signature = signPayload(payloadStr, secret)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pulse-signature': signature,
        'User-Agent': 'Pulse-Webhooks/1.0',
      },
      body: payloadStr,
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      return true
    }

    // Non-2xx status - retry if attempts left
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000)) // Exponential backoff
      return deliverWebhook(url, payload, secret, attempt + 1)
    }

    return false
  } catch (error) {
    // Network/timeout error - retry if attempts left
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      return deliverWebhook(url, payload, secret, attempt + 1)
    }

    console.error(`Webhook delivery failed after ${maxAttempts} attempts:`, error)
    return false
  }
}

/**
 * Dispatch webhook events to enabled webhooks for an organization
 * Fail-soft: errors are logged but don't throw
 */
export async function dispatchWebhook(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, any>
): Promise<void> {
  try {
    // Find enabled webhooks for this org that subscribe to this event
    const webhooks = await prisma.orgWebhook.findMany({
      where: {
        orgId,
        enabled: true,
        events: {
          has: event,
        },
      },
    })

    if (webhooks.length === 0) {
      return // No webhooks to deliver
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      orgId,
      data,
    }

    // Deliver to all matching webhooks (async, don't wait)
    const deliveries = webhooks.map((webhook) =>
      deliverWebhook(webhook.url, payload, webhook.secret).catch((error) => {
        console.error(`Webhook delivery error for ${webhook.url}:`, error)
        // Don't throw - fail-soft
      })
    )

    // Wait for all deliveries but don't fail if any fail
    await Promise.allSettled(deliveries)
  } catch (error) {
    // Fail-soft: log but don't throw
    console.error('Webhook dispatch error (fail-soft):', error)
  }
}

