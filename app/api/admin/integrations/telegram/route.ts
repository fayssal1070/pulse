import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { encrypt, getLast4 } from '@/lib/notifications/encryption'
import { decrypt } from '@/lib/notifications/encryption'

/**
 * GET /api/admin/integrations/telegram
 * Get Telegram integration status (admin only)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const integration = await prisma.orgIntegration.findUnique({
      where: { orgId: activeOrg.id },
      select: {
        id: true,
        telegramBotTokenLast4: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      configured: !!integration,
      last4: integration?.telegramBotTokenLast4 || null,
      createdAt: integration?.createdAt || null,
      updatedAt: integration?.updatedAt || null,
    })
  } catch (error: any) {
    console.error('Error fetching Telegram integration:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch integration' }, { status: 500 })
  }
}

/**
 * POST /api/admin/integrations/telegram
 * Set Telegram bot token (admin only)
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const body = await request.json()
    const { botToken } = body

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({ error: 'Bot token is required' }, { status: 400 })
    }

    // Validate token format (basic check)
    if (!botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return NextResponse.json({ error: 'Invalid bot token format' }, { status: 400 })
    }

    // Encrypt token
    const encrypted = encrypt(botToken)
    const last4 = getLast4(botToken)

    // Upsert integration
    const integration = await prisma.orgIntegration.upsert({
      where: { orgId: activeOrg.id },
      update: {
        telegramBotTokenEnc: encrypted,
        telegramBotTokenLast4: last4,
      },
      create: {
        orgId: activeOrg.id,
        telegramBotTokenEnc: encrypted,
        telegramBotTokenLast4: last4,
      },
    })

    return NextResponse.json({
      message: 'Telegram bot token configured successfully',
      last4: integration.telegramBotTokenLast4,
      warning: 'Token encrypted and stored. It will not be shown again.',
    })
  } catch (error: any) {
    console.error('Error setting Telegram bot token:', error)
    return NextResponse.json({ error: error.message || 'Failed to set bot token' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/integrations/telegram
 * Remove Telegram bot token (admin only)
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    await prisma.orgIntegration.update({
      where: { orgId: activeOrg.id },
      data: {
        telegramBotTokenEnc: null,
        telegramBotTokenLast4: null,
      },
    })

    return NextResponse.json({ message: 'Telegram bot token removed successfully' })
  } catch (error: any) {
    console.error('Error removing Telegram bot token:', error)
    return NextResponse.json({ error: error.message || 'Failed to remove bot token' }, { status: 500 })
  }
}

