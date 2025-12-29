import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notifications
 * List in-app notifications for current user (org-scoped)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const notifications = await prisma.inAppNotification.findMany({
      where: {
        orgId: activeOrg.id,
        OR: [
          { userId: null }, // Org-wide
          { userId: user.id }, // User-specific
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 most recent
    })

    return NextResponse.json(notifications)
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch notifications' }, { status: 500 })
  }
}

/**
 * POST /api/notifications
 * Mark all notifications as read for current user
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()
    const { markAllRead } = body

    if (markAllRead) {
      await prisma.inAppNotification.updateMany({
        where: {
          orgId: activeOrg.id,
          OR: [
            { userId: null }, // Org-wide
            { userId: user.id }, // User-specific
          ],
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      })

      return NextResponse.json({ message: 'All notifications marked as read' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: error.message || 'Failed to mark notifications as read' }, { status: 500 })
  }
}

