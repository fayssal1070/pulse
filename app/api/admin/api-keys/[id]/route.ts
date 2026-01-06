/**
 * Admin API for getting API key details
 * GET: Get API key details with usage stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)
    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const { id } = await params

    // Get key
    const key = await prisma.aiGatewayKey.findFirst({
      where: { id, orgId: activeOrg.id },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        status: true,
        enabled: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        defaultAppId: true,
        defaultProjectId: true,
        defaultClientId: true,
        defaultTeamId: true,
        rateLimitRpm: true,
        dailyCostLimitEur: true,
        monthlyCostLimitEur: true,
        defaultApp: {
          select: { name: true },
        },
        defaultProject: {
          select: { name: true },
        },
        defaultClient: {
          select: { name: true },
        },
        defaultTeam: {
          select: { name: true },
        },
      },
    })

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get usage stats
    const [spendMTD, spendLast24h, requestsLast24h, topModels, topApps, topProjects, topClients, recentAudits] = await Promise.all([
      // MTD spend
      prisma.costEvent.aggregate({
        where: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          source: 'AI',
          occurredAt: { gte: startOfMonth },
        },
        _sum: { amountEur: true },
      }),
      // Last 24h spend
      prisma.costEvent.aggregate({
        where: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          source: 'AI',
          occurredAt: { gte: last24h },
        },
        _sum: { amountEur: true },
      }),
      // Last 24h requests
      prisma.aiRequestLog.count({
        where: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          occurredAt: { gte: last24h },
        },
      }),
      // Top models
      prisma.aiRequestLog.groupBy({
        by: ['model'],
        where: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          occurredAt: { gte: last24h },
        },
        _count: { model: true },
        orderBy: { _count: { model: 'desc' } },
        take: 5,
      }),
      // Top apps
      prisma.aiRequestLog.groupBy({
        by: ['appId'],
        where: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          appId: { not: null },
          occurredAt: { gte: last24h },
        },
        _count: { appId: true },
        orderBy: { _count: { appId: 'desc' } },
        take: 5,
      }),
      // Top projects
      prisma.aiRequestLog.groupBy({
        by: ['projectId'],
        where: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          projectId: { not: null },
          occurredAt: { gte: last24h },
        },
        _count: { projectId: true },
        orderBy: { _count: { projectId: 'desc' } },
        take: 5,
      }),
      // Top clients
      prisma.aiRequestLog.groupBy({
        by: ['clientId'],
        where: {
          orgId: activeOrg.id,
          apiKeyId: key.id,
          clientId: { not: null },
          occurredAt: { gte: last24h },
        },
        _count: { clientId: true },
        orderBy: { _count: { clientId: 'desc' } },
        take: 5,
      }),
      // Recent audits
      prisma.apiKeyAudit.findMany({
        where: { apiKeyId: key.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          actorUserId: true,
          createdAt: true,
          metaJson: true,
        },
      }),
    ])

    // Resolve app/project/client names
    const appIds = topApps.filter((a) => a.appId).map((a) => a.appId!)
    const projectIds = topProjects.filter((p) => p.projectId).map((p) => p.projectId!)
    const clientIds = topClients.filter((c) => c.clientId).map((c) => c.clientId!)

    const [apps, projects, clients] = await Promise.all([
      appIds.length > 0
        ? prisma.app.findMany({
            where: { id: { in: appIds }, orgId: activeOrg.id },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      projectIds.length > 0
        ? prisma.project.findMany({
            where: { id: { in: projectIds }, orgId: activeOrg.id },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      clientIds.length > 0
        ? prisma.client.findMany({
            where: { id: { in: clientIds }, orgId: activeOrg.id },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ])

    const appsMap = new Map(apps.map((a) => [a.id, a.name]))
    const projectsMap = new Map(projects.map((p) => [p.id, p.name]))
    const clientsMap = new Map(clients.map((c) => [c.id, c.name]))

    return NextResponse.json({
      key,
      stats: {
        spendMTD: spendMTD._sum.amountEur ? parseFloat(spendMTD._sum.amountEur.toString()) : 0,
        spendLast24h: spendLast24h._sum.amountEur ? parseFloat(spendLast24h._sum.amountEur.toString()) : 0,
        requestsLast24h,
        topModels: topModels.map((m) => ({ model: m.model, count: m._count.model })),
        topApps: topApps
          .filter((a) => a.appId)
          .map((a) => ({ id: a.appId, name: appsMap.get(a.appId!) || 'Unknown', count: a._count.appId })),
        topProjects: topProjects
          .filter((p) => p.projectId)
          .map((p) => ({ id: p.projectId, name: projectsMap.get(p.projectId!) || 'Unknown', count: p._count.projectId })),
        topClients: topClients
          .filter((c) => c.clientId)
          .map((c) => ({ id: c.clientId, name: clientsMap.get(c.clientId!) || 'Unknown', count: c._count.clientId })),
      },
      recentAudits: recentAudits.map((a) => ({
        id: a.id,
        action: a.action,
        actorUserId: a.actorUserId,
        createdAt: a.createdAt.toISOString(),
        meta: a.metaJson ? JSON.parse(a.metaJson) : null,
      })),
    })
  } catch (error: any) {
    console.error('Get API key details error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get API key details' }, { status: 500 })
  }
}
