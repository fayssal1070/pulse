import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole, requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/alerts' })
    const role = await getUserRole(activeOrg.id)

    // RBAC: all roles can view, but users see limited info
    const rules = await prisma.alertRule.findMany({
      where: { orgId: activeOrg.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { alertEvents: true },
        },
      },
    })

    return NextResponse.json({ rules })
  } catch (error: any) {
    console.error('Error fetching alert rules:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/alerts' })

    // RBAC: only admin/finance/manager can create
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const body = await request.json()
    const {
      name,
      type,
      enabled = true,
      thresholdEUR,
      spikePercent,
      topSharePercent,
      lookbackDays = 7,
      providerFilter,
      cooldownHours = 24,
      notifyEmail = false,
    } = body

    // Validation
    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    // Type-specific validation
    if (type === 'DAILY_SPIKE' && !spikePercent) {
      return NextResponse.json({ error: 'spikePercent is required for DAILY_SPIKE' }, { status: 400 })
    }
    if (type === 'TOP_CONSUMER_SHARE' && !topSharePercent) {
      return NextResponse.json({ error: 'topSharePercent is required for TOP_CONSUMER_SHARE' }, { status: 400 })
    }

    const rule = await prisma.alertRule.create({
      data: {
        orgId: activeOrg.id,
        name,
        type,
        enabled,
        thresholdEUR: thresholdEUR || null,
        spikePercent: spikePercent || null,
        topSharePercent: topSharePercent || null,
        lookbackDays,
        providerFilter: providerFilter || null,
        cooldownHours,
        notifyEmail,
        createdByUserId: user.id,
      },
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating alert rule:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

