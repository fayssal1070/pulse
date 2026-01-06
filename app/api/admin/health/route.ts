import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { isAdmin } from '@/lib/admin-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Admin-only health check endpoint
 * Returns system health, DB status, migrations, and cron run status
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const adminUser = await isAdmin()

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const health: any = {
      ok: true,
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        vercelEnv: process.env.VERCEL_ENV || null,
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      },
      db: {
        ok: false,
        latency: null as number | null,
        host: null as string | null,
        port: null as number | null,
        dbname: null as string | null,
        connectionType: null as string | null,
      },
      migrations: {
        lastMigration: null as string | null,
        appliedAt: null as string | null,
      },
      cron: {
        RUN_ALERTS: null as any,
        APPLY_RETENTION: null as any,
        SYNC_AWS_CUR: null as any,
        RETRY_NOTIFICATIONS: null as any,
      },
      recentErrors: [] as any[],
          notificationFailures: {
            byChannel: {} as Record<string, number>,
            total: 0,
          },
          apiKeys: {
            active: 0,
            revoked: 0,
            neverUsed: 0,
            lastUsedOldest: null as string | null,
            lastUsedNewest: null as string | null,
          },
          recentKeyAudits: [] as any[],
        }

    // Test DB connection and get latency
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbLatency = Date.now() - dbStart
      health.db.ok = true
      health.db.latency = dbLatency

      // Extract DB connection info from DATABASE_URL
      const dbUrl = process.env.DATABASE_URL || ''
      const urlMatch = dbUrl.match(/postgresql:\/\/(?:[^:]+):(?:[^@]+)@([^:]+):(\d+)\/(.+)/)
      if (urlMatch) {
        health.db.host = urlMatch[1]
        health.db.port = parseInt(urlMatch[2])
        health.db.dbname = urlMatch[3]
        health.db.connectionType = dbUrl.includes('pooler') ? 'pooler' : 'direct'
      }
    } catch (error: any) {
      health.db.ok = false
      health.db.error = error.message
      health.ok = false
    }

    // Get last migration info
    try {
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string; applied_steps_count: number; finished_at: Date | null }>>`
        SELECT migration_name, applied_steps_count, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC NULLS LAST, started_at DESC 
        LIMIT 1
      `
      if (migrations.length > 0) {
        health.migrations.lastMigration = migrations[0].migration_name
        health.migrations.appliedAt = migrations[0].finished_at?.toISOString() || null
      }
    } catch (error: any) {
      // Migration table might not exist or not accessible
      health.migrations.error = error.message
    }

    // Get failed notification deliveries (last 20) - org-agnostic for admin view
    try {
      const failedDeliveries = await prisma.notificationDelivery.findMany({
        where: {
          status: 'FAILED',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          channel: true,
        },
      })

      const failuresByChannel: Record<string, number> = {}
      failedDeliveries.forEach((d) => {
        failuresByChannel[d.channel] = (failuresByChannel[d.channel] || 0) + 1
      })

      health.notificationFailures.byChannel = failuresByChannel
      health.notificationFailures.total = failedDeliveries.length
    } catch (error: any) {
      // Ignore errors
    }

    // Initialize API keys stats
    health.apiKeys = {
      active: 0,
      revoked: 0,
      neverUsed: 0,
      lastUsedOldest: null as string | null,
      lastUsedNewest: null as string | null,
      top5BySpendMTD: [] as any[],
    }
    health.recentKeyAudits = [] as any[]
    health.recentKeyFailures = [] as any[]

    // Get API keys stats
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const [activeKeys, revokedKeys, keysWithoutUsage, oldestUsage, newestUsage, topKeysSpend] = await Promise.all([
        prisma.aiGatewayKey.count({ where: { status: 'active', enabled: true } }),
        prisma.aiGatewayKey.count({ where: { status: 'revoked' } }),
        prisma.aiGatewayKey.count({ where: { lastUsedAt: null } }),
        prisma.aiGatewayKey.findFirst({
          where: { lastUsedAt: { not: null } },
          orderBy: { lastUsedAt: 'asc' },
          select: { lastUsedAt: true },
        }),
        prisma.aiGatewayKey.findFirst({
          where: { lastUsedAt: { not: null } },
          orderBy: { lastUsedAt: 'desc' },
          select: { lastUsedAt: true },
        }),
        // Top 5 keys by MTD spend
        prisma.costEvent.groupBy({
          by: ['apiKeyId'],
          where: {
            apiKeyId: { not: null },
            source: 'AI',
            occurredAt: { gte: startOfMonth },
          },
          _sum: { amountEur: true },
          orderBy: { _sum: { amountEur: 'desc' } },
          take: 5,
        }),
      ])

      health.apiKeys.active = activeKeys
      health.apiKeys.revoked = revokedKeys
      health.apiKeys.neverUsed = keysWithoutUsage
      health.apiKeys.lastUsedOldest = oldestUsage?.lastUsedAt?.toISOString() || null
      health.apiKeys.lastUsedNewest = newestUsage?.lastUsedAt?.toISOString() || null

      // Resolve key labels for top spenders
      const topKeyIds = topKeysSpend.filter((k) => k.apiKeyId).map((k) => k.apiKeyId!)
      if (topKeyIds.length > 0) {
        const keys = await prisma.aiGatewayKey.findMany({
          where: { id: { in: topKeyIds } },
          select: { id: true, label: true, keyPrefix: true },
        })
        const keysMap = new Map(keys.map((k) => [k.id, k]))
        health.apiKeys.top5BySpendMTD = topKeysSpend
          .filter((k) => k.apiKeyId)
          .map((k) => {
            const key = keysMap.get(k.apiKeyId!)
            return {
              apiKeyId: k.apiKeyId,
              label: key?.label || 'Unnamed',
              prefix: key?.keyPrefix || 'unknown',
              spendMTD: k._sum.amountEur ? parseFloat(k._sum.amountEur.toString()) : 0,
            }
          })
      }

      // Get recent key audits (last 20)
      const recentAudits = await prisma.apiKeyAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          apiKeyId: true,
          actorUserId: true,
          action: true,
          createdAt: true,
          metaJson: true,
        },
      })

      health.recentKeyAudits = recentAudits.map((audit) => ({
        id: audit.id,
        apiKeyId: audit.apiKeyId,
        actorUserId: audit.actorUserId,
        action: audit.action,
        createdAt: audit.createdAt.toISOString(),
        meta: audit.metaJson ? JSON.parse(audit.metaJson) : null,
      }))

      // Get recent key failures (last 10 auth/limit blocks)
      const recentFailures = await prisma.aiRequestLog.findMany({
        where: {
          statusCode: { in: [401, 403, 429] },
          occurredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        select: {
          id: true,
          apiKeyId: true,
          statusCode: true,
          occurredAt: true,
          rawRef: true,
        },
      })

      health.recentKeyFailures = recentFailures.map((f) => ({
        id: f.id,
        apiKeyId: f.apiKeyId || null,
        statusCode: f.statusCode,
        occurredAt: f.occurredAt.toISOString(),
        reason:
          f.rawRef && typeof f.rawRef === 'object' && 'reason' in f.rawRef
            ? String(f.rawRef.reason)
            : `HTTP ${f.statusCode}`,
      }))
    } catch (error: any) {
      // Ignore errors
    }

    // Get last run per cron type
    try {
      const cronTypes = ['RUN_ALERTS', 'APPLY_RETENTION', 'SYNC_AWS_CUR', 'RETRY_NOTIFICATIONS']
      for (const type of cronTypes) {
        const lastRun = await prisma.cronRun.findFirst({
          where: { type },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            error: true,
            metaJson: true,
          },
        })

        if (lastRun) {
          health.cron[type] = {
            status: lastRun.status,
            startedAt: lastRun.startedAt.toISOString(),
            finishedAt: lastRun.finishedAt?.toISOString() || null,
            error: lastRun.error || null,
            meta: lastRun.metaJson ? JSON.parse(lastRun.metaJson) : null,
          }
        }
      }
    } catch (error: any) {
      health.cron.error = error.message
    }

    // Get recent errors (last 10 FAIL cron runs)
    try {
      const recentErrors = await prisma.cronRun.findMany({
        where: { status: 'FAIL' },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          error: true,
        },
      })

      health.recentErrors = recentErrors.map((e) => ({
        type: e.type,
        startedAt: e.startedAt.toISOString(),
        finishedAt: e.finishedAt?.toISOString() || null,
        error: e.error || null,
      }))
    } catch (error: any) {
      // Ignore errors fetching recent errors
    }

    return NextResponse.json(health)
  } catch (error: any) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Health check failed',
      },
      { status: 500 }
    )
  }
}

