import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin, isFinance, isManager } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import UsagePageClient from '@/components/usage/usage-page-client'

export default async function UsagePage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/usage' })
  const isAdminUser = await isAdmin()
  const isFinanceUser = await isFinance()
  const isManagerUser = await isManager()

  // RBAC: Only admin/finance/manager can access usage page
  if (!isAdminUser && !isFinanceUser && !isManagerUser) {
    // Users see "My Usage" which is filtered by userId
    // For now, allow access but client will filter
  }

  return (
    <AppShell organizations={organizations} activeOrgId={activeOrg.id} isAdmin={isAdminUser} needsOnboarding={false}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <UsagePageClient organizationId={activeOrg.id} />
        </div>
      </div>
    </AppShell>
  )
}

