import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/admin-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/ai/routes/[id]
 * Update model route
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
    const { enabled, priority, maxCostPerReqEUR } = body

    // Verify route belongs to org
    const existing = await prisma.aiModelRoute.findFirst({
      where: {
        id,
        orgId: activeOrg.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    if (enabled !== undefined) {
      updateData.enabled = enabled
    }
    if (priority !== undefined) {
      updateData.priority = priority
    }
    if (maxCostPerReqEUR !== undefined) {
      updateData.maxCostPerReqEUR = maxCostPerReqEUR === null || maxCostPerReqEUR === '' ? null : maxCostPerReqEUR
    }

    const route = await prisma.aiModelRoute.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ route })
  } catch (error: any) {
    console.error('Error updating AI route:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to update route' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ai/routes/[id]
 * Delete model route
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

    // Verify route belongs to org
    const existing = await prisma.aiModelRoute.findFirst({
      where: {
        id,
        orgId: activeOrg.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    await prisma.aiModelRoute.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting AI route:', error)
    if (error.message?.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Failed to delete route' }, { status: 500 })
  }
}

