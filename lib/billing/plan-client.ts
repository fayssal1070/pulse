/**
 * Client-side plan and entitlements utilities
 */

import { fetchJson } from '@/lib/http/fetch-json'

export interface PlanInfo {
  plan: string
  status: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEndsAt: string | null
  entitlements: {
    maxProviders: number
    maxRoutes: number
    maxAlertRules: number
    telegramEnabled: boolean
    slackEnabled: boolean
    teamsEnabled: boolean
    webhooksEnabled: boolean
    costsExportEnabled: boolean
    usageExportEnabled: boolean
    maxRetentionDays: number
    maxApiKeys: number
    apiKeyRotationEnabled: boolean
    apiKeyAdvancedLimitsEnabled: boolean
  }
}

/**
 * Get current organization's plan and entitlements
 */
export async function getPlanInfo(): Promise<PlanInfo | null> {
  try {
    const data = await fetchJson<PlanInfo>('/api/billing/me')
    return data
  } catch (error: any) {
    console.error('Error fetching plan info:', error)
    return null
  }
}

/**
 * Check if a feature is enabled for the current plan
 */
export async function isFeatureEnabled(feature: keyof PlanInfo['entitlements']): Promise<boolean> {
  const planInfo = await getPlanInfo()
  if (!planInfo) return false
  return planInfo.entitlements[feature] === true
}

