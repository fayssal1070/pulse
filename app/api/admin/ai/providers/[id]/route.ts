import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { encryptSecret } from '@/lib/ai/providers/crypto'
import { AiProviderConnectionStatus } from '@prisma/client'

/**
 * PATCH /api/admin/ai/providers/[id]
 * Update provider connection (rename, enable/disable, rotate key)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    await requireAdmin()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, status, apiKey } = body

    // Verify connection belongs to org
    const existing = await prisma.aiProviderConnection.findFirst({
      where: {
        id,
        orgId: activeOrg.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Provider connection not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) {
      updateData.name = name.trim()
    }
    if (status !== undefined) {
      const statusEnum = status.toUpperCase() as AiProviderConnectionStatus
      if (!Object.values(AiProviderConnectionStatus).includes(statusEnum)) {
        return NextResponse.json({ error: 'Invalid status. Must be ACTIVE or DISABLED' }, { status: 400 })
      }
      updateData.status = statusEnum
    }
    if (apiKey !== undefined) {
      // Rotate key
      const { ciphertext, last4 } = encryptSecret(apiKey)
      updateData.encryptedApiKey = ciphertext
      updateData.keyLast4 = last4
    }

    const connection = await prisma.aiProviderConnection.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        provider: true,
        name: true,
        status: true,
        keyLast4: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ connection })
  } catch (error: any) {
    console.error('Error updating AI provider:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to update provider' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ai/providers/[id]
 * Delete provider connection
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    await requireAdmin()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const { id } = await params

    // Verify connection belongs to org
    const existing = await prisma.aiProviderConnection.findFirst({
      where: {
        id,
        orgId: activeOrg.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Provider connection not found' }, { status: 404 })
    }

    await prisma.aiProviderConnection.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting AI provider:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to delete provider' }, { status: 500 })
  }
}

