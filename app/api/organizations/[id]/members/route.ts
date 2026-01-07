/**
 * GET /api/organizations/[id]/members
 * Get all members of an organization
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify user has access to organization
    const organization = await getOrganizationById(id, user.id)
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch all memberships with user details
    const memberships = await prisma.membership.findMany({
      where: { orgId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format response
    const members = memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      status: m.status || 'active', // Default to active if not set (backward compat)
      activatedAt: m.activatedAt?.toISOString() || null,
      invitedAt: m.invitedAt?.toISOString() || null,
    }))

    return NextResponse.json({ members })
  } catch (error: any) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

