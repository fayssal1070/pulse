import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import AppShell from '@/components/app-shell'
import BillingSuccessClient from '@/components/billing/billing-success-client'

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ session_id?: string }>
}) {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/billing/success' })
  const params = await searchParams
  const sessionId = params?.session_id

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      isAdmin={true}
      needsOnboarding={false}
    >
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <BillingSuccessClient sessionId={sessionId} />
        </div>
      </div>
    </AppShell>
  )
}

