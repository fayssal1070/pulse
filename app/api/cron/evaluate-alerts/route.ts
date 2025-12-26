import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluateOrganizationAlerts, createAlertNotifications } from '@/lib/alerts-evaluator'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
      },
    })

    const results: Array<{
      orgId: string
      alertsEvaluated: number
      alertsTriggered: number
      errors: string[]
    }> = []

    for (const org of organizations) {
      const orgResult = {
        orgId: org.id,
        alertsEvaluated: 0,
        alertsTriggered: 0,
        errors: [] as string[],
      }

      try {
        // Evaluate alerts for this organization
        const evaluationResults = await evaluateOrganizationAlerts(org.id)
        orgResult.alertsEvaluated = evaluationResults.length

        // Get organization members
        const memberships = await prisma.membership.findMany({
          where: { orgId: org.id },
          select: { userId: true },
        })
        const userIds = memberships.map((m) => m.userId)

        // Create notifications for each triggered alert
        for (const result of evaluationResults) {
          try {
            await createAlertNotifications(result, userIds)
            orgResult.alertsTriggered++
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            orgResult.errors.push(`Failed to create notifications for alert ${result.alertId}: ${errorMessage}`)
            console.error(`Error creating notifications for alert ${result.alertId}:`, error)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        orgResult.errors.push(`Failed to evaluate alerts: ${errorMessage}`)
        console.error(`Error evaluating alerts for org ${org.id}:`, error)
      }

      results.push(orgResult)
    }

    const totalEvaluated = results.reduce((sum, r) => sum + r.alertsEvaluated, 0)
    const totalTriggered = results.reduce((sum, r) => sum + r.alertsTriggered, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      organizationsProcessed: organizations.length,
      totalAlertsEvaluated: totalEvaluated,
      totalAlertsTriggered: totalTriggered,
      totalErrors,
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

