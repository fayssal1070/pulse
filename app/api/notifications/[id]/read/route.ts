import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/active-org'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify notification belongs to user's active org
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json(
        { error: 'No active organization' },
        { status: 400 }
      )
    }

    const notification = await prisma.inAppNotification.findUnique({
      where: { id },
    })

    if (!notification || notification.orgId !== activeOrg.id) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      )
    }

    // Check if notification is for this user or org-wide
    if (notification.userId && notification.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await prisma.inAppNotification.update({
      where: { id },
      data: {
        readAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




