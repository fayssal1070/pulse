import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function GET() {
  const hasAuthSecret = !!process.env.AUTH_SECRET
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET
  const hasNextAuthUrl = !!process.env.NEXTAUTH_URL
  const hasAuthTrustHost = process.env.AUTH_TRUST_HOST === 'true'

  let hasUser = false
  try {
    const session = await auth()
    hasUser = !!session?.user
  } catch (error) {
    console.error('[auth][debug][_debug/auth][error]', error)
  }

  return NextResponse.json({
    env: {
      hasAuthSecret,
      hasNextAuthSecret,
      hasNextAuthUrl,
      hasAuthTrustHost,
    },
    session: {
      hasUser,
    },
  })
}




