import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { isAdmin } from '@/lib/admin-helpers'
import AppShell from '@/components/app-shell'
import AiLogsClient from '@/components/logs/ai-logs-client'

export default async function AiLogsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/logs/ai' })
  const isAdminUser = await isAdmin()

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Request Logs</h2>
            <p className="text-sm text-gray-500 mt-1">Audit trail of all AI Gateway requests</p>
          </div>
          <AiLogsClient orgId={activeOrg.id} />
        </div>
      </div>
    </AppShell>
  )
}

