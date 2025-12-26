import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

// PATCH: Update an alert
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; alertId: string }> }
) {
  try {
    const user = await requireAuth()
    const { id, alertId } = await params
    const organization = await getOrganizationById(id, user.id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    // Verify alert belongs to organization
    const existingAlert = await prisma.alertRule.findUnique({
      where: { id: alertId },
    })

    if (!existingAlert || existingAlert.orgId !== id) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      type,
      enabled,
      thresholdEUR,
      spikePercent,
      lookbackDays,
      cooldownHours,
      notifyEmail,
    } = body

    // Build update object
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) {
      if (type !== 'MONTHLY_BUDGET' && type !== 'DAILY_SPIKE') {
        return NextResponse.json(
          { error: 'Invalid alert type' },
          { status: 400 }
        )
      }
      updateData.type = type
    }
    if (enabled !== undefined) updateData.enabled = enabled
    if (thresholdEUR !== undefined) {
      if (thresholdEUR <= 0) {
        return NextResponse.json(
          { error: 'thresholdEUR must be greater than 0' },
          { status: 400 }
        )
      }
      updateData.thresholdEUR = parseFloat(thresholdEUR)
    }
    if (spikePercent !== undefined) {
      updateData.spikePercent = spikePercent === null ? null : parseFloat(spikePercent)
    }
    if (lookbackDays !== undefined) updateData.lookbackDays = parseInt(lookbackDays)
    if (cooldownHours !== undefined) updateData.cooldownHours = parseInt(cooldownHours)
    if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail

    const alert = await prisma.alertRule.update({
      where: { id: alertId },
      data: updateData,
    })

    return NextResponse.json({ alert })
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete an alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; alertId: string }> }
) {
  try {
    const user = await requireAuth()
    const { id, alertId } = await params
    const organization = await getOrganizationById(id, user.id)

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    // Verify alert belongs to organization
    const existingAlert = await prisma.alertRule.findUnique({
      where: { id: alertId },
    })

    if (!existingAlert || existingAlert.orgId !== id) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.alertRule.delete({
      where: { id: alertId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

