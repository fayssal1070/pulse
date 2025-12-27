import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public endpoint - no auth required for diagnostic
export async function GET(request: NextRequest) {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const env = process.env.VERCEL_ENV || 'local'
  const buildTimestamp = new Date().toISOString()
  const vercelUrl = process.env.VERCEL_URL || null
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || null
  
  return NextResponse.json(
    {
      commitShaShort: commitSha.substring(0, 7),
      commitSha: commitSha,
      env: env,
      buildTimestamp: buildTimestamp,
      vercelUrl: vercelUrl,
      deploymentId: deploymentId,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  )
}

