import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { thresholdEUR, windowDays } = await request.json()

    // Récupérer l'organisation active
    const orgId = await getActiveOrganizationId(user.id)
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found. Please select an organization first.' },
        { status: 400 }
      )
    }

    if (thresholdEUR === undefined || thresholdEUR <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      )
    }

    const alertRule = await prisma.alertRule.create({
      data: {
        orgId,
        thresholdEUR: parseFloat(thresholdEUR),
        windowDays: parseInt(windowDays) || 7,
      },
    })

    return NextResponse.json({ alertRule })
  } catch (error) {
    console.error('Alert rule creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
