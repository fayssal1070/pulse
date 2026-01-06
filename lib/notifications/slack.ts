/**
 * Slack notification service
 */

interface SendSlackOptions {
  webhookUrl: string
  text: string
  title?: string
}

/**
 * Send Slack message via webhook
 */
export async function sendSlack({ webhookUrl, text, title }: SendSlackOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {
      text: title || 'Pulse Notification',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text,
          },
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(errorText || `HTTP ${response.status}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('[Slack] Failed to send message:', error.message)
    return { success: false, error: error.message || 'Slack send failed' }
  }
}

