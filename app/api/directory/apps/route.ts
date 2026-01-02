import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })

    const apps = await prisma.app.findMany({
      where: { orgId: activeOrg.id },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ apps })
  } catch (error: any) {
    console.error('Error fetching apps:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const body = await request.json()
    const { name, slug } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Generate slug from name if not provided
    const appSlug = slug || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    if (!appSlug || appSlug.length === 0) {
      return NextResponse.json({ error: 'Invalid slug generated from name' }, { status: 400 })
    }

    // Check slug uniqueness
    const existing = await prisma.app.findUnique({
      where: {
        orgId_slug: {
          orgId: activeOrg.id,
          slug: appSlug,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'App with this slug already exists' }, { status: 400 })
    }

    const app = await prisma.app.create({
      data: {
        orgId: activeOrg.id,
        name: name.trim(),
        slug: appSlug,
      },
    })

    return NextResponse.json({ app }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating app:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'App with this slug already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

