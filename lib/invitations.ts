import { prisma } from './prisma'
import crypto from 'crypto'

// Générer un token unique pour l'invitation
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Créer une invitation
export async function createInvitation(
  orgId: string,
  email: string,
  expiresInDays: number = 7
) {
  const token = generateInvitationToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  return prisma.invitation.create({
    data: {
      token,
      email: email.toLowerCase().trim(),
      orgId,
      expiresAt,
    },
  })
}

// Trouver une invitation par token
export async function findInvitationByToken(token: string) {
  return prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  })
}

// Accepter une invitation (créer le membership)
export async function acceptInvitation(token: string, userId: string) {
  const invitation = await findInvitationByToken(token)

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.acceptedAt) {
    throw new Error('Invitation already accepted')
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('Invitation expired')
  }

  // Vérifier si l'utilisateur existe déjà dans l'organisation
  const existingMembership = await prisma.membership.findFirst({
    where: {
      userId,
      orgId: invitation.orgId,
    },
  })

  if (existingMembership) {
    throw new Error('User is already a member of this organization')
  }

  // PR29: Check seat availability before accepting
  const { assertSeatAvailable } = await import('./billing/entitlements')
  await assertSeatAvailable(invitation.orgId)

  // Créer le membership avec status='active' et marquer l'invitation comme acceptée
  const now = new Date()
  await prisma.$transaction([
    prisma.membership.create({
      data: {
        userId,
        orgId: invitation.orgId,
        role: 'member',
        status: 'active',
        activatedAt: now,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: now },
    }),
  ])

  return invitation
}

// Lister les invitations d'une organisation
export async function getOrganizationInvitations(orgId: string) {
  return prisma.invitation.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  })
}

