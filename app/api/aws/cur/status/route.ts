import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const activeOrg = await getActiveOrganization(user.id)

    if (!activeOrg) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Get latest batch
    const latestBatch = await prisma.ingestionBatch.findFirst({
      where: {
        orgId: activeOrg.id,
        source: 'AWS_CUR',
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    // Get cloud account CUR sync status
    const cloudAccount = await prisma.cloudAccount.findFirst({
      where: {
        orgId: activeOrg.id,
        provider: 'AWS',
        connectionType: 'CUR',
      },
      select: {
        lastCurSyncAt: true,
        lastCurSyncError: true,
      },
    })

    return NextResponse.json({
      orgId: activeOrg.id,
      lastBatch: latestBatch
        ? {
            batchId: latestBatch.batchId,
            status: latestBatch.status,
            startedAt: latestBatch.startedAt,
            finishedAt: latestBatch.finishedAt,
            objectsProcessed: latestBatch.objectsProcessed,
            rowsParsed: latestBatch.rowsParsed,
            eventsUpserted: latestBatch.eventsUpserted,
            errorsCount: latestBatch.errorsCount,
            sampleError: latestBatch.sampleError,
          }
        : null,
      lastSyncedAt: cloudAccount?.lastCurSyncAt || null,
      lastError: cloudAccount?.lastCurSyncError || null,
    })
  } catch (error: any) {
    console.error('CUR status error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get status' }, { status: 500 })
  }
}

