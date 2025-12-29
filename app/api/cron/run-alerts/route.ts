import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dispatchAlertsForOrg } from '@/lib/alerts/dispatch'

/**
 * Cron job to run alerts dispatch for all organizations
 * Runs every 2 hours
 * Protected by CRON_SECRET
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Get all active organizations
    // For now, process all orgs. In future, add alertingEnabled flag if needed
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    })

    const results = await Promise.allSettled(
      organizations.map((org) => dispatchAlertsForOrg(org.id))
    )

    // Aggregate results
    let totalTriggered = 0
    let totalSentEmail = 0
    let totalSentTelegram = 0
    const allErrors: string[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalTriggered += result.value.triggered
        totalSentEmail += result.value.sentEmail
        totalSentTelegram += result.value.sentTelegram
        allErrors.push(...result.value.errors)
      } else {
        allErrors.push(result.reason?.message || 'Unknown error')
      }
    }

    return NextResponse.json({
      message: `Alerts dispatch completed for ${organizations.length} organizations`,
      processedOrgs: organizations.length,
      triggered: totalTriggered,
      sentEmail: totalSentEmail,
      sentTelegram: totalSentTelegram,
      errorsCount: allErrors.length,
      errors: allErrors.slice(0, 10), // Limit errors in response
    })
  } catch (error: any) {
    console.error('Cron run-alerts error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run alerts dispatch' },
      { status: 500 }
    )
  }
}

