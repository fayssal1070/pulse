import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public endpoint - no auth required for diagnostic
export async function GET(request: NextRequest) {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const env = process.env.VERCEL_ENV || 'local'
  const buildTimestamp = new Date().toISOString()
  
  return NextResponse.json(
    {
      commitShaShort: commitSha.substring(0, 7),
      env: env,
      buildTimestamp: buildTimestamp,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    }
  )
}

