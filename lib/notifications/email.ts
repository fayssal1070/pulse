/**
 * Email notification service
 * Uses Resend API (recommended) or fallback to SMTP
 */

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send email via Resend API
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || 'noreply@pulse.app'

  if (!resendApiKey) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return { success: true }
  } catch (error: any) {
    console.error('[Email] Failed to send email:', error.message)
    // Fail soft - don't throw, just log
    return { success: false, error: error.message || 'Email send failed' }
  }
}

