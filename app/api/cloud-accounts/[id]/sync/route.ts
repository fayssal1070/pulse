import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { syncCloudAccountCosts } from '@/lib/aws-sync-pipeline'

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

    // Only allow sync for AWS Cost Explorer accounts
    if (cloudAccount.provider !== 'AWS' || cloudAccount.connectionType !== 'COST_EXPLORER') {
      return NextResponse.json(
        { error: 'This account does not support cost syncing' },
        { status: 400 }
      )
    }

    // Perform sync with force=true to allow manual sync even if recently synced
    // The lock DB will still prevent parallel syncs on the same account
    const syncStartTime = new Date()
    const result = await syncCloudAccountCosts(id, true)

    if (!result.success) {
      // Log failed sync
      console.log('[SYNC_MANUAL]', JSON.stringify({
        orgId,
        cloudAccountId: id,
        timestamp: syncStartTime.toISOString(),
        success: false,
        error: result.error,
      }))
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    // Log successful sync
    console.log('[SYNC_MANUAL]', JSON.stringify({
      orgId,
      cloudAccountId: id,
      timestamp: syncStartTime.toISOString(),
      success: true,
      recordsCount: result.recordsCount,
      totalAmount: result.totalAmount,
      services: result.services,
    }))

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

