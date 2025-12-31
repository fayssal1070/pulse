import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import CostsClient from '@/components/costs/costs-client'

export default async function CostsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const isAdminUser = await isAdmin()

  if (!activeOrg) {
    const { redirect } = await import('next/navigation')
    redirect('/organizations/new')
  }

  const activeOrgId = activeOrg.id

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrgId}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Cost Events</h2>
            <p className="text-sm text-gray-500 mt-1">Unified view of AWS and AI costs</p>
          </div>
          <CostsClient orgId={activeOrgId} />
        </div>
      </div>
    </AppShell>
  )
}

