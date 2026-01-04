import { prisma } from './prisma'

export async function getOnboardingStatus(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      onboardingCompletedAt: true,
      apps: {
        select: { id: true },
      },
      projects: {
        select: { id: true },
      },
      clients: {
        select: { id: true },
      },
      teams: {
        select: { id: true },
      },
      budgets: {
        where: { enabled: true },
        select: { id: true, scopeType: true },
      },
      alertRules: {
        where: { enabled: true },
        select: { id: true, type: true },
      },
      notificationPreferences: {
        take: 1,
        select: { id: true },
      },
      aiProviderConnections: {
        where: { status: 'ACTIVE' },
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!org) {
    return {
      completed: false,
      currentStep: 1,
      step1Completed: false,
      step2Completed: false,
      step3Completed: false,
      step4Completed: false,
      step5Completed: false,
    }
  }

  // Step 1: Directory - at least 1 App + 1 Project + 1 Client (Team optional)
  const step1Completed =
    org.apps.length >= 1 && org.projects.length >= 1 && org.clients.length >= 1

  // Step 2: Budgets - at least 1 budget APP (prioritaire) OR ORG
  const hasAppBudget = org.budgets.some((b) => b.scopeType === 'APP')
  const hasOrgBudget = org.budgets.some((b) => b.scopeType === 'ORG')
  const step2Completed = hasAppBudget || hasOrgBudget

  // Step 3: Alert Rules - at least 2 rules enabled: DAILY_SPIKE + CUR_STALE
  const hasDailySpike = org.alertRules.some((r) => r.type === 'DAILY_SPIKE')
  const hasCurStale = org.alertRules.some((r) => r.type === 'CUR_STALE')
  const step3Completed = hasDailySpike && hasCurStale

  // Step 4: Notifications - at least 1 NotificationPreference exists
  const step4Completed = org.notificationPreferences.length >= 1

  // Step 5: AI Providers - at least 1 active provider connection (optional, only shown if none exist)
  const step5Completed = org.aiProviderConnections.length >= 1

  // Onboarding is complete if all steps are done OR onboardingCompletedAt is set
  // Note: Step 5 (AI Providers) is optional, but shown if no providers exist
  const completed =
    (step1Completed && step2Completed && step3Completed && step4Completed) ||
    org.onboardingCompletedAt !== null

  let currentStep = 1
  if (step1Completed && !step2Completed) {
    currentStep = 2
  } else if (step1Completed && step2Completed && !step3Completed) {
    currentStep = 3
  } else if (step1Completed && step2Completed && step3Completed && !step4Completed) {
    currentStep = 4
  } else if (step1Completed && step2Completed && step3Completed && step4Completed && !step5Completed) {
    // Only show AI Providers step if no providers exist
    currentStep = 5
  } else if (completed) {
    currentStep = 0 // All done
  }

  return {
    completed,
    currentStep: currentStep || 1,
    step1Completed,
    step2Completed,
    step3Completed,
    step4Completed,
    step5Completed,
  }
}

export async function markOnboardingComplete(orgId: string) {
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      onboardingCompletedAt: new Date(),
    },
  })
}

export async function needsOnboarding(orgId: string | null): Promise<boolean> {
  if (!orgId) return true

  const status = await getOnboardingStatus(orgId)
  return !status.completed
}

