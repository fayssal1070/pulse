/**
 * Costs page queries - Server-side functions for costs tracking, breakdowns, and exports
 * Multi-tenant strict (orgId scoped)
 */

import { prisma } from '@/lib/prisma'
import type { CostEventSource, CostEventProvider } from '@/lib/cost-events/types'

export interface CostsFilters {
  orgId: string
  dateRange?: 'last7' | 'last30' | 'mtd' | 'lastMonth' | 'custom'
  startDate?: Date
  endDate?: Date
  provider?: 'ALL' | CostEventProvider
  model?: string
  userId?: string
  teamId?: string
  projectId?: string
  appId?: string
  clientId?: string
  search?: string
}

export interface CostsSummary {
  aiCost: number
  awsCost: number
  totalCost: number
  momDelta: number
  momDeltaPercent: number
  todayCost: number
}

export interface BreakdownItem {
  id: string
  name: string
  amountEur: number
  percentage: number
  eventCount: number
}

export interface CostEventRow {
  id: string
  occurredAt: Date
  source: CostEventSource
  provider: string | null
  model: string | null
  amountEur: number
  userId: string | null
  teamId: string | null
  projectId: string | null
  appId: string | null
  clientId: string | null
  service: string | null
  rawRef?: any
  // Dimension names
  teamName?: string | null
  projectName?: string | null
  appName?: string | null
  clientName?: string | null
}

/**
 * Get date range from filter
 */
function getDateRange(filters: CostsFilters): { startDate: Date; endDate: Date } {
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)

  let startDate = new Date()

  if (filters.dateRange === 'last7') {
    startDate.setDate(startDate.getDate() - 7)
  } else if (filters.dateRange === 'last30') {
    startDate.setDate(startDate.getDate() - 30)
  } else if (filters.dateRange === 'mtd') {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  } else if (filters.dateRange === 'lastMonth') {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1)
    endDate.setDate(0) // Last day of previous month
    endDate.setHours(23, 59, 59, 999)
  } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
    startDate = filters.startDate
    return { startDate, endDate: filters.endDate }
  } else {
    // Default: last 30 days
    startDate.setDate(startDate.getDate() - 30)
  }

  startDate.setHours(0, 0, 0, 0)
  return { startDate, endDate }
}

/**
 * Build Prisma where clause from filters
 */
function buildWhereClause(filters: CostsFilters, userIdForRBAC?: string) {
  const { startDate, endDate } = getDateRange(filters)
  const where: any = {
    orgId: filters.orgId,
    occurredAt: {
      gte: startDate,
      lte: endDate,
    },
  }

  // RBAC: if userIdForRBAC is provided, filter by userId in dimensions
  if (userIdForRBAC) {
    // We'll filter in memory after fetching
  }

  // Provider filter
  if (filters.provider && filters.provider !== 'ALL') {
    where.provider = filters.provider
    
    // Source filter (derived from provider)
    if (filters.provider === 'aws') {
      where.source = 'AWS'
    } else {
      where.source = 'AI'
    }
  }

  // Model filter (for AI)
  if (filters.model) {
    // Filter by model in dimensions (will be done in memory)
  }

  return { where, startDate, endDate }
}

/**
 * Get costs summary (AI, AWS, Total, MoM, Today)
 */
export async function getCostsSummary(
  filters: CostsFilters,
  userIdForRBAC?: string
): Promise<CostsSummary> {
  const { where, startDate, endDate } = buildWhereClause(filters, userIdForRBAC)

  // Fetch all events
  let events = await prisma.costEvent.findMany({
    where,
    select: {
      id: true,
      source: true,
      provider: true,
      service: true,
      amountEur: true,
      occurredAt: true,
      dimensions: true,
    },
  })

  // RBAC: filter by userId if needed
  if (userIdForRBAC) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.userId === userIdForRBAC
    })
  }

  // Filter by model if specified
  if (filters.model) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.model === filters.model
    })
  }

  // Filter by search if specified
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return (
        e.provider?.toLowerCase().includes(searchLower) ||
        dims.model?.toLowerCase().includes(searchLower) ||
        e.service?.toLowerCase().includes(searchLower)
      )
    })
  }

  // Calculate totals
  const aiCost = events
    .filter((e) => e.source === 'AI')
    .reduce((sum, e) => sum + Number(e.amountEur), 0)
  const awsCost = events
    .filter((e) => e.source === 'AWS')
    .reduce((sum, e) => sum + Number(e.amountEur), 0)
  const totalCost = aiCost + awsCost

  // Today's cost
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayCost = events
    .filter((e) => e.occurredAt >= today)
    .reduce((sum, e) => sum + Number(e.amountEur), 0)

  // Last month comparison
  const lastMonthStart = new Date(startDate)
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
  const lastMonthEnd = new Date(startDate)
  lastMonthEnd.setDate(lastMonthEnd.getDate() - 1)
  lastMonthEnd.setHours(23, 59, 59, 999)

  const lastMonthEvents = await prisma.costEvent.findMany({
    where: {
      orgId: filters.orgId,
      occurredAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
    select: {
      amountEur: true,
      dimensions: true,
    },
  })

  let lastMonthFiltered = lastMonthEvents
  if (userIdForRBAC) {
    lastMonthFiltered = lastMonthFiltered.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.userId === userIdForRBAC
    })
  }

  const lastMonthCost = lastMonthFiltered.reduce((sum, e) => sum + Number(e.amountEur), 0)
  const momDelta = totalCost - lastMonthCost
  const momDeltaPercent = lastMonthCost > 0 ? (momDelta / lastMonthCost) * 100 : 0

  return {
    aiCost,
    awsCost,
    totalCost,
    momDelta,
    momDeltaPercent,
    todayCost,
  }
}

/**
 * Get breakdown by dimension (users, teams, projects, apps, clients, models)
 */
export async function getCostsBreakdown(
  filters: CostsFilters,
  dimension: 'users' | 'teams' | 'projects' | 'apps' | 'clients' | 'models',
  limit: number = 10,
  userIdForRBAC?: string
): Promise<BreakdownItem[]> {
  const { where, startDate, endDate } = buildWhereClause(filters, userIdForRBAC)

  // Fetch all events
  let events = await prisma.costEvent.findMany({
    where,
    select: {
      id: true,
      provider: true,
      service: true,
      amountEur: true,
      dimensions: true,
    },
  })

  // RBAC: filter by userId if needed
  if (userIdForRBAC) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.userId === userIdForRBAC
    })
  }

  // Filter by model if specified
  if (filters.model) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.model === filters.model
    })
  }

  // Filter by search if specified
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return (
        e.provider?.toLowerCase().includes(searchLower) ||
        dims.model?.toLowerCase().includes(searchLower) ||
        e.service?.toLowerCase().includes(searchLower)
      )
    })
  }

  // Group by dimension
  const dimensionKey =
    dimension === 'users'
      ? 'userId'
      : dimension === 'teams'
        ? 'teamId'
        : dimension === 'projects'
          ? 'projectId'
          : dimension === 'apps'
            ? 'appId'
            : dimension === 'clients'
              ? 'clientId'
              : 'model'

  const grouped = new Map<string, { amountEur: number; eventCount: number }>()

  for (const event of events) {
    const dims = (event.dimensions as any) || {}
    const key = dims[dimensionKey] || 'unknown'
    const existing = grouped.get(key) || { amountEur: 0, eventCount: 0 }
    grouped.set(key, {
      amountEur: existing.amountEur + Number(event.amountEur),
      eventCount: existing.eventCount + 1,
    })
  }

  const total = Array.from(grouped.values()).reduce((sum, g) => sum + g.amountEur, 0)

  // Convert to breakdown items
  const items: BreakdownItem[] = Array.from(grouped.entries())
    .map(([id, data]) => ({
      id: id === 'unknown' ? '' : id,
      name: id === 'unknown' ? '(Unknown)' : id,
      amountEur: data.amountEur,
      percentage: total > 0 ? (data.amountEur / total) * 100 : 0,
      eventCount: data.eventCount,
    }))
    .sort((a, b) => b.amountEur - a.amountEur)
    .slice(0, limit)

  return items
}

/**
 * Get paginated cost events
 */
export async function getCostEvents(
  filters: CostsFilters,
  page: number = 1,
  pageSize: number = 25,
  orderBy: 'occurredAt' | 'amountEur' = 'occurredAt',
  order: 'asc' | 'desc' = 'desc',
  userIdForRBAC?: string
): Promise<{ events: CostEventRow[]; totalCount: number }> {
  const { where, startDate, endDate } = buildWhereClause(filters, userIdForRBAC)

  // Fetch all events with dimension relations
  let events = await prisma.costEvent.findMany({
    where,
    select: {
      id: true,
      occurredAt: true,
      source: true,
      provider: true,
      service: true,
      amountEur: true,
      dimensions: true,
      rawRef: true,
      teamId: true,
      projectId: true,
      appId: true,
      clientId: true,
      team: {
        select: { name: true },
      },
      project: {
        select: { name: true },
      },
      app: {
        select: { name: true },
      },
      client: {
        select: { name: true },
      },
    },
  })

  // RBAC: filter by userId if needed
  if (userIdForRBAC) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.userId === userIdForRBAC
    })
  }

  // Filter by dimension filters (use dimensions JSON for now, will use direct columns after Prisma regeneration)
  if (filters.userId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.userId === filters.userId
    })
  }
  if (filters.teamId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.teamId === filters.teamId || (e as any).teamId === filters.teamId
    })
  }
  if (filters.projectId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.projectId === filters.projectId || (e as any).projectId === filters.projectId
    })
  }
  if (filters.appId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.appId === filters.appId || (e as any).appId === filters.appId
    })
  }
  if (filters.clientId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.clientId === filters.clientId || (e as any).clientId === filters.clientId
    })
  }

  // Filter by model if specified
  if (filters.model) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.model === filters.model
    })
  }

  // Filter by search if specified
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return (
        e.provider?.toLowerCase().includes(searchLower) ||
        dims.model?.toLowerCase().includes(searchLower) ||
        e.service?.toLowerCase().includes(searchLower)
      )
    })
  }

  // Sort
  events.sort((a, b) => {
    if (orderBy === 'occurredAt') {
      const aTime = a.occurredAt.getTime()
      const bTime = b.occurredAt.getTime()
      return order === 'desc' ? bTime - aTime : aTime - bTime
    } else {
      const aAmount = Number(a.amountEur)
      const bAmount = Number(b.amountEur)
      return order === 'desc' ? bAmount - aAmount : aAmount - bAmount
    }
  })

  const totalCount = events.length
  const skip = (page - 1) * pageSize
  const paginatedEvents = events.slice(skip, skip + pageSize)

  // Map to CostEventRow with dimension names
  // Fetch dimension names separately (will use relations after Prisma regeneration)
  const dimsMap = new Map<string, { teamId?: string; projectId?: string; appId?: string; clientId?: string }>()
  for (const e of paginatedEvents) {
    const dims = (e.dimensions as any) || {}
    dimsMap.set(e.id, {
      teamId: (e as any).teamId || dims.teamId,
      projectId: (e as any).projectId || dims.projectId,
      appId: (e as any).appId || dims.appId,
      clientId: (e as any).clientId || dims.clientId,
    })
  }

  const allTeamIds = [...new Set(Array.from(dimsMap.values()).map((d) => d.teamId).filter(Boolean) as string[])]
  const allProjectIds = [...new Set(Array.from(dimsMap.values()).map((d) => d.projectId).filter(Boolean) as string[])]
  const allAppIds = [...new Set(Array.from(dimsMap.values()).map((d) => d.appId).filter(Boolean) as string[])]
  const allClientIds = [...new Set(Array.from(dimsMap.values()).map((d) => d.clientId).filter(Boolean) as string[])]

  const [teams, projects, apps, clients] = await Promise.all([
    allTeamIds.length > 0
      ? prisma.team.findMany({
          where: { id: { in: allTeamIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
    allProjectIds.length > 0
      ? prisma.project.findMany({
          where: { id: { in: allProjectIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
    allAppIds.length > 0
      ? prisma.app.findMany({
          where: { id: { in: allAppIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
    allClientIds.length > 0
      ? prisma.client.findMany({
          where: { id: { in: allClientIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
  ])

  const teamMap = new Map(teams.map((t) => [t.id, t.name]))
  const projectMap = new Map(projects.map((p) => [p.id, p.name]))
  const appMap = new Map(apps.map((a) => [a.id, a.name]))
  const clientMap = new Map(clients.map((c) => [c.id, c.name]))

  const rows: CostEventRow[] = paginatedEvents.map((e) => {
    const dims = (e.dimensions as any) || {}
    const dimIds = dimsMap.get(e.id) || {}
    return {
      id: e.id,
      occurredAt: e.occurredAt,
      source: e.source as CostEventSource,
      provider: e.provider,
      model: dims.model || null,
      amountEur: Number(e.amountEur),
      userId: dims.userId || null,
      teamId: dimIds.teamId || null,
      projectId: dimIds.projectId || null,
      appId: dimIds.appId || null,
      clientId: dimIds.clientId || null,
      service: e.service,
      rawRef: e.rawRef as any,
      teamName: dimIds.teamId ? teamMap.get(dimIds.teamId) || null : null,
      projectName: dimIds.projectId ? projectMap.get(dimIds.projectId) || null : null,
      appName: dimIds.appId ? appMap.get(dimIds.appId) || null : null,
      clientName: dimIds.clientId ? clientMap.get(dimIds.clientId) || null : null,
    }
  })

  return { events: rows, totalCount }
}

/**
 * Export cost events as CSV
 */
export async function exportCostEventsCsv(
  filters: CostsFilters,
  userIdForRBAC?: string
): Promise<string> {
  const { where, startDate, endDate } = buildWhereClause(filters, userIdForRBAC)

  // Fetch all events
  let events = await prisma.costEvent.findMany({
    where,
    select: {
      id: true,
      occurredAt: true,
      source: true,
      provider: true,
      service: true,
      amountEur: true,
      amountUsd: true,
      currency: true,
      dimensions: true,
    },
  })

  // Apply same filters as getCostEvents
  if (userIdForRBAC) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.userId === userIdForRBAC
    })
  }

  if (filters.userId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.userId === filters.userId
    })
  }
  if (filters.teamId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.teamId === filters.teamId
    })
  }
  if (filters.projectId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.projectId === filters.projectId
    })
  }
  if (filters.appId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.appId === filters.appId
    })
  }
  if (filters.clientId) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.clientId === filters.clientId
    })
  }

  if (filters.model) {
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return dims.model === filters.model
    })
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    events = events.filter((e) => {
      const dims = (e.dimensions as any) || {}
      return (
        e.provider?.toLowerCase().includes(searchLower) ||
        dims.model?.toLowerCase().includes(searchLower) ||
        e.service?.toLowerCase().includes(searchLower)
      )
    })
  }

  // Fetch dimension names for CSV
  const teamIds = [...new Set(events.map((e) => {
    const dims = (e.dimensions as any) || {}
    return (e as any).teamId || dims.teamId
  }).filter(Boolean) as string[])]
  const projectIds = [...new Set(events.map((e) => {
    const dims = (e.dimensions as any) || {}
    return (e as any).projectId || dims.projectId
  }).filter(Boolean) as string[])]
  const appIds = [...new Set(events.map((e) => {
    const dims = (e.dimensions as any) || {}
    return (e as any).appId || dims.appId
  }).filter(Boolean) as string[])]
  const clientIds = [...new Set(events.map((e) => {
    const dims = (e.dimensions as any) || {}
    return (e as any).clientId || dims.clientId
  }).filter(Boolean) as string[])]

  const [teams, projects, apps, clients] = await Promise.all([
    teamIds.length > 0
      ? prisma.team.findMany({
          where: { id: { in: teamIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
    projectIds.length > 0
      ? prisma.project.findMany({
          where: { id: { in: projectIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
    appIds.length > 0
      ? prisma.app.findMany({
          where: { id: { in: appIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
    clientIds.length > 0
      ? prisma.client.findMany({
          where: { id: { in: clientIds }, orgId: filters.orgId },
          select: { id: true, name: true },
        })
      : [],
  ])

  const teamMap = new Map(teams.map((t) => [t.id, t.name]))
  const projectMap = new Map(projects.map((p) => [p.id, p.name]))
  const appMap = new Map(apps.map((a) => [a.id, a.name]))
  const clientMap = new Map(clients.map((c) => [c.id, c.name]))

  // Generate CSV
  const headers = [
    'Date',
    'Source',
    'Provider',
    'Service',
    'Model',
    'Amount (EUR)',
    'Amount (USD)',
    'Currency',
    'User ID',
    'Team',
    'Project',
    'App',
    'Client',
    'Event ID',
  ]

  const rows = events.map((e) => {
    const dims = (e.dimensions as any) || {}
    const teamId = (e as any).teamId || dims.teamId
    const projectId = (e as any).projectId || dims.projectId
    const appId = (e as any).appId || dims.appId
    const clientId = (e as any).clientId || dims.clientId
    return [
      e.occurredAt.toISOString(),
      e.source,
      e.provider || '',
      e.service || '',
      dims.model || '',
      Number(e.amountEur).toFixed(4),
      e.amountUsd ? Number(e.amountUsd).toFixed(4) : '',
      e.currency,
      dims.userId || '',
      (teamId && teamMap.get(teamId)) || '',
      (projectId && projectMap.get(projectId)) || '',
      (appId && appMap.get(appId)) || '',
      (clientId && clientMap.get(clientId)) || '',
      e.id,
    ]
  })

  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')

  return csv
}


