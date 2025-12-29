import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { sendTelegram } from '@/lib/notifications/telegram'
import { decrypt } from '@/lib/notifications/encryption'

/**
 * POST /api/settings/notifications/test-telegram
 * Send test Telegram message to current user
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Get user notification preferences
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        orgId_userId: {
          orgId: activeOrg.id,
          userId: user.id,
        },
      },
    })

    if (!preference || !preference.telegramChatId) {
      return NextResponse.json({ error: 'Telegram chatId missing' }, { status: 400 })
    }

    // Get Telegram bot token from org integration
    const integration = await prisma.orgIntegration.findUnique({
      where: { orgId: activeOrg.id },
      select: { telegramBotTokenEnc: true },
    })

    if (!integration?.telegramBotTokenEnc) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 400 })
    }

    // Decrypt bot token
    let botToken: string
    try {
      botToken = decrypt(integration.telegramBotTokenEnc)
    } catch (error) {
      console.error('Failed to decrypt Telegram token:', error)
      return NextResponse.json({ error: 'Failed to decrypt Telegram bot token' }, { status: 500 })
    }

    // Send test Telegram message
    const result = await sendTelegram({
      botToken,
      chatId: preference.telegramChatId,
      text: `
✅ <b>Test Telegram Notification</b>

This is a test message from Pulse to verify your Telegram notifications are working correctly.

<b>Organization:</b> ${activeOrg.name}
<b>Time:</b> ${new Date().toLocaleString()}

If you received this message, your Telegram notifications are properly configured!
      `.trim(),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send test Telegram message' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Test Telegram message sent successfully' })
  } catch (error: any) {
    console.error('Error sending test Telegram:', error)
    return NextResponse.json({ error: error.message || 'Failed to send test Telegram message' }, { status: 500 })
  }
}

