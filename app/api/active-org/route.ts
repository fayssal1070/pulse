import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { setActiveOrganization, getActiveOrganizationId } from '@/lib/active-org'

export async function GET() {
  try {
    const user = await requireAuth()
    const orgId = await getActiveOrganizationId(user.id)
    return NextResponse.json({ orgId })
  } catch (error) {
    console.error('Get active org error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Vérifier que l'utilisateur appartient à cette organisation
    const organizations = await getUserOrganizations(user.id)
    const org = organizations.find((o) => o.id === orgId)

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 403 }
      )
    }

    // Définir l'organisation active
    await setActiveOrganization(orgId)

    return NextResponse.json({ success: true, orgId })
  } catch (error) {
    console.error('Set active org error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

