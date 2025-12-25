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
import SetupCompleteBanner from '@/components/setup-complete-banner'
import QuickstartWidget from '@/components/quickstart-widget'
import DebugCostsButton from '@/components/debug-costs-button'
import AdminDeploymentInfo from '@/components/admin-deployment-info'
import LastSyncedDate from '@/components/last-synced-date'
import FormattedDate from '@/components/formatted-date'
import ErrorBoundary from '@/components/error-boundary'
import HydrationErrorDetector from '@/components/hydration-error-detector'
import { isAdmin } from '@/lib/admin-helpers'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const user = await requireAuth()
  const params = await searchParams
  const showAdminError = params?.error === 'admin_required'
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const isAdminUser = await isAdmin()

  // Redirect to onboarding if no org or onboarding not completed
  let onboardingStatus = null
  if (activeOrg) {
    onboardingStatus = await getOnboardingStatus(activeOrg.id)
    if (!onboardingStatus.completed) {
      const { redirect } = await import('next/navigation')
      redirect('/onboarding')
    }
  } else {
    // No active org - redirect to onboarding to create one
    const { redirect } = await import('next/navigation')
    redirect('/onboarding')
  }

  // Récupérer les données du dashboard pour l'org active
  const activeOrgId = activeOrg?.id || null
  
  // Check if organization has data and if it's demo data
  let hasData = false
  let isDemo = false
  let hasCostData = false
  let hasAlerts = false
  if (activeOrgId) {
    hasData = await hasAnyData(activeOrgId)
    isDemo = await hasDemoData(activeOrgId)
    
    // Check for quickstart progress
    const [costRecordsCount, alertRulesCount] = await Promise.all([
      prisma.costRecord.count({ where: { orgId: activeOrgId } }),
      prisma.alertRule.count({ where: { orgId: activeOrgId } }),
    ])
    hasCostData = costRecordsCount > 0
    hasAlerts = alertRulesCount > 0
  }

  // Get cloud accounts count and status
  let cloudAccountsInfo = null
  let hasActiveAWS = false
  let awsAccountInfo = null
  let accounts: Array<{ id: string; status: string; provider: string; connectionType: string | null; lastSyncedAt: Date | null }> = []
  if (activeOrgId) {
    accounts = await prisma.cloudAccount.findMany({
      where: { orgId: activeOrgId },
      select: { 
        id: true,
        status: true,
        provider: true,
        connectionType: true,
        lastSyncedAt: true,
      },
    })
    cloudAccountsInfo = {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active').length,
      pending: accounts.filter(a => a.status === 'pending').length,
      disabled: accounts.filter(a => a.status === 'disabled').length,
    }
    // Check if there's an active AWS Cost Explorer account
    const awsAccount = accounts.find(
      a => a.provider === 'AWS' && 
           a.connectionType === 'COST_EXPLORER' && 
           a.status === 'active'
    )
    hasActiveAWS = !!awsAccount
    if (awsAccount) {
      awsAccountInfo = {
        lastSyncedAt: awsAccount.lastSyncedAt,
      }
    }
  }

  // Check for banner states: Data Pending vs No Costs
  // Use lastAwsFetch metadata to make precise decisions
  let showDataPendingBanner = false
  let showNoCostsBanner = false
  let bannerMessage = ''

  if (hasActiveAWS && activeOrgId) {
    // Get the AWS account with lastSyncError and notes (for lastAwsFetch metadata)
    const awsAccount = await prisma.cloudAccount.findFirst({
      where: {
        orgId: activeOrgId,
        provider: 'AWS',
        connectionType: 'COST_EXPLORER',
        status: 'active',
      },
      select: {
        lastSyncedAt: true,
        lastSyncError: true,
        notes: true,
        createdAt: true, // For checking if activation is recent
      },
      orderBy: {
        lastSyncedAt: 'desc',
      },
    })

    if (awsAccount?.lastSyncedAt) {
      // Parse lastAwsFetch metadata from notes
      let lastAwsFetch: {
        recordCount: number
        totalFromAws: number
        fetchedAt: string
      } | null = null

      if (awsAccount.notes) {
        try {
          const notes = JSON.parse(awsAccount.notes)
          if (notes.lastAwsFetch) {
            lastAwsFetch = notes.lastAwsFetch
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      const lastSyncError = awsAccount.lastSyncError || ''
      const now = new Date()
      const accountAge = awsAccount.createdAt ? now.getTime() - awsAccount.createdAt.getTime() : Infinity
      const accountAgeHours = accountAge / (1000 * 60 * 60) // Convert to hours
      const isRecentActivation = accountAgeHours < 24

      // Decision logic:
      // 1. If AWS returned costs > 0, no banner (normal case)
      if (lastAwsFetch && lastAwsFetch.totalFromAws > 0) {
        // AWS has costs, no banner needed
        showDataPendingBanner = false
        showNoCostsBanner = false
      }
      // 2. If AWS returned 0 and no records, show "No costs yet"
      else if (lastAwsFetch && lastAwsFetch.totalFromAws === 0 && lastAwsFetch.recordCount === 0) {
        showNoCostsBanner = true
        bannerMessage = 'Aucune dépense détectée sur la période.'
      }
      // 3. If lastSyncedAt exists + recordCount > 0 + totalFromAws = 0 + recent activation (<24h)
      else if (
        awsAccount.lastSyncedAt &&
        lastAwsFetch &&
        lastAwsFetch.recordCount > 0 &&
        lastAwsFetch.totalFromAws === 0 &&
        isRecentActivation
      ) {
        showDataPendingBanner = true
        bannerMessage = 'AWS Cost Explorer prépare les données (première activation). Cela peut prendre jusqu\'à 24h.'
      }
      // 4. Legacy: Check for specific error codes (fallback if metadata not available)
      else if (lastSyncError.includes('[AWS_COST_EXPLORER_NOT_READY]') ||
               lastSyncError.includes('[AWS_COST_EXPLORER_NOT_ENABLED]')) {
        // Only show if activation is recent (<24h)
        if (isRecentActivation) {
          showDataPendingBanner = true
          bannerMessage = 'AWS Cost Explorer prépare les données (première activation). Cela peut prendre jusqu\'à 24h.'
        }
      } else if (lastSyncError.includes('[AWS_NO_COSTS]')) {
        showNoCostsBanner = true
        bannerMessage = 'Aucune dépense détectée sur la période.'
      }
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
    <ErrorBoundary>
      <HydrationErrorDetector />
      <div className="min-h-screen bg-gray-50">
        {showAdminError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">Admin Access Required</span> - You need to be added to the admin allowlist to access the admin panel. Please contact support if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">
                {activeOrg
                  ? `Cost overview for ${activeOrg.name}`
                  : 'Cost overview across all your organizations'}
              </p>
            </div>
            {/* Only render DebugCostsButton if user is admin (server-side gating) */}
            {isAdminUser && <DebugCostsButton />}
          </div>

          {/* Setup Complete Banner */}
          {activeOrgId && onboardingStatus?.completed && (
            <SetupCompleteBanner />
          )}

          {/* Demo Banner */}
          {activeOrgId && isDemo && (
            <DemoBanner organizationId={activeOrgId} />
          )}

          {/* Data Pending Banner (Cost Explorer not ready) */}
          {showDataPendingBanner && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-medium">Data Pending</span> - {bannerMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* No Costs Banner (AWS synced but no costs detected) */}
          {showNoCostsBanner && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Info</span> - {bannerMessage}
                  </p>
                </div>
              </div>
            </div>
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

          {/* Quickstart Widget */}
          {activeOrgId && onboardingStatus?.completed && (
            <QuickstartWidget
              hasCostData={hasCostData}
              hasAlerts={hasAlerts}
              organizationId={activeOrgId}
              hasActiveAWS={hasActiveAWS}
              awsAccountInfo={awsAccountInfo}
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
              {total30Days === 0 && hasActiveAWS && awsAccountInfo && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                  <p className="text-xs text-gray-500">0.00 EUR sur 30 jours</p>
                  {awsAccountInfo.lastSyncedAt && (
                    <LastSyncedDate date={awsAccountInfo.lastSyncedAt} />
                  )}
                  {activeOrgId && (() => {
                    // Find the AWS account ID to link to records
                    const awsAccount = accounts?.find(
                      a => a.provider === 'AWS' && 
                           a.connectionType === 'COST_EXPLORER' && 
                           a.status === 'active'
                    )
                    return awsAccount ? (
                      <Link
                        href={`/organizations/${activeOrgId}/cloud-accounts/${awsAccount.id}/records`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-block"
                      >
                        Voir les enregistrements importés →
                      </Link>
                    ) : (
                      <Link
                        href={`/organizations/${activeOrgId}/cloud-accounts`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-block"
                      >
                        Voir les enregistrements importés →
                      </Link>
                    )
                  })()}
                </div>
              )}
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
                          <FormattedDate 
                            date={item.date}
                            locale="en-US"
                            options={{
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }}
                          />
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
      <AdminDeploymentInfo 
        isAdmin={isAdminUser}
        vercelEnv={process.env.VERCEL_ENV || 'development'}
        commitSha={process.env.VERCEL_GIT_COMMIT_SHA || 'local'}
      />
      </div>
    </ErrorBoundary>
  )
}
