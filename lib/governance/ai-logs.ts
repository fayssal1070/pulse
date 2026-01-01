/**
 * Governance AI Logs - Query functions for AI request logs with filters, pagination, and export
 * Multi-tenant strict (orgId scoped) + RBAC
 */

import { prisma } from '@/lib/prisma'

export interface AiLogsFilters {
  orgId: string
  dateRange?: 'last7' | 'last30' | 'mtd' | 'lastMonth' | 'custom'
  startDate?: Date
  endDate?: Date
  model?: string
  provider?: string
  statusCode?: '2xx' | '4xx' | '5xx' | 'all'
  userId?: string
  teamId?: string
  projectId?: string
  appId?: string
  clientId?: string
  search?: string
}

export interface AiLogsSummary {
  totalRequests: number
  totalCost: number
  avgLatency: number
  errorRate: number
}

export interface AiLogRow {
  id: string
  occurredAt: Date
  provider: string
  model: string
  estimatedCostEur: number | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  latencyMs: number | null
  statusCode: number | null
  userId: string | null
  teamId: string | null
  projectId: string | null
  appId: string | null
  clientId: string | null
  rawRef: any
}

/**
 * Get date range from filter
 */
function getDateRange(filters: AiLogsFilters): { startDate: Date; endDate: Date } {
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
function buildWhereClause(filters: AiLogsFilters, userIdForRBAC?: string) {
  const { startDate, endDate } = getDateRange(filters)
  const where: any = {
    orgId: filters.orgId,
    occurredAt: {
      gte: startDate,
      lte: endDate,
    },
  }

  // RBAC: if userIdForRBAC is provided, filter by userId
  if (userIdForRBAC) {
    where.userId = userIdForRBAC
  }

  // Provider filter
  if (filters.provider) {
    where.provider = filters.provider
  }

  // Model filter
  if (filters.model) {
    where.model = filters.model
  }

  // Status code filter
  if (filters.statusCode && filters.statusCode !== 'all') {
    if (filters.statusCode === '2xx') {
      where.statusCode = { gte: 200, lt: 300 }
    } else if (filters.statusCode === '4xx') {
      where.statusCode = { gte: 400, lt: 500 }
    } else if (filters.statusCode === '5xx') {
      where.statusCode = { gte: 500, lt: 600 }
    }
  }

  // Dimension filters
  if (filters.userId) {
    where.userId = filters.userId
  }
  if (filters.teamId) {
    where.teamId = filters.teamId
  }
  if (filters.projectId) {
    where.projectId = filters.projectId
  }
  if (filters.appId) {
    where.appId = filters.appId
  }
  if (filters.clientId) {
    where.clientId = filters.clientId
  }

  return { where, startDate, endDate }
}

/**
 * Get AI logs summary (KPIs)
 */
export async function getAiLogsSummary(
  filters: AiLogsFilters,
  userIdForRBAC?: string
): Promise<AiLogsSummary> {
  const { where } = buildWhereClause(filters, userIdForRBAC)

  // Fetch all logs for summary
  const logs = await prisma.aiRequestLog.findMany({
    where,
    select: {
      estimatedCostEur: true,
      latencyMs: true,
      statusCode: true,
    },
  })

  const totalRequests = logs.length
  const totalCost = logs.reduce((sum, log) => sum + (log.estimatedCostEur ? Number(log.estimatedCostEur) : 0), 0)
  const avgLatency =
    logs.filter((l) => l.latencyMs !== null).length > 0
      ? logs.filter((l) => l.latencyMs !== null).reduce((sum, log) => sum + (log.latencyMs || 0), 0) /
        logs.filter((l) => l.latencyMs !== null).length
      : 0
  const errorCount = logs.filter((l) => l.statusCode && (l.statusCode >= 400 || l.statusCode < 200)).length
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0

  return {
    totalRequests,
    totalCost,
    avgLatency: Math.round(avgLatency),
    errorRate: Math.round(errorRate * 100) / 100,
  }
}

/**
 * Query AI request logs with pagination
 */
export async function queryAiRequestLogs(
  filters: AiLogsFilters,
  page: number = 1,
  pageSize: number = 25,
  userIdForRBAC?: string
): Promise<{ logs: AiLogRow[]; totalCount: number }> {
  const { where } = buildWhereClause(filters, userIdForRBAC)

  // Handle search filter (in memory after fetch)
  let logs = await prisma.aiRequestLog.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    select: {
      id: true,
      occurredAt: true,
      provider: true,
      model: true,
      estimatedCostEur: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      latencyMs: true,
      statusCode: true,
      userId: true,
      teamId: true,
      projectId: true,
      appId: true,
      clientId: true,
      rawRef: true,
    },
  })

  // Apply search filter if specified
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    logs = logs.filter((log) => {
      return (
        log.provider?.toLowerCase().includes(searchLower) ||
        log.model?.toLowerCase().includes(searchLower) ||
        log.userId?.toLowerCase().includes(searchLower) ||
        log.appId?.toLowerCase().includes(searchLower) ||
        log.projectId?.toLowerCase().includes(searchLower) ||
        log.clientId?.toLowerCase().includes(searchLower)
      )
    })
  }

  const totalCount = logs.length
  const skip = (page - 1) * pageSize
  const paginatedLogs = logs.slice(skip, skip + pageSize)

  // Map to AiLogRow
  const rows: AiLogRow[] = paginatedLogs.map((log) => ({
    id: log.id,
    occurredAt: log.occurredAt,
    provider: log.provider,
    model: log.model,
    estimatedCostEur: log.estimatedCostEur ? Number(log.estimatedCostEur) : null,
    inputTokens: log.inputTokens,
    outputTokens: log.outputTokens,
    totalTokens: log.totalTokens,
    latencyMs: log.latencyMs,
    statusCode: log.statusCode,
    userId: log.userId,
    teamId: log.teamId,
    projectId: log.projectId,
    appId: log.appId,
    clientId: log.clientId,
    rawRef: log.rawRef,
  }))

  return { logs: rows, totalCount }
}

/**
 * Export AI request logs as CSV (limited to 10k rows)
 */
export async function exportAiRequestLogsCsv(
  filters: AiLogsFilters,
  userIdForRBAC?: string
): Promise<string> {
  const { where } = buildWhereClause(filters, userIdForRBAC)

  // Fetch logs (max 10k)
  let logs = await prisma.aiRequestLog.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: 10000,
    select: {
      id: true,
      occurredAt: true,
      provider: true,
      model: true,
      estimatedCostEur: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      latencyMs: true,
      statusCode: true,
      userId: true,
      teamId: true,
      projectId: true,
      appId: true,
      clientId: true,
      rawRef: true,
    },
  })

  // Apply search filter if specified
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    logs = logs.filter((log) => {
      return (
        log.provider?.toLowerCase().includes(searchLower) ||
        log.model?.toLowerCase().includes(searchLower) ||
        log.userId?.toLowerCase().includes(searchLower) ||
        log.appId?.toLowerCase().includes(searchLower) ||
        log.projectId?.toLowerCase().includes(searchLower) ||
        log.clientId?.toLowerCase().includes(searchLower)
      )
    })
  }

  // Generate CSV
  const headers = [
    'Time',
    'Provider',
    'Model',
    'Cost (EUR)',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
    'Latency (ms)',
    'Status Code',
    'User ID',
    'Team ID',
    'Project ID',
    'App ID',
    'Client ID',
    'Request ID',
  ]

  const rows = logs.map((log) => {
    const rawRef = (log.rawRef as any) || {}
    return [
      log.occurredAt.toISOString(),
      log.provider || '',
      log.model || '',
      log.estimatedCostEur ? Number(log.estimatedCostEur).toFixed(4) : '',
      log.inputTokens?.toString() || '',
      log.outputTokens?.toString() || '',
      log.totalTokens?.toString() || '',
      log.latencyMs?.toString() || '',
      log.statusCode?.toString() || '',
      log.userId || '',
      log.teamId || '',
      log.projectId || '',
      log.appId || '',
      log.clientId || '',
      rawRef.requestId || log.id,
    ]
  })

  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')

  return csv
}

