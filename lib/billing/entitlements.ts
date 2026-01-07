/**
 * Plans, Entitlements & Feature Gating (PR26)
 * Central resolver for organization plans and feature entitlements
 */

import { prisma } from '@/lib/prisma'

export type Plan = 'STARTER' | 'PRO' | 'BUSINESS'
export type Feature = 
  | 'ai_routing_providers'
  | 'ai_routing_routes'
  | 'alert_rules'
  | 'alert_rule_type'
  | 'telegram_notifications'
  | 'slack_notifications'
  | 'teams_notifications'
  | 'webhooks'
  | 'costs_export'
  | 'usage_export'
  | 'retention_days'
  | 'api_keys_count'
  | 'api_keys_rotation'
  | 'api_keys_advanced_limits'
  | 'seats'

export interface Entitlements {
  // AI Routing
  maxProviders: number
  maxRoutes: number
  
  // Alert Rules
  maxAlertRules: number
  allowedAlertTypes: string[] // e.g., ['DAILY_SPIKE', 'MONTHLY_THRESHOLD']
  
  // Notifications
  telegramEnabled: boolean
  slackEnabled: boolean
  teamsEnabled: boolean
  webhooksEnabled: boolean
  
  // Exports
  costsExportEnabled: boolean
  usageExportEnabled: boolean
  
  // Retention
  maxRetentionDays: number
  
  // API Keys
  maxApiKeys: number
  apiKeyRotationEnabled: boolean
  apiKeyAdvancedLimitsEnabled: boolean
  
  // Seats (PR29)
  seatLimit: number
}

const ENTITLEMENTS: Record<Plan, Entitlements> = {
  STARTER: {
    maxProviders: 1,
    maxRoutes: 5,
    maxAlertRules: 3,
    allowedAlertTypes: ['DAILY_SPIKE', 'MONTHLY_THRESHOLD'],
    telegramEnabled: false,
    slackEnabled: false,
    teamsEnabled: false,
    webhooksEnabled: false,
    costsExportEnabled: false, // Or limited
    usageExportEnabled: true,
    seatLimit: 1,
    maxRetentionDays: 7,
    maxApiKeys: 3,
    apiKeyRotationEnabled: false,
    apiKeyAdvancedLimitsEnabled: false,
  },
  PRO: {
    maxProviders: 3,
    maxRoutes: 25,
    maxAlertRules: 20,
    allowedAlertTypes: ['DAILY_SPIKE', 'MONTHLY_THRESHOLD', 'TOP_CONSUMER_SHARE'],
    telegramEnabled: true,
    slackEnabled: false,
    teamsEnabled: false,
    webhooksEnabled: false,
    costsExportEnabled: true,
    usageExportEnabled: true,
    seatLimit: 5,
    maxRetentionDays: 30,
    maxApiKeys: 20,
    apiKeyRotationEnabled: true,
    apiKeyAdvancedLimitsEnabled: true,
  },
  BUSINESS: {
    maxProviders: 10,
    maxRoutes: 200,
    maxAlertRules: 1000, // Effectively unlimited
    allowedAlertTypes: ['DAILY_SPIKE', 'MONTHLY_THRESHOLD', 'TOP_CONSUMER_SHARE', 'CUSTOM'],
    telegramEnabled: true,
    slackEnabled: true,
    teamsEnabled: true,
    webhooksEnabled: true,
    costsExportEnabled: true,
    usageExportEnabled: true,
    maxRetentionDays: 90,
    maxApiKeys: 1000, // Effectively unlimited
    apiKeyRotationEnabled: true,
    apiKeyAdvancedLimitsEnabled: true,
  },
}

/**
 * Get organization plan
 * Falls back to ENV DEFAULT_PLAN or STARTER
 * 
 * PR27: If subscription status is not ACTIVE/TRIALING, treat as STARTER for gating
 */
export async function getOrgPlan(orgId: string): Promise<Plan> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      subscriptionStatus: true,
    },
  })

  // If subscription exists but is not active/trialing, downgrade to STARTER for gating
  if (org?.subscriptionStatus) {
    const activeStatuses = ['active', 'trialing']
    if (!activeStatuses.includes(org.subscriptionStatus.toLowerCase())) {
      // Subscription exists but not active - treat as STARTER
      return 'STARTER'
    }
  }

  const planFromDb = org?.plan?.toUpperCase()
  
  // Map legacy "FREE" to "STARTER"
  if (planFromDb === 'FREE') {
    return 'STARTER'
  }
  
  // Check if plan is valid
  if (planFromDb && ['STARTER', 'PRO', 'BUSINESS'].includes(planFromDb)) {
    return planFromDb as Plan
  }

  // Fallback to ENV or STARTER
  const defaultPlan = (process.env.DEFAULT_PLAN?.toUpperCase() as Plan) || 'STARTER'
  return ['STARTER', 'PRO', 'BUSINESS'].includes(defaultPlan) ? defaultPlan : 'STARTER'
}

/**
 * Get entitlements for a plan
 */
export function getEntitlements(plan: Plan): Entitlements {
  return ENTITLEMENTS[plan]
}

/**
 * Assert that a feature is allowed for given entitlements
 * Throws 403 error with upgrade_required code if not allowed
 */
export function assertEntitlement(
  entitlements: Entitlements,
  feature: Feature,
  context?: {
    currentValue?: number
    requestedValue?: number
    alertType?: string
  }
): void {
  switch (feature) {
    case 'ai_routing_providers':
      if (context?.currentValue !== undefined && context.currentValue >= entitlements.maxProviders) {
        throw new EntitlementError(
          'ai_routing_providers',
          `Maximum ${entitlements.maxProviders} AI provider(s) allowed on your plan`,
          'PRO'
        )
      }
      break

    case 'ai_routing_routes':
      if (context?.currentValue !== undefined && context.currentValue >= entitlements.maxRoutes) {
        throw new EntitlementError(
          'ai_routing_routes',
          `Maximum ${entitlements.maxRoutes} route(s) allowed on your plan`,
          'PRO'
        )
      }
      break

    case 'alert_rules':
      if (context?.currentValue !== undefined && context.currentValue >= entitlements.maxAlertRules) {
        throw new EntitlementError(
          'alert_rules',
          `Maximum ${entitlements.maxAlertRules} alert rule(s) allowed on your plan`,
          'PRO'
        )
      }
      break

    case 'alert_rule_type':
      if (context?.alertType && !entitlements.allowedAlertTypes.includes(context.alertType)) {
        throw new EntitlementError(
          'alert_rule_type',
          `Alert type "${context.alertType}" is not available on your plan`,
          'PRO'
        )
      }
      break

    case 'telegram_notifications':
      if (!entitlements.telegramEnabled) {
        throw new EntitlementError(
          'telegram_notifications',
          'Telegram notifications require PRO plan or higher',
          'PRO'
        )
      }
      break

    case 'slack_notifications':
      if (!entitlements.slackEnabled) {
        throw new EntitlementError(
          'slack_notifications',
          'Slack notifications require BUSINESS plan',
          'BUSINESS'
        )
      }
      break

    case 'teams_notifications':
      if (!entitlements.teamsEnabled) {
        throw new EntitlementError(
          'teams_notifications',
          'Microsoft Teams notifications require BUSINESS plan',
          'BUSINESS'
        )
      }
      break

    case 'webhooks':
      if (!entitlements.webhooksEnabled) {
        throw new EntitlementError(
          'webhooks',
          'Webhooks require BUSINESS plan',
          'BUSINESS'
        )
      }
      break

    case 'costs_export':
      if (!entitlements.costsExportEnabled) {
        throw new EntitlementError(
          'costs_export',
          'Costs export requires PRO plan or higher',
          'PRO'
        )
      }
      break

    case 'usage_export':
      // Always allowed
      break

    case 'retention_days':
      if (context?.requestedValue !== undefined && context.requestedValue > entitlements.maxRetentionDays) {
        throw new EntitlementError(
          'retention_days',
          `Maximum retention period is ${entitlements.maxRetentionDays} days on your plan`,
          'PRO'
        )
      }
      break

    case 'api_keys_count':
      if (context?.currentValue !== undefined && context.currentValue >= entitlements.maxApiKeys) {
        throw new EntitlementError(
          'api_keys_count',
          `Maximum ${entitlements.maxApiKeys} API key(s) allowed on your plan`,
          'PRO'
        )
      }
      break

    case 'api_keys_rotation':
      if (!entitlements.apiKeyRotationEnabled) {
        throw new EntitlementError(
          'api_keys_rotation',
          'API key rotation requires PRO plan or higher',
          'PRO'
        )
      }
      break

    case 'api_keys_advanced_limits':
      if (!entitlements.apiKeyAdvancedLimitsEnabled) {
        throw new EntitlementError(
          'api_keys_advanced_limits',
          'Advanced API key limits require PRO plan or higher',
          'PRO'
        )
      }
      break
  }
}

/**
 * Custom error class for entitlement violations
 */
export class EntitlementError extends Error {
  constructor(
    public feature: Feature,
    message: string,
    public requiredPlan: Plan
  ) {
    super(message)
    this.name = 'EntitlementError'
  }

  toJSON() {
    return {
      ok: false,
      code: 'upgrade_required',
      feature: this.feature,
      message: this.message,
      requiredPlan: this.requiredPlan,
    }
  }
}

/**
 * Helper to get plan comparison (for upgrade suggestions)
 */
export function getPlanHierarchy(): Plan[] {
  return ['STARTER', 'PRO', 'BUSINESS']
}

export function isPlanAtLeast(currentPlan: Plan, minimumPlan: Plan): boolean {
  const hierarchy = getPlanHierarchy()
  const currentIndex = hierarchy.indexOf(currentPlan)
  const minimumIndex = hierarchy.indexOf(minimumPlan)
  return currentIndex >= minimumIndex
}

/**
 * Get seat limit for a plan (PR29)
 */
export function getSeatLimit(plan: Plan): number {
  return ENTITLEMENTS[plan].seatLimit
}

/**
 * Check if seats are available for an organization (PR29)
 * Throws EntitlementError if limit reached
 */
export async function assertSeatAvailable(orgId: string): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      seatLimit: true,
      seatEnforcement: true,
    },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  if (!org.seatEnforcement) {
    // Enforcement disabled, allow
    return
  }

  const plan = await getOrgPlan(orgId)
  const limit = org.seatLimit || getSeatLimit(plan)

  // Count active memberships
  const used = await prisma.membership.count({
    where: {
      orgId,
      status: 'active',
    },
  })

  if (used >= limit) {
    // Determine required plan
    let requiredPlan: Plan = 'PRO'
    if (plan === 'STARTER') {
      requiredPlan = 'PRO'
    } else if (plan === 'PRO') {
      requiredPlan = 'BUSINESS'
    } else {
      // Already at BUSINESS, but still at limit
      throw new EntitlementError(
        'seats',
        `Seat limit reached (${used}/${limit}). Contact support to increase your limit.`,
        'BUSINESS'
      )
    }

    throw new EntitlementError(
      'seats',
      `Seat limit reached (${used}/${limit}). Upgrade to ${requiredPlan} plan to add more seats.`,
      requiredPlan
    )
  }
}

