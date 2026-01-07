/**
 * Stripe plan mapping utilities
 * Maps between Stripe price IDs and our plan enum
 */

import type { Plan } from '@/lib/billing/entitlements'

export interface PlanConfig {
  plan: Plan
  priceIdMonthly: string
}

const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  STARTER: {
    plan: 'STARTER',
    priceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
  },
  PRO: {
    plan: 'PRO',
    priceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  },
  BUSINESS: {
    plan: 'BUSINESS',
    priceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
  },
}

/**
 * Get price ID for a plan and interval
 */
export function getPriceIdForPlan(plan: Plan, interval: 'monthly' | 'yearly' = 'monthly'): string | null {
  const config = PLAN_CONFIGS[plan]
  if (!config) return null

  // For now, only monthly is supported
  if (interval === 'yearly') {
    throw new Error('Yearly subscriptions not yet supported')
  }

  const priceId = config.priceIdMonthly
  if (!priceId) {
    console.warn(`Price ID not configured for plan ${plan} (${interval})`)
    return null
  }

  return priceId
}

/**
 * Get plan from Stripe price ID
 */
export function getPlanForPriceId(priceId: string): Plan | null {
  for (const [plan, config] of Object.entries(PLAN_CONFIGS)) {
    if (config.priceIdMonthly === priceId) {
      return plan as Plan
    }
  }

  // Check if it's a yearly price (future support)
  // For now, return null if not found
  return null
}

/**
 * Get required plan for a price ID (for upgrade suggestions)
 */
export function getRequiredPlanForPrice(priceId: string): Plan | null {
  return getPlanForPriceId(priceId)
}

/**
 * Validate that all required price IDs are configured
 */
export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  for (const [plan, config] of Object.entries(PLAN_CONFIGS)) {
    if (!config.priceIdMonthly) {
      missing.push(`${plan}_MONTHLY`)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

