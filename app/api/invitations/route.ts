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

    // Check entitlements
    try {
      const { assertCanInviteMember } = await import('@/lib/entitlements')
      await assertCanInviteMember(orgId)
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

    // Créer l'invitation
    const invitation = await createInvitation(orgId, email)

    // Générer le lien d'invitation
    // Extract origin only from NEXTAUTH_URL (no path), fallback to localhost for dev
    const baseUrl = process.env.NEXTAUTH_URL
      ? new URL(process.env.NEXTAUTH_URL).origin
      : 'http://localhost:3000'
    const invitationLink = `${baseUrl}/invitations/${invitation.token}`

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

