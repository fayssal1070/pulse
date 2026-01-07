import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { requireAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import BillingPageClient from '@/components/billing/billing-page-client'

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ canceled?: string }>
}) {
  const user = await requireAuth()
  await requireAdmin()

  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/billing' })
  const params = await searchParams
  const canceled = params?.canceled === '1'

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      isAdmin={true}
      needsOnboarding={false}
    >
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <BillingPageClient organizationId={activeOrg.id} canceled={canceled} />
        </div>
      </div>
    </AppShell>
  )
}

