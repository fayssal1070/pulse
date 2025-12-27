import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

// GET: List all alerts for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const organization = await getOrganizationById(id, user.id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    const alerts = await prisma.alertRule.findMany({
      where: { orgId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { alertEvents: true },
        },
      },
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new alert
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const organization = await getOrganizationById(id, user.id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    // Check entitlements
    try {
      const { assertCanCreateAlert } = await import('@/lib/entitlements')
      await assertCanCreateAlert(id)
    } catch (error: any) {
      if (error.message?.includes('LIMIT_REACHED')) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'LIMIT_REACHED',
          },
          { status: 402 }
        )
      }
      throw error
    }

    const body = await request.json()
    const {
      name,
      type,
      thresholdEUR,
      spikePercent,
      lookbackDays = 7,
      cooldownHours = 24,
      enabled = true,
      notifyEmail = false,
    } = body

    // Validation
    if (!name || !type || !thresholdEUR || thresholdEUR <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      )
    }

    if (type !== 'MONTHLY_BUDGET' && type !== 'DAILY_SPIKE') {
      return NextResponse.json(
        { error: 'Invalid alert type. Must be MONTHLY_BUDGET or DAILY_SPIKE' },
        { status: 400 }
      )
    }

    if (type === 'DAILY_SPIKE' && spikePercent && spikePercent <= 0) {
      return NextResponse.json(
        { error: 'spikePercent must be greater than 0' },
        { status: 400 }
      )
    }

    const alert = await prisma.alertRule.create({
      data: {
        orgId: id,
        name,
        type,
        enabled,
        thresholdEUR: parseFloat(thresholdEUR),
        spikePercent: spikePercent ? parseFloat(spikePercent) : null,
        lookbackDays: parseInt(lookbackDays) || 7,
        cooldownHours: parseInt(cooldownHours) || 24,
        notifyEmail: notifyEmail === true,
      },
    })

    return NextResponse.json({ alert }, { status: 201 })
  } catch (error) {
    console.error('Error creating alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

