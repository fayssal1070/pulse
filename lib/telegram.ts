// Fonction utilitaire pour envoyer un message Telegram
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Telegram API error: ${response.status}`, errorData)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

// Formater un message d'alerte
export function formatAlertMessage(
  orgName: string,
  thresholdEUR: number,
  totalEUR: number,
  windowDays: number
): string {
  return `🚨 <b>Alert Triggered</b>

<b>Organization:</b> ${orgName}
<b>Rule:</b> ${thresholdEUR.toFixed(2)} EUR threshold
<b>Amount:</b> ${totalEUR.toFixed(2)} EUR
<b>Period:</b> Last ${windowDays} days`
}
