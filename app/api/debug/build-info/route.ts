import { NextResponse } from 'next/server'

export async function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  const env = process.env.VERCEL_ENV || 'local'
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'unknown'
  
  return NextResponse.json({
    commitSha,
    commitShaShort: commitSha.substring(0, 7),
    env,
    buildId,
    timestamp: new Date().toISOString(),
  })
}

