import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { loadDemoData, hasAnyData } from '@/lib/demo-data'

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

    // Check if organization already has data
    const hasData = await hasAnyData(id)
    if (hasData) {
      return NextResponse.json(
        { error: 'Organization already has data. Please reset demo data first.' },
        { status: 400 }
      )
    }

    // Load demo data
    const result = await loadDemoData(id)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Demo data load error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

