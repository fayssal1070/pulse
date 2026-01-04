import { requireAuth } from '@/lib/auth-helpers'
import { getActiveOrganization } from '@/lib/active-org'
import { getUserOrganizations } from '@/lib/organizations'
import { getOnboardingStatus } from '@/lib/onboarding'
import { redirect } from 'next/navigation'
import OnboardingWizard from '@/components/onboarding-wizard'

export default async function OnboardingPage() {
  const user = await requireAuth()
  const activeOrg = await getActiveOrganization(user.id)
  const organizations = await getUserOrganizations(user.id)

  // If no active org, redirect to create one
  if (!activeOrg) {
    redirect('/organizations/new?onboarding=true')
  }

  const status = await getOnboardingStatus(activeOrg.id)

  // If already completed, redirect to dashboard
  if (status.completed) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingWizard
        currentStep={status.currentStep || 1}
        organizationId={activeOrg.id}
        organizations={organizations}
        step1Completed={status.step1Completed || false}
        step2Completed={status.step2Completed || false}
        step3Completed={status.step3Completed || false}
        step4Completed={status.step4Completed || false}
        step5Completed={status.step5Completed || false}
      />
    </div>
  )
}

