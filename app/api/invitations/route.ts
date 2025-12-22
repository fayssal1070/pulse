import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganizationId } from '@/lib/active-org'
import { isOrganizationOwner } from '@/lib/organizations'
import { createInvitation } from '@/lib/invitations'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { email } = await request.json()

    // Récupérer l'organisation active
    const orgId = await getActiveOrganizationId(user.id)
    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found. Please select an organization first.' },
        { status: 400 }
      )
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur est owner
    const isOwner = await isOrganizationOwner(orgId, user.id)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only organization owners can invite members' },
        { status: 403 }
      )
    }

    // Créer l'invitation
    const invitation = await createInvitation(orgId, email)

    // Générer le lien d'invitation
    const invitationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invitations/${invitation.token}`

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        link: invitationLink,
      },
    })
  } catch (error) {
    console.error('Invitation creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

