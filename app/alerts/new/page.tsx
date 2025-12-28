import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { canCreateAlerts } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import NewAlertFormGlobal from './new-alert-form-global'
import { isAdmin } from '@/lib/admin-helpers'

export default async function NewAlertPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const isAdminUser = await isAdmin()

  if (organizations.length === 0) {
    redirect('/organizations/new')
  }

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Check RBAC: admin, finance, manager can create alerts
  const canCreate = await canCreateAlerts(activeOrg.id)
  if (!canCreate) {
    redirect('/dashboard?error=access_denied')
  }

  const hasActiveAWS = false

  return (
    <AppShell 
      organizations={organizations} 
      activeOrgId={activeOrg?.id || null} 
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Alert</h2>
            <p className="text-sm text-gray-500 mt-1">
              Set up a cost alert for one of your organizations
            </p>
          </div>
          <NewAlertFormGlobal organizations={organizations} defaultOrgId={activeOrg?.id || null} />
        </div>
      </div>
    </AppShell>
  )
}
