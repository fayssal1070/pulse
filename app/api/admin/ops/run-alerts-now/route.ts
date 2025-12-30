import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'

/**
 * POST /api/admin/ops/run-alerts-now
 * Trigger alerts dispatch manually (admin only, server-side proxy)
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    await requireRole(activeOrg.id, 'admin')

    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    // Call the cron endpoint internally with CRON_SECRET
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/cron/run-alerts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to run alerts' }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Alerts dispatch triggered successfully',
      result: data,
    })
  } catch (error: any) {
    console.error('Error triggering alerts dispatch:', error)
    return NextResponse.json({ error: error.message || 'Failed to trigger alerts dispatch' }, { status: 500 })
  }
}

