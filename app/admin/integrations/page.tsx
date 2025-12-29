import { requireAuth } from '@/lib/auth-helpers'
import { requireRole } from '@/lib/auth/rbac'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import AppShell from '@/components/app-shell'
import TelegramIntegrationForm from '@/components/admin/telegram-integration-form'

export default async function AdminIntegrationsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  if (!activeOrg) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <p className="text-gray-500">No active organization</p>
        </div>
      </div>
    )
  }

  // Check admin role
  try {
    await requireRole(activeOrg.id, 'admin')
  } catch (error) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <p className="text-red-600">Access denied. Admin role required.</p>
        </div>
      </div>
    )
  }

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      hasActiveAWS={false}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={true}
    >
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure organization integrations (admin only)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <TelegramIntegrationForm orgId={activeOrg.id} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

