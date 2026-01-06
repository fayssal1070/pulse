/**
 * Microsoft Teams notification service
 */

interface SendTeamsOptions {
  webhookUrl: string
  text: string
  title?: string
}

/**
 * Send Microsoft Teams message via webhook
 */
export async function sendTeams({ webhookUrl, text, title }: SendTeamsOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: title || 'Pulse Notification',
      themeColor: '0078D4',
      title: title || 'Pulse Notification',
      text: text,
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
    console.error('[Teams] Failed to send message:', error.message)
    return { success: false, error: error.message || 'Teams send failed' }
  }
}

