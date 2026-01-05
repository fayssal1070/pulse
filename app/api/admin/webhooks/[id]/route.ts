/**
 * Webhook operations by ID (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const { id } = await params
    const body = await request.json()
    const { url, events, enabled } = body

    const updateData: any = {}
    if (url !== undefined) updateData.url = url
    if (events !== undefined) updateData.events = events
    if (enabled !== undefined) updateData.enabled = enabled

    const webhook = await prisma.orgWebhook.update({
      where: {
        id,
        orgId: activeOrg.id, // Ensure org scoping
      },
      data: updateData,
      select: {
        id: true,
        url: true,
        enabled: true,
        events: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ webhook })
  } catch (error: any) {
    console.error('Update webhook error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update webhook' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const { id } = await params

    await prisma.orgWebhook.delete({
      where: {
        id,
        orgId: activeOrg.id, // Ensure org scoping
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete webhook error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete webhook' }, { status: 500 })
  }
}

// POST /api/admin/webhooks/[id]/test - Send test event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const { id } = await params

    const webhook = await prisma.orgWebhook.findUnique({
      where: {
        id,
        orgId: activeOrg.id,
      },
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Send test event
    await dispatchWebhook(
      activeOrg.id,
      'ai_request.completed',
      {
        requestLogId: 'test-event',
        provider: 'openai',
        model: 'gpt-4',
        tokensIn: 10,
        tokensOut: 20,
        costEur: 0.001,
        latencyMs: 100,
        test: true,
      }
    )

    return NextResponse.json({ success: true, message: 'Test event sent' })
  } catch (error: any) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ error: error.message || 'Failed to send test event' }, { status: 500 })
  }
}

