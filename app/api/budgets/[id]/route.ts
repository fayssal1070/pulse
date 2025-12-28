import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { canManageBudgets } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    const { id } = await params

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Get budget to check scope
    const existingBudget = await prisma.budget.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Check RBAC
    const canManage = await canManageBudgets(
      activeOrg.id,
      existingBudget.scopeType as any,
      existingBudget.scopeId
    )

    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to update this budget.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.period !== undefined) {
      if (!['MONTHLY', 'DAILY'].includes(body.period)) {
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
      }
      updateData.period = body.period
    }
    if (body.amountEur !== undefined) updateData.amountEur = new Prisma.Decimal(body.amountEur)
    if (body.alertThresholdPct !== undefined) updateData.alertThresholdPct = body.alertThresholdPct
    if (body.hardLimit !== undefined) updateData.hardLimit = body.hardLimit
    if (body.actions !== undefined) updateData.actions = body.actions
    if (body.enabled !== undefined) updateData.enabled = body.enabled

    const budget = await prisma.budget.update({
      where: { id, orgId: activeOrg.id },
      data: updateData,
    })

    return NextResponse.json({ budget })
  } catch (error: any) {
    console.error('Update budget error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update budget' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    const { id } = await params

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Get budget to check scope
    const existingBudget = await prisma.budget.findUnique({
      where: { id, orgId: activeOrg.id },
    })

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Check RBAC
    const canManage = await canManageBudgets(
      activeOrg.id,
      existingBudget.scopeType as any,
      existingBudget.scopeId
    )

    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to delete this budget.' },
        { status: 403 }
      )
    }

    await prisma.budget.delete({
      where: { id, orgId: activeOrg.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete budget error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete budget' }, { status: 500 })
  }
}

