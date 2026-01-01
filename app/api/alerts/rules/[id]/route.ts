import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getUserRole, requireRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/alerts' })

    // RBAC: only admin/finance/manager can update
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const { id } = await params
    const body = await request.json()

    // Check rule exists and belongs to org
    const existing = await prisma.alertRule.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 })
    }

    // Update rule
    const rule = await prisma.alertRule.update({
      where: { id, orgId: activeOrg.id },
      data: {
        name: body.name,
        type: body.type,
        enabled: body.enabled,
        thresholdEUR: body.thresholdEUR !== undefined ? body.thresholdEUR : existing.thresholdEUR,
        spikePercent: body.spikePercent !== undefined ? body.spikePercent : existing.spikePercent,
        topSharePercent: body.topSharePercent !== undefined ? body.topSharePercent : existing.topSharePercent,
        lookbackDays: body.lookbackDays !== undefined ? body.lookbackDays : existing.lookbackDays,
        providerFilter: body.providerFilter !== undefined ? body.providerFilter : existing.providerFilter,
        cooldownHours: body.cooldownHours !== undefined ? body.cooldownHours : existing.cooldownHours,
        notifyEmail: body.notifyEmail !== undefined ? body.notifyEmail : existing.notifyEmail,
      },
    })

    return NextResponse.json({ rule })
  } catch (error: any) {
    console.error('Error updating alert rule:', error)
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
    const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/alerts' })

    // RBAC: only admin/finance/manager can delete
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])

    const { id } = await params

    // Check rule exists and belongs to org
    const existing = await prisma.alertRule.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 })
    }

    // Delete rule (cascade will delete events)
    await prisma.alertRule.delete({
      where: { id, orgId: activeOrg.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting alert rule:', error)
    if (error.message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

