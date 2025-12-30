import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'

/**
 * GET /api/debug/db-connection
 * Admin-only endpoint to test Prisma connection and show connection details
 * 
 * Returns:
 * - ok: true/false
 * - error: { code, message } if failed
 * - connectionInfo: { databaseUrl, directUrl } with host/port (no credentials)
 */
export async function GET() {
  try {
    // Admin only
    const activeOrg = await getActiveOrganization()
    if (!activeOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireRole(activeOrg.id, 'admin')
    if (!hasAccess) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    // Parse connection URLs (sanitize credentials)
    const parseUrl = (url: string | undefined): { host: string | null; port: string | null; urlMasked: string | null } => {
      if (!url) return { host: null, port: null, urlMasked: null }
      
      try {
        // Replace postgresql:// with http:// for URL parsing
        const httpUrl = url.replace(/^postgresql:/, 'http:')
        const parsed = new URL(httpUrl)
        
        return {
          host: parsed.hostname,
          port: parsed.port || (parsed.hostname.includes('pooler') ? '6543' : '5432'),
          urlMasked: url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'),
        }
      } catch (error) {
        return { host: 'invalid-url', port: null, urlMasked: url.substring(0, 20) + '...' }
      }
    }

    const databaseUrl = process.env.DATABASE_URL
    const directUrl = process.env.DIRECT_URL

    const dbInfo = parseUrl(databaseUrl)
    const directInfo = parseUrl(directUrl)

    // Test Prisma connection
    const startTime = Date.now()
    let queryOk = false
    let queryError: { code: string; message: string } | null = null

    try {
      await prisma.$queryRaw`SELECT 1`
      queryOk = true
    } catch (error: any) {
      queryError = {
        code: error.code || 'UNKNOWN',
        message: (error.message || 'Unknown error').substring(0, 200), // Truncate long messages
      }
    }

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      ok: queryOk,
      latencyMs,
      error: queryError,
      connectionInfo: {
        databaseUrl: dbInfo.urlMasked ? {
          host: dbInfo.host,
          port: dbInfo.port,
          urlMasked: dbInfo.urlMasked,
        } : null,
        directUrl: directInfo.urlMasked ? {
          host: directInfo.host,
          port: directInfo.port,
          urlMasked: directInfo.urlMasked,
        } : null,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'ENDPOINT_ERROR',
          message: error.message?.substring(0, 200) || 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

