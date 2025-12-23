import { NextResponse } from 'next/server'

export async function GET() {
  // Return PULSE AWS account ID from environment variable
  // This should be set in Vercel environment variables
  const accountId = process.env.AWS_ACCOUNT_ID || null

  return NextResponse.json({ accountId })
}

