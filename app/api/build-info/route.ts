import { NextResponse } from 'next/server'

// Public endpoint - no auth required for diagnostic
export async function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const env = process.env.VERCEL_ENV || 'local'
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || null
  
  return NextResponse.json({
    commitShaShort: commitSha.substring(0, 7),
    commitSha,
    vercelEnv: env,
    vercelDeploymentId: deploymentId,
  })
}

