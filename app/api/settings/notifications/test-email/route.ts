import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { sendEmail } from '@/lib/notifications/email'

/**
 * POST /api/settings/notifications/test-email
 * Send test email to current user
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Check if email service is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 400 })
    }

    // Send test email
    const emailFrom = process.env.EMAIL_FROM || 'noreply@pulse.app'
    const result = await sendEmail({
      to: user.email,
      subject: 'Pulse - Test Email Notification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Test Email Notification</h1>
            </div>
            <div class="content">
              <p>This is a test email from Pulse to verify your email notifications are working correctly.</p>
              <p><strong>Organization:</strong> ${activeOrg.name}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p>If you received this email, your email notifications are properly configured!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Test email sent successfully' })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: error.message || 'Failed to send test email' }, { status: 500 })
  }
}

