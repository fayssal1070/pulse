import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const isAdminUser = await isAdmin()

    if (!isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const { id } = await params

    // Verify key belongs to org
    const key = await prisma.aiGatewayKey.findFirst({
      where: {
        id,
        orgId: activeOrg.id,
      },
    })

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    // Revoke key
    await prisma.aiGatewayKey.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete AI key error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete key' }, { status: 500 })
  }
}

