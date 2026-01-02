import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { requireRole, canManageDirectory } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })

    // All roles can view
    const teams = await prisma.team.findMany({
      where: { orgId: activeOrg.id },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ teams })
  } catch (error: any) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })

    // RBAC: only admin/finance/manager can create
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const team = await prisma.team.create({
      data: {
        orgId: activeOrg.id,
        name: name.trim(),
      },
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating team:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

