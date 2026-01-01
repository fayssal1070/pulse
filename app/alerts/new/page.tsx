import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { requireRole } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import NewRuleForm from '@/components/alerts/new-rule-form'
import { isAdmin } from '@/lib/admin-helpers'
import Link from 'next/link'

export default async function NewAlertPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/alerts' })
  const isAdminUser = await isAdmin()

  // RBAC: only admin/finance/manager can create
  try {
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])
  } catch {
    redirect('/alerts?error=access_denied')
  }

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link href="/alerts" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
              ← Back to Alerts
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Create New Alert Rule</h2>
            <p className="text-sm text-gray-500 mt-1">Configure a new alert rule for your organization</p>
          </div>
          <NewRuleForm />
        </div>
      </div>
    </AppShell>
  )
}
