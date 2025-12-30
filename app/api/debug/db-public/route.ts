import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/debug/db-public
 * Public database connection test (no auth required)
 * Protected by simple secret query param: ?secret=DEBUG_DB_SECRET
 * 
 * WARNING: This endpoint should be removed or disabled in production
 * Only use for debugging TLS connection issues
 */
export async function GET(request: Request) {
  // Simple secret check (not secure, but enough for debugging)
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const expectedSecret = process.env.DEBUG_DB_SECRET || 'debug-tls-2024'

  if (secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Invalid secret. Use ?secret=DEBUG_DB_SECRET' },
      { status: 401 }
    )
  }

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
    // Parse DATABASE_URL
    const url = new URL(dbUrl.replace(/^postgresql:/, 'http:'))
    dbInfo.host = url.hostname
    dbInfo.port = url.port || '5432'
    dbInfo.dbname = url.pathname.replace(/^\//, '') || null
    dbInfo.hasCredentials = !!(url.username || url.password)
    
    // Detect connection type
    if (url.port === '6543' || url.hostname.includes('pooler')) {
      dbInfo.connectionType = 'pooler'
    } else if (url.port === '5432' || (url.hostname.includes('db.') && url.hostname.includes('.supabase.co'))) {
      dbInfo.connectionType = 'direct'
    }
  } catch (error) {
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
      urlMasked: dbUrl ? dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@') : null,
    },
    directUrl: directInfo.host ? {
      host: directInfo.host,
      port: directInfo.port,
      isDifferent: directUrl !== dbUrl,
    } : null,
    error: queryError,
    hasExtraCa: !!process.env.NODE_EXTRA_CA_CERTS,
    extraCaPath: process.env.NODE_EXTRA_CA_CERTS || null,
    caFileExists: (() => {
      try {
        const fs = require('fs')
        const caPath = process.env.NODE_EXTRA_CA_CERTS
        return caPath ? fs.existsSync(caPath) : false
      } catch {
        return false
      }
    })(),
    caFileSize: (() => {
      try {
        const fs = require('fs')
        const caPath = process.env.NODE_EXTRA_CA_CERTS
        if (caPath && fs.existsSync(caPath)) {
          return fs.statSync(caPath).size
        }
        return null
      } catch {
        return null
      }
    })(),
    nodeEnv: process.env.NODE_ENV || 'development',
    vercelEnv: process.env.VERCEL_ENV || null,
  })
}

