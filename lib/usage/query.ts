/**
 * Usage queries for AI usage dashboard
 * Specialized queries for business-readable usage metrics
 */

import { prisma } from '@/lib/prisma'

export interface UsageSummary {
  totalMtdEUR: number
  momDeltaPercent: number
  topApp: { id: string; name: string; amountEUR: number } | null
  topProvider: { provider: string; amountEUR: number } | null
}

export interface UsageBreakdownItem {
  id: string
  name: string
  amountEUR: number
  percentOfTotal: number
  trend7d: number // % change last 7 days
}

export interface UsageTimeseriesPoint {
  date: string // ISO date
  amountEUR: number
}

/**
 * Get usage summary for current month
 */
export async function getUsageSummary(
  orgId: string,
  userId?: string // If provided, filter by user
): Promise<UsageSummary> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Build where clause
  const whereCurrent = {
    orgId,
    source: 'AI',
    occurredAt: { gte: startOfMonth },
    ...(userId ? { userId } : {}),
  }

  const whereLastMonth = {
    orgId,
    source: 'AI',
    occurredAt: { gte: startOfLastMonth, lte: endOfLastMonth },
    ...(userId ? { userId } : {}),
  }

  // Get totals
  const [currentTotal, lastMonthTotal, topApp, topProvider] = await Promise.all([
    prisma.costEvent.aggregate({
      where: whereCurrent,
      _sum: { amountEur: true },
    }),
    prisma.costEvent.aggregate({
      where: whereLastMonth,
      _sum: { amountEur: true },
    }),
    // Top app
    prisma.costEvent.groupBy({
      by: ['appId'],
      where: {
        ...whereCurrent,
        appId: { not: null },
      },
      _sum: { amountEur: true },
      orderBy: { _sum: { amountEur: 'desc' } },
      take: 1,
    }),
    // Top provider
    prisma.costEvent.groupBy({
      by: ['provider'],
      where: whereCurrent,
      _sum: { amountEur: true },
      orderBy: { _sum: { amountEur: 'desc' } },
      take: 1,
    }),
  ])

  const totalMtdEUR = currentTotal._sum.amountEur ? parseFloat(currentTotal._sum.amountEur.toString()) : 0
  const lastMonthEUR = lastMonthTotal._sum.amountEur ? parseFloat(lastMonthTotal._sum.amountEur.toString()) : 0

  // Calculate MoM delta
  let momDeltaPercent = 0
  if (lastMonthEUR > 0) {
    momDeltaPercent = ((totalMtdEUR - lastMonthEUR) / lastMonthEUR) * 100
  } else if (totalMtdEUR > 0) {
    momDeltaPercent = 100 // First month with usage
  }

  // Resolve top app name
  let topAppResult: { id: string; name: string; amountEUR: number } | null = null
  if (topApp.length > 0 && topApp[0].appId) {
    const app = await prisma.app.findUnique({
      where: { id: topApp[0].appId },
      select: { id: true, name: true },
    })
    if (app) {
      const amountEUR = topApp[0]._sum.amountEur ? parseFloat(topApp[0]._sum.amountEur.toString()) : 0
      topAppResult = { id: app.id, name: app.name, amountEUR }
    }
  }

  // Top provider
  let topProviderResult: { provider: string; amountEUR: number } | null = null
  if (topProvider.length > 0 && topProvider[0].provider) {
    const amountEUR = topProvider[0]._sum.amountEur ? parseFloat(topProvider[0]._sum.amountEur.toString()) : 0
    topProviderResult = { provider: topProvider[0].provider, amountEUR }
  }

  return {
    totalMtdEUR,
    momDeltaPercent: Math.round(momDeltaPercent * 10) / 10, // Round to 1 decimal
    topApp: topAppResult,
    topProvider: topProviderResult,
  }
}

/**
 * Get breakdown by dimension
 */
export async function getUsageBreakdown(
  orgId: string,
  dimension: 'app' | 'provider' | 'user' | 'project',
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<UsageBreakdownItem[]> {
  const where = {
    orgId,
    source: 'AI',
    occurredAt: { gte: startDate, lte: endDate },
    ...(userId ? { userId } : {}),
  }

  // Get total for percentage calculation
  const totalAgg = await prisma.costEvent.aggregate({
    where,
    _sum: { amountEur: true },
  })
  const totalEUR = totalAgg._sum.amountEur ? parseFloat(totalAgg._sum.amountEur.toString()) : 0

  // Calculate trend period (7 days before startDate)
  const trendStartDate = new Date(startDate)
  trendStartDate.setDate(trendStartDate.getDate() - 7)
  const trendWhere = {
    ...where,
    occurredAt: { gte: trendStartDate, lt: startDate },
  }

  let results: Array<{
    id: string
    name: string
    amountEUR: number
    trend7d: number
  }> = []

  switch (dimension) {
    case 'app': {
      const appGroups = await prisma.costEvent.groupBy({
        by: ['appId'],
        where: {
          ...where,
          appId: { not: null },
        },
        _sum: { amountEur: true },
        orderBy: { _sum: { amountEur: 'desc' } },
        take: 10,
      })

      const appIds = appGroups.map((g) => g.appId!).filter(Boolean)
      const apps = await prisma.app.findMany({
        where: { id: { in: appIds }, orgId },
        select: { id: true, name: true },
      })
      const appsMap = new Map(apps.map((a) => [a.id, a.name]))

      // Get trend data
      const trendGroups = await prisma.costEvent.groupBy({
        by: ['appId'],
        where: {
          ...trendWhere,
          appId: { in: appIds },
        },
        _sum: { amountEur: true },
      })
      const trendMap = new Map(trendGroups.map((g) => [g.appId!, g._sum.amountEur ? parseFloat(g._sum.amountEur.toString()) : 0]))

      results = appGroups.map((group) => {
        const amountEUR = group._sum.amountEur ? parseFloat(group._sum.amountEur.toString()) : 0
        const trend7dEUR = trendMap.get(group.appId!) || 0
        const trend7d = trend7dEUR > 0 ? ((amountEUR - trend7dEUR) / trend7dEUR) * 100 : (amountEUR > 0 ? 100 : 0)
        return {
          id: group.appId!,
          name: appsMap.get(group.appId!) || 'Unknown',
          amountEUR,
          trend7d: Math.round(trend7d * 10) / 10,
        }
      })
      break
    }

    case 'provider': {
      const providerGroups = await prisma.costEvent.groupBy({
        by: ['provider'],
        where,
        _sum: { amountEur: true },
        orderBy: { _sum: { amountEur: 'desc' } },
        take: 10,
      })

      const trendGroups = await prisma.costEvent.groupBy({
        by: ['provider'],
        where: trendWhere,
        _sum: { amountEur: true },
      })
      const trendMap = new Map(trendGroups.map((g) => [g.provider, g._sum.amountEur ? parseFloat(g._sum.amountEur.toString()) : 0]))

      results = providerGroups.map((group) => {
        const amountEUR = group._sum.amountEur ? parseFloat(group._sum.amountEur.toString()) : 0
        const trend7dEUR = trendMap.get(group.provider) || 0
        const trend7d = trend7dEUR > 0 ? ((amountEUR - trend7dEUR) / trend7dEUR) * 100 : (amountEUR > 0 ? 100 : 0)
        return {
          id: group.provider,
          name: group.provider,
          amountEUR,
          trend7d: Math.round(trend7d * 10) / 10,
        }
      })
      break
    }

    case 'user': {
      const userGroups = await prisma.costEvent.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null },
        },
        _sum: { amountEur: true },
        orderBy: { _sum: { amountEur: 'desc' } },
        take: 10,
      })

      const userIds = userGroups.map((g) => g.userId!).filter(Boolean)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      })
      const usersMap = new Map(users.map((u) => [u.id, u.name || u.email]))

      const trendGroups = await prisma.costEvent.groupBy({
        by: ['userId'],
        where: {
          ...trendWhere,
          userId: { in: userIds },
        },
        _sum: { amountEur: true },
      })
      const trendMap = new Map(trendGroups.map((g) => [g.userId!, g._sum.amountEur ? parseFloat(g._sum.amountEur.toString()) : 0]))

      results = userGroups.map((group) => {
        const amountEUR = group._sum.amountEur ? parseFloat(group._sum.amountEur.toString()) : 0
        const trend7dEUR = trendMap.get(group.userId!) || 0
        const trend7d = trend7dEUR > 0 ? ((amountEUR - trend7dEUR) / trend7dEUR) * 100 : (amountEUR > 0 ? 100 : 0)
        return {
          id: group.userId!,
          name: usersMap.get(group.userId!) || 'Unknown',
          amountEUR,
          trend7d: Math.round(trend7d * 10) / 10,
        }
      })
      break
    }

    case 'project': {
      const projectGroups = await prisma.costEvent.groupBy({
        by: ['projectId'],
        where: {
          ...where,
          projectId: { not: null },
        },
        _sum: { amountEur: true },
        orderBy: { _sum: { amountEur: 'desc' } },
        take: 10,
      })

      const projectIds = projectGroups.map((g) => g.projectId!).filter(Boolean)
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds }, orgId },
        select: { id: true, name: true },
      })
      const projectsMap = new Map(projects.map((p) => [p.id, p.name]))

      const trendGroups = await prisma.costEvent.groupBy({
        by: ['projectId'],
        where: {
          ...trendWhere,
          projectId: { in: projectIds },
        },
        _sum: { amountEur: true },
      })
      const trendMap = new Map(trendGroups.map((g) => [g.projectId!, g._sum.amountEur ? parseFloat(g._sum.amountEur.toString()) : 0]))

      results = projectGroups.map((group) => {
        const amountEUR = group._sum.amountEur ? parseFloat(group._sum.amountEur.toString()) : 0
        const trend7dEUR = trendMap.get(group.projectId!) || 0
        const trend7d = trend7dEUR > 0 ? ((amountEUR - trend7dEUR) / trend7dEUR) * 100 : (amountEUR > 0 ? 100 : 0)
        return {
          id: group.projectId!,
          name: projectsMap.get(group.projectId!) || 'Unknown',
          amountEUR,
          trend7d: Math.round(trend7d * 10) / 10,
        }
      })
      break
    }
  }

  // Calculate percentages and sort
  return results
    .map((item) => ({
      ...item,
      percentOfTotal: totalEUR > 0 ? Math.round((item.amountEUR / totalEUR) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.amountEUR - a.amountEUR)
}

/**
 * Get timeseries for a specific item
 */
export async function getUsageTimeseries(
  orgId: string,
  dimension: 'app' | 'provider' | 'user' | 'project',
  id: string,
  days: number = 7,
  userId?: string
): Promise<UsageTimeseriesPoint[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const where: any = {
    orgId,
    source: 'AI',
    occurredAt: { gte: startDate, lte: endDate },
    ...(userId ? { userId } : {}),
  }

  // Add dimension filter
  switch (dimension) {
    case 'app':
      where.appId = id
      break
    case 'provider':
      where.provider = id
      break
    case 'user':
      where.userId = id
      break
    case 'project':
      where.projectId = id
      break
  }

  // Group by day
  const events = await prisma.costEvent.findMany({
    where,
    select: {
      occurredAt: true,
      amountEur: true,
    },
    orderBy: { occurredAt: 'asc' },
  })

  // Group by date
  const dailyMap = new Map<string, number>()
  events.forEach((event) => {
    const dateStr = event.occurredAt.toISOString().split('T')[0]
    const amount = event.amountEur ? parseFloat(event.amountEur.toString()) : 0
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + amount)
  })

  // Generate all days in range
  const points: UsageTimeseriesPoint[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    points.push({
      date: dateStr,
      amountEUR: dailyMap.get(dateStr) || 0,
    })
    current.setDate(current.getDate() + 1)
  }

  return points
}

/**
 * Export usage data as finance-ready CSV
 */
export async function getUsageExport(
  orgId: string,
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<Array<{
  date: string
  app: string
  project: string
  client: string
  team: string
  provider: string
  amountEUR: number
  userEmail: string | null
  source: string
  rawRef: string | null
}>> {
  const where = {
    orgId,
    source: 'AI',
    occurredAt: { gte: startDate, lte: endDate },
    ...(userId ? { userId } : {}),
  }

  const events = await prisma.costEvent.findMany({
    where,
    select: {
      occurredAt: true,
      appId: true,
      projectId: true,
      clientId: true,
      teamId: true,
      provider: true,
      amountEur: true,
      userId: true,
      source: true,
      rawRef: true,
    },
    orderBy: { occurredAt: 'asc' },
  })

  // Resolve IDs to names
  const appIds = [...new Set(events.map((e) => e.appId).filter(Boolean))]
  const projectIds = [...new Set(events.map((e) => e.projectId).filter(Boolean))]
  const clientIds = [...new Set(events.map((e) => e.clientId).filter(Boolean))]
  const teamIds = [...new Set(events.map((e) => e.teamId).filter(Boolean))]
  const userIds = [...new Set(events.map((e) => e.userId).filter(Boolean))]

  const [apps, projects, clients, teams, users] = await Promise.all([
    appIds.length > 0 ? prisma.app.findMany({ where: { id: { in: appIds as string[] }, orgId }, select: { id: true, name: true } }) : [],
    projectIds.length > 0 ? prisma.project.findMany({ where: { id: { in: projectIds as string[] }, orgId }, select: { id: true, name: true } }) : [],
    clientIds.length > 0 ? prisma.client.findMany({ where: { id: { in: clientIds as string[] }, orgId }, select: { id: true, name: true } }) : [],
    teamIds.length > 0 ? prisma.team.findMany({ where: { id: { in: teamIds as string[] }, orgId }, select: { id: true, name: true } }) : [],
    userIds.length > 0 ? prisma.user.findMany({ where: { id: { in: userIds as string[] } }, select: { id: true, email: true } }) : [],
  ])

  const appsMap = new Map(apps.map((a) => [a.id, a.name]))
  const projectsMap = new Map(projects.map((p) => [p.id, p.name]))
  const clientsMap = new Map(clients.map((c) => [c.id, c.name]))
  const teamsMap = new Map(teams.map((t) => [t.id, t.name]))
  const usersMap = new Map(users.map((u) => [u.id, u.email]))

  return events.map((event) => ({
    date: event.occurredAt.toISOString().split('T')[0],
    app: event.appId ? appsMap.get(event.appId) || '' : '',
    project: event.projectId ? projectsMap.get(event.projectId) || '' : '',
    client: event.clientId ? clientsMap.get(event.clientId) || '' : '',
    team: event.teamId ? teamsMap.get(event.teamId) || '' : '',
    provider: event.provider || '',
    amountEUR: event.amountEur ? parseFloat(event.amountEur.toString()) : 0,
    userEmail: event.userId ? usersMap.get(event.userId) || null : null,
    source: event.source || 'AI',
    rawRef: event.rawRef ? JSON.stringify(event.rawRef) : null,
  }))
}

