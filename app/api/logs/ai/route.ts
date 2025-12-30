import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserRole } from '@/lib/auth/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const role = await getUserRole(activeOrg.id)
    const searchParams = request.nextUrl.searchParams

    // Build where clause
    const where: any = {
      orgId: activeOrg.id,
    }

    // RBAC: users can only see their own logs
    if (role === 'user') {
      where.userId = user.id
    }

    // Filters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')
    const projectId = searchParams.get('projectId')
    const appId = searchParams.get('appId')
    const clientId = searchParams.get('clientId')
    const model = searchParams.get('model')
    const status = searchParams.get('status')

    if (startDate) {
      where.occurredAt = { ...where.occurredAt, gte: new Date(startDate) }
    }
    if (endDate) {
      where.occurredAt = { ...where.occurredAt, lte: new Date(endDate) }
    }
    if (userId && (role === 'admin' || role === 'finance' || role === 'manager')) {
      where.userId = userId
    }
    if (teamId) {
      where.teamId = teamId
    }
    if (projectId) {
      where.projectId = projectId
    }
    if (appId) {
      where.appId = appId
    }
    if (clientId) {
      where.clientId = clientId
    }
    if (model) {
      where.model = model
    }
    if (status) {
      if (status === 'success') {
        where.statusCode = 200
      } else if (status === 'error') {
        where.statusCode = { not: 200 }
      } else if (status === 'blocked') {
        where.statusCode = 403
      }
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Get logs
    const [logs, total] = await Promise.all([
      prisma.aiRequestLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          occurredAt: true,
          userId: true,
          teamId: true,
          projectId: true,
          appId: true,
          clientId: true,
          provider: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          estimatedCostEur: true,
          latencyMs: true,
          statusCode: true,
          promptHash: true,
          rawRef: true,
        },
      }),
      prisma.aiRequestLog.count({ where }),
    ])

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        estimatedCostEur: log.estimatedCostEur ? Number(log.estimatedCostEur) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching AI logs:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

