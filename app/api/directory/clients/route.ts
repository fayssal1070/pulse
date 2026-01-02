import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })

    const clients = await prisma.client.findMany({
      where: { orgId: activeOrg.id },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ clients })
  } catch (error: any) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const body = await request.json()
    const { name, externalId } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const client = await prisma.client.create({
      data: {
        orgId: activeOrg.id,
        name: name.trim(),
        externalId: externalId?.trim() || null,
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating client:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

