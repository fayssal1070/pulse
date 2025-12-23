import { prisma } from './prisma'

export async function getOnboardingStatus(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      onboardingCompletedAt: true,
      budgetMonthlyEUR: true,
      cloudAccounts: {
        take: 1,
        select: { id: true },
      },
      alertRules: {
        take: 1,
        select: { id: true },
      },
      costRecords: {
        take: 1,
        select: { id: true },
      },
    },
  })

  if (!org) {
    return { completed: false, currentStep: 1, step1Completed: false, step2Completed: false, step3Completed: false }
  }

  // Step 1: Organization exists (always true if we have orgId)
  const step1Completed = true

  // Step 2: Has cloud account (created manually) OR has cost records (CSV imported)
  const step2Completed = org.cloudAccounts.length > 0 || org.costRecords.length > 0

  // Step 3: Has budget OR alert rule (at least one configured)
  const step3Completed = org.budgetMonthlyEUR !== null || org.alertRules.length > 0

  // Onboarding is complete if all steps are done OR onboardingCompletedAt is set
  const completed = (step1Completed && step2Completed && step3Completed) || org.onboardingCompletedAt !== null

  let currentStep = 1
  if (step1Completed && !step2Completed) {
    currentStep = 2
  } else if (step1Completed && step2Completed && !step3Completed) {
    currentStep = 3
  } else if (completed) {
    currentStep = 0 // All done
  }

  return {
    completed,
    currentStep: currentStep || 1,
    step1Completed,
    step2Completed,
    step3Completed,
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

