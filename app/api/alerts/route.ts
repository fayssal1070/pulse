import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'

// Legacy route - redirects to new organization-based route
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const orgId = await getActiveOrganizationId(user.id)
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found. Please select an organization first.' },
        { status: 400 }
      )
    }

    // Redirect to new route
    return NextResponse.json(
      { error: 'This endpoint is deprecated. Please use /api/organizations/[id]/alerts' },
      { status: 410 }
    )
  } catch (error) {
    console.error('Legacy alert route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}






