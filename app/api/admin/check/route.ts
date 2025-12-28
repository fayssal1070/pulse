import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { isAdmin } from '@/lib/admin-helpers'

export async function GET() {
  try {
    // Require authentication first
    await requireAuth()
    const admin = await isAdmin()
    return NextResponse.json({ isAdmin: admin })
  } catch (error) {
    return NextResponse.json({ isAdmin: false })
  }
}

