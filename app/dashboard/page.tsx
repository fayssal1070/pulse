import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { getTotalCosts, getTopServices, getDailySeries } from '@/lib/dashboard'
import { getCurrentMonthCosts, calculateBudgetPercentage } from '@/lib/budget'
import { hasAnyData, hasDemoData } from '@/lib/demo-data'
import { getOnboardingStatus } from '@/lib/onboarding'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import LogoutButton from '@/components/logout-button'
import OrgSwitcher from '@/components/org-switcher'
import DemoBanner from '@/components/demo-banner'
import LoadDemoButton from '@/components/load-demo-button'
import SetupProgressWidget from '@/components/setup-progress-widget'

export default async function DashboardPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  // Redirect to onboarding if org is empty and onboarding not completed
  if (activeOrg) {
    const onboardingStatus = await getOnboardingStatus(activeOrg.id)
    if (!onboardingStatus.completed) {
      const { redirect } = await import('next/navigation')
      redirect('/onboarding')
    }
  }

  // Récupérer les données du dashboard pour l'org active
  const activeOrgId = activeOrg?.id || null
  
  // Check if organization has data and if it's demo data
  let hasData = false
  let isDemo = false
  let onboardingStatus = null
  if (activeOrgId) {
    hasData = await hasAnyData(activeOrgId)
    isDemo = await hasDemoData(activeOrgId)
    onboardingStatus = await getOnboardingStatus(activeOrgId)
  }

  // Get cloud accounts count and status
  let cloudAccountsInfo = null
  if (activeOrgId) {
    const accounts = await prisma.cloudAccount.findMany({
      where: { orgId: activeOrgId },
      select: { status: true },
    })
    cloudAccountsInfo = {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active').length,
      pending: accounts.filter(a => a.status === 'pending').length,
      disabled: accounts.filter(a => a.status === 'disabled').length,
    }
  }

  const total7Days = await getTotalCosts(user.id, 7, activeOrgId)
  const total30Days = await getTotalCosts(user.id, 30, activeOrgId)
  const topServices = await getTopServices(user.id, 30, 10, activeOrgId)
  const dailySeries = await getDailySeries(user.id, 30, activeOrgId)

  // Budget mensuel (si org active)
  let budgetInfo: { currentCosts: number; budget: number | null; percentage: number; status: 'OK' | 'WARNING' | 'EXCEEDED' } | null = null
  if (activeOrgId) {
    const org = await prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { budgetMonthlyEUR: true },
    })
    const currentMonthCosts = await getCurrentMonthCosts(activeOrgId)
    const budget = org?.budgetMonthlyEUR || null
    const { percentage, status } = calculateBudgetPercentage(currentMonthCosts, budget)
    budgetInfo = { currentCosts: currentMonthCosts, budget, percentage, status }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">PULSE</h1>
            </div>
            <div className="flex items-center space-x-4">
              <OrgSwitcher organizations={organizations} activeOrgId={activeOrg?.id || null} />
              <Link href="/team" className="text-gray-700 hover:text-gray-900">
                Team
              </Link>
              <Link href="/notifications" className="text-gray-700 hover:text-gray-900">
                Notifications
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeOrg
                ? `Cost overview for ${activeOrg.name}`
                : 'Cost overview across all your organizations'}
            </p>
          </div>

          {/* Demo Banner */}
          {activeOrgId && isDemo && (
            <DemoBanner organizationId={activeOrgId} />
          )}

          {/* Setup Progress Widget */}
          {activeOrgId && onboardingStatus && !onboardingStatus.completed && (
            <SetupProgressWidget
              currentStep={onboardingStatus.currentStep || 1}
              step1Completed={onboardingStatus.step1Completed || false}
              step2Completed={onboardingStatus.step2Completed || false}
              step3Completed={onboardingStatus.step3Completed || false}
            />
          )}

          {/* Load Demo Button */}
          {activeOrgId && !hasData && (
            <LoadDemoButton organizationId={activeOrgId} />
          )}

          {/* Totals */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last 7 days</h3>
              <p className="text-3xl font-bold text-gray-900">{total7Days.toFixed(2)} EUR</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last 30 days</h3>
              <p className="text-3xl font-bold text-gray-900">{total30Days.toFixed(2)} EUR</p>
            </div>
            {cloudAccountsInfo && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Cloud Accounts</h3>
                  <Link
                    href="/accounts"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Manage →
                  </Link>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{cloudAccountsInfo.total}</p>
                <div className="flex space-x-2 text-xs">
                  <span className="text-green-600">{cloudAccountsInfo.active} active</span>
                  {cloudAccountsInfo.pending > 0 && (
                    <span className="text-yellow-600">{cloudAccountsInfo.pending} pending</span>
                  )}
                </div>
              </div>
            )}
            {budgetInfo && budgetInfo.budget !== null && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Monthly Budget</h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      budgetInfo.status === 'EXCEEDED'
                        ? 'bg-red-100 text-red-800'
                        : budgetInfo.status === 'WARNING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {budgetInfo.status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {budgetInfo.currentCosts.toFixed(2)} / {budgetInfo.budget.toFixed(2)} EUR
                </p>
                <p className="text-sm text-gray-500">
                  {budgetInfo.percentage.toFixed(1)}% consumed
                </p>
                <Link
                  href="/budget"
                  className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block"
                >
                  Manage budget →
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Top Services */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Services (30 days)</h3>
              {topServices.length === 0 ? (
                <p className="text-gray-500 text-sm">No costs recorded</p>
              ) : (
                <div className="space-y-2">
                  {topServices.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.provider} / {item.service}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.total.toFixed(2)} EUR
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Organizations */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Organizations</h3>
                <Link
                  href="/organizations/new"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + New
                </Link>
              </div>
              {organizations.length === 0 ? (
                <p className="text-gray-500 text-sm">No organizations yet</p>
              ) : (
                <div className="space-y-2">
                  {organizations.map((org) => (
                    <Link
                      key={org.id}
                      href={`/organizations/${org.id}`}
                      className="block py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded px-2 -mx-2"
                    >
                      <p className="text-sm font-medium text-gray-900">{org.name}</p>
                      <p className="text-xs text-gray-500">Role: {org.role}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Daily Series Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Costs (30 days)</h3>
            {dailySeries.length === 0 ? (
              <p className="text-gray-500 text-sm">No costs recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total (EUR)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailySeries.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {item.date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
