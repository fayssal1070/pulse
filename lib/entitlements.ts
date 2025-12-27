import { prisma } from './prisma'

export type Plan = 'FREE' | 'PRO' | 'BUSINESS'

export interface Entitlements {
  maxCloudAccounts: number
  maxAlerts: number
  maxMembers: number
}

const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  FREE: {
    maxCloudAccounts: 1,
    maxAlerts: 1,
    maxMembers: 1, // owner only
  },
  PRO: {
    maxCloudAccounts: 3,
    maxAlerts: 10,
    maxMembers: 5,
  },
  BUSINESS: {
    maxCloudAccounts: 10,
    maxAlerts: 50,
    maxMembers: 20,
  },
}

/**
 * Get entitlements for a plan
 */
export function getOrgEntitlements(plan: Plan): Entitlements {
  return PLAN_ENTITLEMENTS[plan] || PLAN_ENTITLEMENTS.FREE
}

/**
 * Check if organization can create a cloud account
 */
export async function assertCanCreateCloudAccount(orgId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const entitlements = getOrgEntitlements(org.plan as Plan)
  const currentCount = await prisma.cloudAccount.count({
    where: { orgId },
  })

  if (currentCount >= entitlements.maxCloudAccounts) {
    throw new Error(
      `LIMIT_REACHED: Maximum ${entitlements.maxCloudAccounts} cloud account${entitlements.maxCloudAccounts > 1 ? 's' : ''} allowed on ${org.plan} plan. Upgrade to add more.`
    )
  }
}

/**
 * Check if organization can create an alert
 */
export async function assertCanCreateAlert(orgId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const entitlements = getOrgEntitlements(org.plan as Plan)
  const currentCount = await prisma.alertRule.count({
    where: { orgId },
  })

  if (currentCount >= entitlements.maxAlerts) {
    throw new Error(
      `LIMIT_REACHED: Maximum ${entitlements.maxAlerts} alert${entitlements.maxAlerts > 1 ? 's' : ''} allowed on ${org.plan} plan. Upgrade to add more.`
    )
  }
}

/**
 * Check if organization can invite a member
 */
export async function assertCanInviteMember(orgId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const entitlements = getOrgEntitlements(org.plan as Plan)
  const currentCount = await prisma.membership.count({
    where: { orgId },
  })

  if (currentCount >= entitlements.maxMembers) {
    throw new Error(
      `LIMIT_REACHED: Maximum ${entitlements.maxMembers} member${entitlements.maxMembers > 1 ? 's' : ''} allowed on ${org.plan} plan. Upgrade to add more.`
    )
  }
}

/**
 * Get current usage for an organization
 */
export async function getOrgUsage(orgId: string): Promise<{
  cloudAccounts: number
  alerts: number
  members: number
  entitlements: Entitlements
}> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const entitlements = getOrgEntitlements(org.plan as Plan)

  const [cloudAccounts, alerts, members] = await Promise.all([
    prisma.cloudAccount.count({ where: { orgId } }),
    prisma.alertRule.count({ where: { orgId } }),
    prisma.membership.count({ where: { orgId } }),
  ])

  return {
    cloudAccounts,
    alerts,
    members,
    entitlements,
  }
}



