import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { isAdmin } from '@/lib/admin-helpers'

/**
 * Debug endpoint to check build information
 * Returns: commit hash, build timestamp, environment
 * Admin only - protected by authentication
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Check if user is admin
    const adminStatus = await isAdmin()
    if (!adminStatus) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get commit hash from environment variable
    const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
    const commitShaShort = commitSha.substring(0, 7)
    
    // Get environment
    const env = process.env.VERCEL_ENV || 'development'
    
    // Build timestamp (from Vercel or fallback to current time)
    // Note: Vercel doesn't expose build timestamp directly, so we use deployment time
    // In production, this will be the deployment time
    const buildTimestamp = process.env.VERCEL ? new Date().toISOString() : new Date().toISOString()
    
    // App version
    const appVersion = process.env.APP_VERSION || '1.0.0'
    
    // Additional info
    const vercelUrl = process.env.VERCEL_URL || null
    const vercel = process.env.VERCEL === '1'

    return NextResponse.json({
      commitSha,
      commitShaShort,
      env,
      buildTimestamp,
      appVersion,
      vercel,
      vercelUrl,
      deployment: {
        commit: commitShaShort,
        environment: env,
        timestamp: buildTimestamp,
        version: appVersion,
      },
    })
  } catch (error) {
    console.error('Debug build error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

