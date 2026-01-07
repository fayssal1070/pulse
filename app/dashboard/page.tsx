import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { getOnboardingStatus } from '@/lib/onboarding'
import { prisma } from '@/lib/prisma'
import AppShell from '@/components/app-shell'
import { isAdmin } from '@/lib/admin-helpers'
import {
  getExecutiveKPIs,
  getDailyTrend,
  getTopConsumers,
  getActiveBudgetAlerts,
  getRecommendations,
} from '@/lib/dashboard/executive'
import KPICards from '@/components/dashboard/kpi-cards'
import TrendChart from '@/components/dashboard/trend-chart'
import TopConsumers from '@/components/dashboard/top-consumers'
import AlertsPanel from '@/components/dashboard/alerts-panel'
import Recommendations from '@/components/dashboard/recommendations'
import UIDebugPanel from '@/components/ui-debug-panel'
import ErrorBoundary from '@/components/error-boundary'
import HydrationErrorDetector from '@/components/hydration-error-detector'
import SetupChecklist from '@/components/setup/setup-checklist'
import OnboardingWarning from '@/components/directory/onboarding-warning'
import OnboardingBanner from '@/components/onboarding/onboarding-banner'
import DiagnosticsCard from '@/components/dashboard/diagnostics-card'
import AISpendCard from '@/components/dashboard/ai-spend-card'
import PlanCard from '@/components/dashboard/plan-card'
import Link from 'next/link'
import { isFinance } from '@/lib/admin-helpers'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const user = await requireAuth()
  const params = await searchParams
  const showAdminError = params?.error === 'admin_required'
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/dashboard' })
  const isAdminUser = await isAdmin()
  const isFinanceUser = await isFinance()

  // Check onboarding status (show banner if incomplete, don't redirect)
  const activeOrgId = activeOrg.id
  const onboardingStatus = await getOnboardingStatus(activeOrgId)

  // Fetch executive dashboard data
  const [kpis, dailyTrend, topUsers, topTeams, topProjects, topApps, topClients, recommendations] = await Promise.all([
    getExecutiveKPIs(activeOrgId),
    getDailyTrend(activeOrgId, 30, 'total'),
    getTopConsumers(activeOrgId, 'user', 5),
    getTopConsumers(activeOrgId, 'team', 5),
    getTopConsumers(activeOrgId, 'project', 5),
    getTopConsumers(activeOrgId, 'app', 5),
    getTopConsumers(activeOrgId, 'client', 5),
    getRecommendations(activeOrgId),
  ])

  return (
    <ErrorBoundary>
      <HydrationErrorDetector />
      <AppShell
        organizations={organizations}
        activeOrgId={activeOrgId}
        hasActiveAWS={false}
        commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
        env={process.env.VERCEL_ENV}
        isAdmin={isAdminUser}
        needsOnboarding={!onboardingStatus.completed}
      >
        <UIDebugPanel
          commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
          env={process.env.VERCEL_ENV}
          isAdmin={isAdminUser}
        />
        {showAdminError && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
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
        )}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Executive Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">
                {activeOrg ? `Cost overview for ${activeOrg.name}` : 'Cost overview'}
              </p>
            </div>

            {/* Onboarding Banner */}
            {!onboardingStatus.completed && <OnboardingBanner />}

            {/* Setup Checklist */}
            <SetupChecklist />

            {/* Directory Onboarding Warning */}
            <OnboardingWarning />

            {/* KPIs */}
            <KPICards kpis={kpis} />

            {/* AI Spend Card (Admin/Finance only) */}
            {/* Plan Card (Admin only) */}
            {isAdminUser && (
              <div className="mb-6">
                <PlanCard />
              </div>
            )}

            {/* AI Spend Card (Admin or Finance) */}
            {(isAdminUser || isFinanceUser) && (
              <div className="mb-6">
                <AISpendCard />
              </div>
            )}

            {/* Trends */}
            <div className="mb-6">
              <TrendChart data={dailyTrend} />
            </div>

            {/* Main Grid: Top Consumers + Alerts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
              <TopConsumers
                users={topUsers}
                teams={topTeams}
                projects={topProjects}
                apps={topApps}
                clients={topClients}
              />
              <AlertsPanel />
            </div>

            {/* Recommendations */}
            <div className="mb-6">
              <Recommendations recommendations={recommendations} />
            </div>

            {/* Diagnostics Card (Admin only) */}
            {isAdminUser && (
              <div className="mb-6">
                <DiagnosticsCard />
              </div>
            )}

            {/* Quick Actions (smaller, at bottom) */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  href="/accounts"
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-2xl mb-1">☁️</span>
                  <span className="text-xs font-medium text-gray-700 text-center">Cloud Accounts</span>
                </Link>
                <Link
                  href="/alerts/new"
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-2xl mb-1">🔔</span>
                  <span className="text-xs font-medium text-gray-700 text-center">Create Alert</span>
                </Link>
                {activeOrgId && (
                  <Link
                    href={`/organizations/${activeOrgId}/billing`}
                    className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-2xl mb-1">💳</span>
                    <span className="text-xs font-medium text-gray-700 text-center">Billing</span>
                  </Link>
                )}
                <Link
                  href="/costs"
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-2xl mb-1">📊</span>
                  <span className="text-xs font-medium text-gray-700 text-center">Cost Details</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ErrorBoundary>
  )
}
