import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole, requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/governance' })

    const org = await prisma.organization.findUnique({
      where: { id: activeOrg.id },
      select: { aiLogRetentionDays: true },
    })

    return NextResponse.json({
      aiLogRetentionDays: org?.aiLogRetentionDays || 90,
    })
  } catch (error: any) {
    console.error('Error fetching retention settings:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/governance' })

    // RBAC: only admin/finance can update retention
    await requireRole(activeOrg.id, ['admin', 'finance'])

    const body = await request.json()
    const { aiLogRetentionDays } = body

    if (typeof aiLogRetentionDays !== 'number' || aiLogRetentionDays < 1 || aiLogRetentionDays > 3650) {
      return NextResponse.json({ error: 'Invalid retention days (must be between 1 and 3650)' }, { status: 400 })
    }

    await prisma.organization.update({
      where: { id: activeOrg.id },
      data: { aiLogRetentionDays },
    })

    return NextResponse.json({ success: true, aiLogRetentionDays })
  } catch (error: any) {
    console.error('Error updating retention settings:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

