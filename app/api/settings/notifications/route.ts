import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/settings/notifications
 * Get notification preferences for current user
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    let preference = await prisma.notificationPreference.findUnique({
      where: {
        orgId_userId: {
          orgId: activeOrg.id,
          userId: user.id,
        },
      },
    })

    // Create default if doesn't exist
    if (!preference) {
      preference = await prisma.notificationPreference.create({
        data: {
          orgId: activeOrg.id,
          userId: user.id,
          emailEnabled: true,
          telegramEnabled: false,
        },
      })
    }

    return NextResponse.json(preference)
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch preferences' }, { status: 500 })
  }
}

/**
 * POST/PATCH /api/settings/notifications
 * Update notification preferences for current user
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()
    const { emailEnabled, telegramEnabled, telegramChatId } = body

    // Validate telegramChatId if telegramEnabled
    if (telegramEnabled && !telegramChatId) {
      return NextResponse.json({ error: 'Telegram Chat ID is required when Telegram is enabled' }, { status: 400 })
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        orgId_userId: {
          orgId: activeOrg.id,
          userId: user.id,
        },
      },
      update: {
        emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
        telegramEnabled: telegramEnabled !== undefined ? telegramEnabled : undefined,
        telegramChatId: telegramChatId !== undefined ? telegramChatId : undefined,
      },
      create: {
        orgId: activeOrg.id,
        userId: user.id,
        emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
        telegramEnabled: telegramEnabled !== undefined ? telegramEnabled : false,
        telegramChatId: telegramChatId || null,
      },
    })

    return NextResponse.json(preference)
  } catch (error: any) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: error.message || 'Failed to update preferences' }, { status: 500 })
  }
}

