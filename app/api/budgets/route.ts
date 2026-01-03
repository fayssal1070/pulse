import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole, canManageBudgets } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // All authenticated users can view budgets (RBAC enforced per budget if needed)
    const budgets = await prisma.budget.findMany({
      where: { orgId: activeOrg.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ budgets })
  } catch (error: any) {
    console.error('Get budgets error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Check RBAC
    const canManage = await canManageBudgets(
      activeOrg.id,
      undefined, // Will check org-level permission
      null
    )

    if (!canManage) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to create budgets.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, scopeType, scopeId, period, amountEur, alertThresholdPct, hardLimit, actions } = body

    // Validation
    if (!name || !scopeType || !period || !amountEur) {
      return NextResponse.json(
        { error: 'Missing required fields: name, scopeType, period, amountEur' },
        { status: 400 }
      )
    }

    if (!['ORG', 'TEAM', 'PROJECT', 'APP', 'CLIENT'].includes(scopeType)) {
      return NextResponse.json({ error: 'Invalid scopeType' }, { status: 400 })
    }

    if (!['MONTHLY', 'DAILY'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }

    // Validate scopeId belongs to org (multi-tenant strict)
    if (scopeType !== 'ORG') {
      if (!scopeId) {
        return NextResponse.json(
          { error: `scopeId is required for scopeType ${scopeType}` },
          { status: 400 }
        )
      }

      // Validate ID exists and belongs to org
      let exists = false
      if (scopeType === 'APP') {
        const app = await (prisma as any).app.findFirst({
          where: { id: scopeId, orgId: activeOrg.id },
        })
        exists = !!app
      } else if (scopeType === 'PROJECT') {
        const project = await (prisma as any).project.findFirst({
          where: { id: scopeId, orgId: activeOrg.id },
        })
        exists = !!project
      } else if (scopeType === 'CLIENT') {
        const client = await (prisma as any).client.findFirst({
          where: { id: scopeId, orgId: activeOrg.id },
        })
        exists = !!client
      } else if (scopeType === 'TEAM') {
        const team = await (prisma as any).team.findFirst({
          where: { id: scopeId, orgId: activeOrg.id },
        })
        exists = !!team
      }

      if (!exists) {
        return NextResponse.json(
          { error: `${scopeType} with id ${scopeId} not found or does not belong to your organization` },
          { status: 400 }
        )
      }

      // Check if manager can create budget for this scope
      const canManageScope = await canManageBudgets(activeOrg.id, scopeType, scopeId)
      if (!canManageScope) {
        return NextResponse.json(
          { error: 'Access denied. You cannot create budgets for this scope.' },
          { status: 403 }
        )
      }
    }

    // Prevent duplicates: one budget MONTHLY per scope+target
    const existing = await prisma.budget.findFirst({
      where: {
        orgId: activeOrg.id,
        scopeType,
        scopeId: scopeType === 'ORG' ? null : scopeId,
        period: 'MONTHLY',
        enabled: true,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `A MONTHLY budget already exists for ${scopeType}${scopeId ? ` (${scopeId})` : ''}. Only one MONTHLY budget per scope is allowed.` },
        { status: 400 }
      )
    }

    const budget = await prisma.budget.create({
      data: {
        orgId: activeOrg.id,
        name,
        scopeType,
        scopeId: scopeType === 'ORG' ? null : scopeId,
        period,
        amountEur: new Prisma.Decimal(amountEur),
        alertThresholdPct: alertThresholdPct || 80,
        hardLimit: hardLimit || false,
        actions: actions || { recommend: true },
        enabled: true,
      },
    })

    return NextResponse.json({ budget })
  } catch (error: any) {
    console.error('Create budget error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create budget' }, { status: 500 })
  }
}

