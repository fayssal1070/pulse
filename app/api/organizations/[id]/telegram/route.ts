import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { telegramBotToken, telegramChatId } = await request.json()

    // Vérifier que l'utilisateur a accès à cette organisation
    const organization = await getOrganizationById(id, user.id)
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 403 }
      )
    }

    // Mettre à jour la configuration Telegram
    const updated = await prisma.organization.update({
      where: { id },
      data: {
        telegramBotToken: telegramBotToken || null,
        telegramChatId: telegramChatId || null,
      },
    })

    return NextResponse.json({
      success: true,
      telegramBotToken: updated.telegramBotToken ? '***' : null,
      telegramChatId: updated.telegramChatId,
    })
  } catch (error) {
    console.error('Telegram config update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

