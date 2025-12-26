import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'

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

    const searchParams = request.nextUrl.searchParams
    const lookbackDays = parseInt(searchParams.get('lookbackDays') || '7', 10)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0)

    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Get today's costs
    const todayCosts = await prisma.costRecord.aggregate({
      where: {
        orgId: id,
        date: {
          gte: today,
          lte: todayEnd,
        },
      },
      _sum: {
        amountEUR: true,
      },
    })

    const todayAmount = todayCosts._sum.amountEUR || 0

    // Get baseline
    const baselineStart = new Date(today)
    baselineStart.setDate(baselineStart.getDate() - lookbackDays)

    const baselineCosts = await prisma.costRecord.aggregate({
      where: {
        orgId: id,
        date: {
          gte: baselineStart,
          lt: today,
        },
      },
      _sum: {
        amountEUR: true,
      },
    })

    const baselineTotal = baselineCosts._sum.amountEUR || 0
    const baselineAverage = baselineTotal / lookbackDays

    const spikePercent =
      baselineAverage > 0
        ? ((todayAmount - baselineAverage) / baselineAverage) * 100
        : todayAmount > 0
        ? 999
        : 0

    return NextResponse.json({
      todayAmount,
      baselineAverage,
      spikePercent,
    })
  } catch (error) {
    console.error('Error fetching daily spike preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

