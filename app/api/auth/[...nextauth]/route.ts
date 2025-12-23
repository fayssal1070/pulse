import { NextRequest } from 'next/server'
import { handlers } from '@/auth'

// Wrap NextAuth handlers to add clear server-side logging on errors (Vercel)
export async function GET(req: NextRequest) {
  try {
    return await handlers.GET(req)
  } catch (error) {
    console.error('[auth][route][GET][error]', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handlers.POST(req)
  } catch (error) {
    console.error('[auth][route][POST][error]', error)
    throw error
  }
}

