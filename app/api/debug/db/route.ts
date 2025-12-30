import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/debug/db
 * Test database connection and return sanitized connection info (admin only)
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    // Sanitize DATABASE_URL to extract host/port/dbname (no credentials)
    const dbUrl = process.env.DATABASE_URL || ''
    let dbInfo: {
      host: string | null
      port: string | null
      dbname: string | null
      hasCredentials: boolean
      hasCa: boolean
    } = {
      host: null,
      port: null,
      dbname: null,
      hasCredentials: false,
      hasCa: !!process.env.SUPABASE_DB_CA_PEM,
    }

    try {
      // Parse connection string (format: postgresql://user:pass@host:port/dbname?params)
      const url = new URL(dbUrl.replace(/^postgresql:/, 'http:'))
      dbInfo.host = url.hostname
      dbInfo.port = url.port || '5432'
      dbInfo.dbname = url.pathname.replace(/^\//, '') || null
      dbInfo.hasCredentials = !!(url.username || url.password)
    } catch (error) {
      // Invalid URL format
      dbInfo.host = 'invalid-url'
    }

    // Test connection with a simple query
    const startTime = Date.now()
    let queryOk = false
    let queryError: { code: string; message: string } | null = null

    try {
      await prisma.$queryRaw`SELECT 1`
      queryOk = true
    } catch (error: any) {
      queryError = {
        code: error.code || 'UNKNOWN',
        message: error.message || 'Unknown error',
      }
    }

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      ok: queryOk,
      latencyMs,
      db: dbInfo,
      error: queryError,
      // Additional debug info (safe to expose)
      hasExtraCa: !!process.env.NODE_EXTRA_CA_CERTS,
      extraCaPath: process.env.NODE_EXTRA_CA_CERTS || null,
      nodeEnv: process.env.NODE_ENV || 'development',
      vercelEnv: process.env.VERCEL_ENV || null,
    })
  } catch (error: any) {
    console.error('Error in /api/debug/db:', error)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: error.message || 'Failed to test database connection',
        },
      },
      { status: 500 }
    )
  }
}

