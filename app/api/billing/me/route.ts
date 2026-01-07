/**
 * GET /api/billing/me
 * Get current organization's plan and entitlements
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { getOrgPlan, getEntitlements } from '@/lib/billing/entitlements'
import { computeCurrentMonthUsage, isOverQuota } from '@/lib/billing/overage'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const activeOrgBasic = await getActiveOrganization(user.id)
    
    if (!activeOrgBasic) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Fetch full organization with Stripe fields
    const activeOrg = await prisma.organization.findUnique({
      where: { id: activeOrgBasic.id },
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        trialEndsAt: true,
      },
    })

    if (!activeOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get effective plan (handles subscription status)
    const plan = await getOrgPlan(activeOrg.id)
    const entitlements = getEntitlements(plan)

    // PR30: Get current month usage and overage
    const usageData = await computeCurrentMonthUsage(activeOrg.id)
    const quotaCheck = await isOverQuota(activeOrg.id)

    return NextResponse.json({
      plan,
      status: activeOrg.subscriptionStatus,
      currentPeriodEnd: activeOrg.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: activeOrg.cancelAtPeriodEnd || false,
      trialEndsAt: activeOrg.trialEndsAt?.toISOString() || null,
      entitlements: {
        maxProviders: entitlements.maxProviders,
        maxRoutes: entitlements.maxRoutes,
        maxAlertRules: entitlements.maxAlertRules,
        telegramEnabled: entitlements.telegramEnabled,
        slackEnabled: entitlements.slackEnabled,
        teamsEnabled: entitlements.teamsEnabled,
        webhooksEnabled: entitlements.webhooksEnabled,
        costsExportEnabled: entitlements.costsExportEnabled,
        usageExportEnabled: entitlements.usageExportEnabled,
        maxRetentionDays: entitlements.maxRetentionDays,
        maxApiKeys: entitlements.maxApiKeys,
        apiKeyRotationEnabled: entitlements.apiKeyRotationEnabled,
        apiKeyAdvancedLimitsEnabled: entitlements.apiKeyAdvancedLimitsEnabled,
        includedMonthlySpendEUR: entitlements.includedMonthlySpendEUR,
        overagePricePerEUR: entitlements.overagePricePerEUR,
        allowOverage: entitlements.allowOverage,
      },
      usage: {
        totalSpendEUR: usageData.totalSpendEUR,
        includedSpendEUR: usageData.includedSpendEUR,
        overageSpendEUR: usageData.overageSpendEUR,
        overageAmountEUR: usageData.overageAmountEUR,
        isOverQuota: quotaCheck.isOver,
        quotaPercentage: quotaCheck.percentage,
      },
    })
  } catch (error: any) {
    console.error('Error fetching billing info:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

