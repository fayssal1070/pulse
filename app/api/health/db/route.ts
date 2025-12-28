import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Database healthcheck endpoint
 * Safe for production - no secrets exposed
 * GET /api/health/db
 */
export async function GET() {
  const startTime = Date.now()
  const commitShaShort = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local'
  const vercelEnv = process.env.VERCEL_ENV || 'development'

  try {
    // Simple Prisma query with timeout
    // Using count() as it's lightweight and doesn't require specific table permissions
    const result = await Promise.race([
      prisma.user.count(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      ),
    ])

    const latencyMs = Date.now() - startTime

    return NextResponse.json(
      {
        ok: true,
        latencyMs,
        commitShaShort,
        vercelEnv,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error: any) {
    const latencyMs = Date.now() - startTime
    const errorCode = error.code || 'UNKNOWN'
    const message = error.message || 'Database healthcheck failed'
    
    // Safe error message - no stack traces, no connection strings
    let hint = 'Check DATABASE_URL configuration'
    if (errorCode === 'P1011') {
      hint = 'TLS certificate issue - verify DATABASE_URL has sslmode=require (not sslaccept)'
    } else if (errorCode === 'P1001') {
      hint = 'Cannot reach database - verify host/port (6543 for pooler) and network connectivity'
    } else if (errorCode === 'P1000') {
      hint = 'Authentication failed - verify DATABASE_URL credentials'
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode,
        message: message.replace(/postgresql:\/\/[^@]+@/g, 'postgresql://***:***@'), // Sanitize connection string if leaked
        hint,
        latencyMs,
        commitShaShort,
        vercelEnv,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503, // Service Unavailable
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  }
}

