import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { resetDemoData, hasDemoData } from '@/lib/demo-data'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify user has access to this organization
    const organization = await getOrganizationById(id, user.id)
    if (!organization) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if organization has demo data
    const isDemo = await hasDemoData(id)
    if (!isDemo) {
      return NextResponse.json(
        { error: 'No demo data found for this organization.' },
        { status: 400 }
      )
    }

    // Reset demo data
    await resetDemoData(id)

    return NextResponse.json({
      success: true,
      message: 'Demo data reset successfully',
    })
  } catch (error) {
    console.error('Demo data reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

