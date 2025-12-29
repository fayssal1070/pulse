/**
 * Telegram notification service
 */

interface SendTelegramOptions {
  botToken: string
  chatId: string
  text: string
}

/**
 * Send Telegram message
 */
export async function sendTelegram({ botToken, chatId, text }: SendTelegramOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML', // Support basic HTML formatting
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ description: 'Unknown error' }))
      throw new Error(errorData.description || `HTTP ${response.status}`)
    }

    return { success: true }
  } catch (error: any) {
    console.error('[Telegram] Failed to send message:', error.message)
    // Fail soft - don't throw, just log
    return { success: false, error: error.message || 'Telegram send failed' }
  }
}

