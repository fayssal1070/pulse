import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getActiveOrganization } from '@/lib/active-org'

/**
 * POST /api/admin/ops/run-cur-now
 * Trigger CUR sync manually (admin only, server-side proxy)
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

    const response = await fetch(`${baseUrl}/api/cron/sync-aws-cur`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to sync CUR' }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: 'CUR sync triggered successfully',
      result: data,
    })
  } catch (error: any) {
    console.error('Error triggering CUR sync:', error)
    return NextResponse.json({ error: error.message || 'Failed to trigger CUR sync' }, { status: 500 })
  }
}

