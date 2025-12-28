import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { syncCurForOrg } from '@/lib/aws/cur'

export async function POST(request: Request) {
  try {
    // Verify CRON_SECRET
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all orgs with CUR enabled
    const orgs = await prisma.organization.findMany({
      where: {
        awsCurEnabled: true,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const results = []

    for (const org of orgs) {
      try {
        const result = await syncCurForOrg(org.id)
        results.push({
          orgId: org.id,
          orgName: org.name,
          success: true,
          batchId: result.batchId,
          eventsUpserted: result.eventsUpserted,
          errorsCount: result.errorsCount,
        })
      } catch (error: any) {
        results.push({
          orgId: org.id,
          orgName: org.name,
          success: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      orgsProcessed: orgs.length,
      results,
    })
  } catch (error: any) {
    console.error('Cron CUR sync error:', error)
    return NextResponse.json({ error: error.message || 'Failed to sync CUR' }, { status: 500 })
  }
}

