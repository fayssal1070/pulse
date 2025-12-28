import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { requireRole, canManageBudgets } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import BudgetsList from '@/components/budgets/budgets-list'

export default async function BudgetsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  if (!activeOrg) {
    redirect('/onboarding')
  }

  // Check RBAC: admin, finance, manager can view budgets
  try {
    await requireRole(activeOrg.id, ['admin', 'finance', 'manager'])
  } catch (error) {
    redirect('/dashboard?error=access_denied')
  }

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg.id}
      hasActiveAWS={false}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={false}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <BudgetsList orgId={activeOrg.id} />
        </div>
      </div>
    </AppShell>
  )
}

