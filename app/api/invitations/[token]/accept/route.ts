import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { findInvitationByToken, acceptInvitation } from '@/lib/invitations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await requireAuth()
    const { token } = await params

    // Vérifier que l'invitation existe et que l'email correspond
    const invitation = await findInvitationByToken(token)
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation is for ${invitation.email}, but you are logged in as ${user.email}` },
        { status: 403 }
      )
    }

    // Accepter l'invitation
    await acceptInvitation(token, user.id)

    return NextResponse.json({
      success: true,
      organizationId: invitation.orgId,
    })
  } catch (error: any) {
    console.error('Invitation acceptance error:', error)
    
    // PR29: Handle EntitlementError (upgrade_required)
    if (error.name === 'EntitlementError' || error.code === 'upgrade_required') {
      return NextResponse.json(
        {
          ok: false,
          code: 'upgrade_required',
          feature: error.feature || 'seats',
          message: error.message,
          plan: error.plan || 'STARTER',
          required: error.requiredPlan || 'PRO',
        },
        { status: 402 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}
