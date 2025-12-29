import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/notifications/[id]
 * Mark a single notification as read
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    const { id } = await params

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Verify notification belongs to user's org and is accessible
    const notification = await prisma.inAppNotification.findFirst({
      where: {
        id,
        orgId: activeOrg.id,
        OR: [
          { userId: null }, // Org-wide
          { userId: user.id }, // User-specific
        ],
      },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Mark as read
    const updated = await prisma.inAppNotification.update({
      where: { id },
      data: { readAt: new Date() },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json({ error: error.message || 'Failed to mark notification as read' }, { status: 500 })
  }
}

