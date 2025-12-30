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
    const directUrl = process.env.DIRECT_URL || ''
    
    let dbInfo: {
      host: string | null
      port: string | null
      dbname: string | null
      connectionType: 'pooler' | 'direct' | 'unknown'
      hasCredentials: boolean
      hasCa: boolean
    } = {
      host: null,
      port: null,
      dbname: null,
      connectionType: 'unknown',
      hasCredentials: false,
      hasCa: !!process.env.SUPABASE_DB_CA_PEM,
    }

    try {
      // Parse DATABASE_URL (format: postgresql://user:pass@host:port/dbname?params)
      const url = new URL(dbUrl.replace(/^postgresql:/, 'http:'))
      dbInfo.host = url.hostname
      dbInfo.port = url.port || '5432'
      dbInfo.dbname = url.pathname.replace(/^\//, '') || null
      dbInfo.hasCredentials = !!(url.username || url.password)
      
      // Detect connection type
      if (url.port === '6543' || url.hostname.includes('pooler')) {
        dbInfo.connectionType = 'pooler'
      } else if (url.port === '5432' || url.hostname.includes('db.') && url.hostname.includes('.supabase.co')) {
        dbInfo.connectionType = 'direct'
      }
    } catch (error) {
      // Invalid URL format
      dbInfo.host = 'invalid-url'
    }
    
    // Parse DIRECT_URL if different
    let directInfo: { host: string | null; port: string | null } = { host: null, port: null }
    if (directUrl && directUrl !== dbUrl) {
      try {
        const directUrlParsed = new URL(directUrl.replace(/^postgresql:/, 'http:'))
        directInfo.host = directUrlParsed.hostname
        directInfo.port = directUrlParsed.port || '5432'
      } catch (error) {
        // Ignore
      }
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
      db: {
        ...dbInfo,
        // Mask password in connection string for display (if present)
        urlMasked: dbUrl ? dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@') : null,
      },
      directUrl: directInfo.host ? {
        host: directInfo.host,
        port: directInfo.port,
        isDifferent: directUrl !== dbUrl,
      } : null,
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

