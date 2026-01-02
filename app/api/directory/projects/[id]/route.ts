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
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const existing = await prisma.project.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = await prisma.project.update({
      where: { id, orgId: activeOrg.id },
      data: { name: name.trim() },
    })

    return NextResponse.json({ project })
  } catch (error: any) {
    console.error('Error updating project:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

    const existing = await prisma.project.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await prisma.project.delete({
      where: { id, orgId: activeOrg.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting project:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

