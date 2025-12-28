import { prisma } from './prisma'

export async function getUserOrganizations(userId: string) {
  // Use select instead of include to avoid errors if new columns don't exist
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: {
      id: true,
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          plan: true,
          // Only select fields that definitely exist (avoid awsCurEnabled if migration not applied)
        },
      },
    },
  })

  // Get memberships separately to avoid include issues
  const orgIds = memberships.map((m) => m.organization.id)
  const allMemberships = orgIds.length > 0
    ? await prisma.membership.findMany({
        where: { orgId: { in: orgIds } },
        select: {
          id: true,
          userId: true,
          orgId: true,
          role: true,
          user: {
            select: { id: true, email: true },
          },
        },
      })
    : []

  // Group memberships by org
  const membershipsByOrg = allMemberships.reduce((acc, mem) => {
    if (!acc[mem.orgId]) {
      acc[mem.orgId] = []
    }
    acc[mem.orgId].push(mem)
    return acc
  }, {} as Record<string, typeof allMemberships>)

  return memberships.map((m) => {
    const orgMembers = membershipsByOrg[m.organization.id] || []
    return {
      id: m.organization.id,
      name: m.organization.name,
      createdAt: m.organization.createdAt,
      role: m.role,
      plan: m.organization.plan,
      awsCurEnabled: false, // Default to false until migration is applied
      members: orgMembers.map((mem) => ({
        id: mem.id,
        userId: mem.userId,
        orgId: mem.orgId,
        role: mem.role,
        user: mem.user,
      })),
      owner: orgMembers.find((mem) => mem.role === 'owner')?.user || null,
    }
  })
}

export async function getOrganizationById(organizationId: string, userId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      orgId: organizationId,
      userId,
    },
    include: {
      organization: {
        include: {
          memberships: {
            include: {
              user: {
                select: { id: true, email: true },
              },
            },
          },
        },
      },
    },
  })

  if (!membership) {
    return null
  }

  return {
    id: membership.organization.id,
    name: membership.organization.name,
    createdAt: membership.organization.createdAt,
    role: membership.role,
    plan: membership.organization.plan,
    stripeCustomerId: membership.organization.stripeCustomerId,
    stripeSubscriptionId: membership.organization.stripeSubscriptionId,
    stripePriceId: membership.organization.stripePriceId,
    subscriptionStatus: membership.organization.subscriptionStatus,
    currentPeriodEnd: membership.organization.currentPeriodEnd,
    cancelAtPeriodEnd: membership.organization.cancelAtPeriodEnd,
    members: membership.organization.memberships.map((mem) => ({
      id: mem.id,
      userId: mem.userId,
      orgId: mem.orgId,
      role: mem.role,
      user: mem.user,
    })),
    owner: membership.organization.memberships.find((mem) => mem.role === 'owner')?.user || null,
  }
}

export async function createOrganization(userId: string, name: string) {
  const organization = await prisma.organization.create({
    data: {
      name,
      memberships: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
    include: {
      memberships: {
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      },
    },
  })

  return {
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt,
    owner: organization.memberships.find((m) => m.role === 'owner')?.user || null,
  }
}

export async function isOrganizationOwner(organizationId: string, userId: string): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      orgId: organizationId,
      userId,
      role: 'owner',
    },
  })
  return !!membership
}

export async function addMemberToOrganization(organizationId: string, userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return prisma.membership.create({
    data: {
      orgId: organizationId,
      userId: user.id,
      role: 'member',
    },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  })
}
