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

    // PR29: Check seat availability before inviting
    try {
      const { assertSeatAvailable } = await import('@/lib/billing/entitlements')
      await assertSeatAvailable(orgId)
    } catch (error: any) {
      // Handle EntitlementError (upgrade_required)
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
      throw error
    }

    // Créer l'invitation
    const invitation = await createInvitation(orgId, email)
    
    // PR29: Create or update membership with status='invited' when invitation is created
    try {
      const { prisma } = await import('@/lib/prisma')
      const invitedUser = await prisma.user.findUnique({ 
        where: { email: email.toLowerCase().trim() } 
      })
      if (invitedUser) {
        // User exists, create/update membership with invited status
        await prisma.membership.upsert({
          where: {
            userId_orgId: {
              userId: invitedUser.id,
              orgId,
            },
          },
          create: {
            userId: invitedUser.id,
            orgId,
            role: 'member',
            status: 'invited',
            invitedAt: new Date(),
          },
          update: {
            status: 'invited',
            invitedAt: new Date(),
          },
        })
      }
    } catch (err) {
      // Non-critical: membership creation can fail if user doesn't exist yet
      // The membership will be created when invitation is accepted
      console.warn('Could not create membership for invited user:', err)
    }

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

