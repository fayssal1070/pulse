import { NextRequest, NextResponse } from 'next/server'

// Intercept /api/auth/error so Auth.js doesn't try to parse it as an action.
// This avoids the "UnknownAction" error and redirects to the UI error page.
export async function GET(request: NextRequest) {
  console.error('[auth][api-error-route-hit]', request.nextUrl.toString())
  const url = new URL('/auth/error', request.url)
  return NextResponse.redirect(url)
}


