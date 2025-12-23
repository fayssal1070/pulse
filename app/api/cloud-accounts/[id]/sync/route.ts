import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { syncCloudAccountCosts } from '@/lib/aws-sync-pipeline'

// Rate limiting: store last sync time per org
const lastSyncTimes = new Map<string, number>()
const RATE_LIMIT_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Get active organization
    const orgId = await getActiveOrganizationId(user.id)
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found' },
        { status: 400 }
      )
    }

    // Check if cloud account exists and belongs to user's org
    const cloudAccount = await prisma.cloudAccount.findUnique({
      where: { id },
      select: {
        id: true,
        orgId: true,
        provider: true,
        connectionType: true,
        status: true,
      },
    })

    if (!cloudAccount) {
      return NextResponse.json(
        { error: 'Cloud account not found' },
        { status: 404 }
      )
    }

    if (cloudAccount.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check rate limit
    const lastSync = lastSyncTimes.get(orgId)
    const now = Date.now()
    if (lastSync && now - lastSync < RATE_LIMIT_MS) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastSync)) / 1000)
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${remainingSeconds} seconds before syncing again.`,
        },
        { status: 429 }
      )
    }

    // Only allow sync for AWS Cost Explorer accounts
    if (cloudAccount.provider !== 'AWS' || cloudAccount.connectionType !== 'COST_EXPLORER') {
      return NextResponse.json(
        { error: 'This account does not support cost syncing' },
        { status: 400 }
      )
    }

    // Perform sync
    const result = await syncCloudAccountCosts(id)

    // Update rate limit
    lastSyncTimes.set(orgId, now)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recordsCount: result.recordsCount,
      totalAmount: result.totalAmount,
      services: result.services,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

