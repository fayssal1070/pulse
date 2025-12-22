import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import LogoutButton from '@/components/logout-button'
import OrgSwitcher from '@/components/org-switcher'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                PULSE
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">Budget</span>
            </div>
            <div className="flex items-center space-x-4">
              <OrgSwitcher organizations={organizations} activeOrgId={activeOrg?.id || null} />
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

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
    </div>
  )
}

