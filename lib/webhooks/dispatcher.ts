/**
 * Enhanced webhook dispatcher with delivery logging and anti-replay signature (PR19)
 * Fail-soft: errors should not break main request flow
 */

import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'
import { decryptWebhookSecret } from './crypto'

export type WebhookEvent = 'cost_event.created' | 'alert_event.triggered' | 'ai_request.completed'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  orgId: string
  data: Record<string, any>
}

/**
 * Sign payload with HMAC SHA256 (anti-replay: timestamp + payload)
 */
function signPayload(payload: string, secret: string, timestamp: string): string {
  // Anti-replay: sign timestamp + payload
  const message = `${timestamp}.${payload}`
  return createHmac('sha256', secret).update(message).digest('hex')
}

/**
 * Deliver webhook with retry (3 attempts: 1s, 5s, 30s) and log delivery
 */
async function deliverWebhook(
  webhookId: string,
  orgId: string,
  url: string,
  payload: WebhookPayload,
  secret: string,
  eventType: WebhookEvent,
  attempt: number = 1,
  requestId?: string
): Promise<{ success: boolean; httpStatus?: number; error?: string; durationMs: number }> {
  const maxAttempts = 3
  const backoffDelays = [1000, 5000, 30000] // 1s, 5s, 30s
  const payloadStr = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = signPayload(payloadStr, secret, timestamp)
  const deliveryRequestId = requestId || `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`

  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pulse-signature': signature,
        'x-pulse-event': payload.event,
        'x-pulse-id': deliveryRequestId,
        'x-pulse-timestamp': timestamp,
        'User-Agent': 'Pulse-Webhooks/1.0',
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    const durationMs = Date.now() - startTime
    const httpStatus = response.status
    const success = response.ok

    // Log delivery
    await prisma.orgWebhookDelivery.create({
      data: {
        orgId,
        webhookId,
        eventType,
        status: success ? 'SUCCESS' : 'FAIL',
        attempt,
        httpStatus,
        error: success ? null : `HTTP ${httpStatus}`,
        requestId: deliveryRequestId,
        durationMs,
        payloadJson: attempt === maxAttempts ? payloadStr : null, // Store payload only on last attempt
      },
    })

    if (success) {
      return { success: true, httpStatus, durationMs }
    }

    // Non-2xx status - retry if attempts left
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, backoffDelays[attempt - 1]))
      return deliverWebhook(webhookId, orgId, url, payload, secret, eventType, attempt + 1, deliveryRequestId)
    }

    return { success: false, httpStatus, error: `HTTP ${httpStatus}`, durationMs }
  } catch (error: any) {
    const durationMs = Date.now() - startTime
    const errorMessage = error.message || 'Network error'

    // Log delivery failure
    await prisma.orgWebhookDelivery.create({
      data: {
        orgId,
        webhookId,
        eventType,
        status: 'FAIL',
        attempt,
        error: errorMessage.substring(0, 500), // Truncate to 500 chars
        requestId: deliveryRequestId,
        durationMs,
        payloadJson: attempt === maxAttempts ? payloadStr : null,
      },
    }).catch((logError) => {
      console.error('Failed to log webhook delivery:', logError)
      // Don't throw - fail-soft
    })

    // Network/timeout error - retry if attempts left
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, backoffDelays[attempt - 1]))
      return deliverWebhook(webhookId, orgId, url, payload, secret, eventType, attempt + 1, deliveryRequestId)
    }

    return { success: false, error: errorMessage, durationMs }
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
    const deliveries = webhooks.map(async (webhook) => {
      try {
        // Decrypt secret
        const secret = decryptWebhookSecret(webhook.secretEnc)
        await deliverWebhook(
          webhook.id,
          orgId,
          webhook.url,
          payload,
          secret,
          event,
          1
        )
      } catch (error: any) {
        console.error(`Webhook delivery error for ${webhook.url}:`, error)
        // Log delivery failure
        await prisma.orgWebhookDelivery.create({
          data: {
            orgId,
            webhookId: webhook.id,
            eventType: event,
            status: 'FAIL',
            attempt: 1,
            error: error.message?.substring(0, 500) || 'Unknown error',
          },
        }).catch(() => {
          // Fail-soft: already logged
        })
      }
    })

    // Wait for all deliveries but don't fail if any fail
    await Promise.allSettled(deliveries)
  } catch (error) {
    // Fail-soft: log but don't throw
    console.error('Webhook dispatch error (fail-soft):', error)
  }
}

