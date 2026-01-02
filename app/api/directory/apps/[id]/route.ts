import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const { id } = await params
    const body = await request.json()
    const { name, slug } = body

    const existing = await prisma.app.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    const updateData: { name?: string; slug?: string } = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (slug !== undefined) {
      const appSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      if (appSlug.length === 0) {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
      }

      // Check slug uniqueness (excluding current app)
      const slugExists = await prisma.app.findFirst({
        where: {
          orgId: activeOrg.id,
          slug: appSlug,
          id: { not: id },
        },
      })

      if (slugExists) {
        return NextResponse.json({ error: 'App with this slug already exists' }, { status: 400 })
      }

      updateData.slug = appSlug
    }

    const app = await prisma.app.update({
      where: { id, orgId: activeOrg.id },
      data: updateData,
    })

    return NextResponse.json({ app })
  } catch (error: any) {
    console.error('Error updating app:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'App with this slug already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/directory' })
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const { id } = await params

    const existing = await prisma.app.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    await prisma.app.delete({
      where: { id, orgId: activeOrg.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting app:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

