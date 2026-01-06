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

