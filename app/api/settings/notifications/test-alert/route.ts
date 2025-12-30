import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/notifications/email'
import { sendTelegram } from '@/lib/notifications/telegram'
import { formatAlertEmail, formatAlertTelegram } from '@/lib/notifications/format'
import { decrypt } from '@/lib/notifications/encryption'

/**
 * POST /api/settings/notifications/test-alert
 * Send a test alert notification (in-app, email, telegram) based on user preferences
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Get user notification preferences
    const prefs = await prisma.notificationPreference.findUnique({
      where: {
        orgId_userId: {
          orgId: activeOrg.id,
          userId: user.id,
        },
      },
    })

    // Create test alert data (minimal ActiveAlert shape for formatting)
    const testAlert = {
      id: 'test-alert',
      budgetId: 'test-budget',
      budgetName: 'Test Alert',
      status: 'OK' as const, // Use 'OK' for test (formatAlertEmail/Telegram handle test mode)
      percentage: 0,
      currentSpend: 0,
      limit: 0,
      scopeType: 'ORG' as const,
      scopeId: activeOrg.id,
      scopeName: activeOrg.name,
      period: 'MONTHLY' as const,
    }

    const results = {
      inApp: false,
      email: false,
      telegram: false,
      errors: [] as string[],
    }

    // Always create in-app notification
    try {
      await prisma.inAppNotification.create({
        data: {
          orgId: activeOrg.id,
          userId: user.id,
          title: 'Test Alert from Pulse',
          body: 'This is a test alert to verify your notification settings. If you see this, in-app notifications are working correctly.',
          readAt: null,
        },
      })
      results.inApp = true
    } catch (error: any) {
      results.errors.push(`In-app: ${error.message}`)
    }

    // Send email if enabled
    if (prefs?.emailEnabled) {
      try {
        const { subject, html } = formatAlertEmail(testAlert, activeOrg.name, true) // true = test mode
        const emailResult = await sendEmail({
          to: user.email,
          subject,
          html,
        })

        if (emailResult.success) {
          results.email = true
        } else {
          results.errors.push(`Email: ${emailResult.error || 'Failed to send'}`)
        }
      } catch (error: any) {
        results.errors.push(`Email: ${error.message}`)
      }
    }

    // Send Telegram if enabled
    if (prefs?.telegramEnabled && prefs.telegramChatId) {
      try {
        const orgIntegration = await prisma.orgIntegration.findUnique({
          where: { orgId: activeOrg.id },
          select: { telegramBotTokenEnc: true },
        })

        if (!orgIntegration?.telegramBotTokenEnc) {
          results.errors.push('Telegram: Bot token not configured for organization')
        } else {
          const botToken = decrypt(orgIntegration.telegramBotTokenEnc)
          if (!botToken) {
            results.errors.push('Telegram: Failed to decrypt bot token')
          } else {
            const telegramText = formatAlertTelegram(testAlert, activeOrg.name, true) // true = test mode
            const telegramResult = await sendTelegram({
              botToken,
              chatId: prefs.telegramChatId,
              text: telegramText,
            })

            if (telegramResult.success) {
              results.telegram = true
            } else {
              results.errors.push(`Telegram: ${telegramResult.error || 'Failed to send'}`)
            }
          }
        }
      } catch (error: any) {
        results.errors.push(`Telegram: ${error.message}`)
      }
    }

    const successCount = [results.inApp, results.email, results.telegram].filter(Boolean).length
    const totalAttempted = 1 + (prefs?.emailEnabled ? 1 : 0) + (prefs?.telegramEnabled && prefs.telegramChatId ? 1 : 0)

    return NextResponse.json({
      success: successCount > 0,
      message: `Test alert sent: ${successCount}/${totalAttempted} channels succeeded`,
      results,
    })
  } catch (error: any) {
    console.error('Error sending test alert:', error)
    return NextResponse.json({ error: error.message || 'Failed to send test alert' }, { status: 500 })
  }
}

