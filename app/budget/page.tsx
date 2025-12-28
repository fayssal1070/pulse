import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AppShell from '@/components/app-shell'
import { isAdmin } from '@/lib/admin-helpers'
import BudgetForm from '@/components/budget-form'

export default async function BudgetPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  // Récupérer l'organisation avec le budget
  const orgWithBudget = activeOrg
    ? await prisma.organization.findUnique({
        where: { id: activeOrg.id },
        select: { id: true, name: true, budgetMonthlyEUR: true },
      })
    : null

  const isAdminUser = await isAdmin()

  const hasActiveAWS = activeOrg
    ? await prisma.cloudAccount.count({
        where: {
          orgId: activeOrg.id,
          provider: 'AWS',
          status: 'active',
        },
      }) > 0
    : false

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg?.id || null}
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Monthly Budget</h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeOrg
                ? `Set monthly budget for ${activeOrg.name}`
                : 'Select an organization to set budget'}
            </p>
          </div>

          {orgWithBudget ? (
            <div className="bg-white rounded-lg shadow p-6">
              <BudgetForm organization={orgWithBudget} />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Please select an organization first.</p>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}

