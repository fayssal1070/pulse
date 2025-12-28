import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { canViewBilling } from '@/lib/auth/rbac'
import { getOrganizationById, isOrganizationOwner, getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { getOrgUsage } from '@/lib/entitlements'
import Link from 'next/link'
import AppShell from '@/components/app-shell'
import { isAdmin } from '@/lib/admin-helpers'
import BillingActions from './billing-actions'
import EntitlementsTable from './entitlements-table'

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ success?: string; canceled?: string }>
}) {
  const user = await requireAuth()
  const { id } = await params
  const search = await searchParams
  const organization = await getOrganizationById(id, user.id)

  if (!organization) {
    redirect('/dashboard')
  }

  // Check RBAC: admin and finance can view billing
  const canView = await canViewBilling(id)
  if (!canView) {
    redirect('/dashboard?error=access_denied')
  }

  const isOwner = await isOrganizationOwner(id, user.id)
  if (!isOwner) {
    redirect(`/organizations/${id}`)
  }

  // Get usage and entitlements
  const usage = await getOrgUsage(id)

  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)
  const isAdminUser = await isAdmin()

  const hasActiveAWS = await prisma.cloudAccount.count({
    where: {
      orgId: id,
      provider: 'AWS',
      status: 'active',
    },
  }) > 0

  // Format dates
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      trialing: { label: 'Trialing', className: 'bg-blue-100 text-blue-800' },
      past_due: { label: 'Past Due', className: 'bg-yellow-100 text-yellow-800' },
      canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-800' },
      unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-800' },
    }

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

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
            <Link
              href={`/organizations/${id}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
            >
              ← Back to Organization
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">Billing & Subscription</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your subscription and view usage limits
            </p>
          </div>

          {/* Success/Cancel Messages */}
          {search?.success === 'true' && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <p className="text-sm text-green-700">
                <span className="font-medium">Success!</span> Your subscription has been activated.
              </p>
            </div>
          )}

          {search?.canceled === 'true' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">Canceled.</span> Your subscription was not updated.
              </p>
            </div>
          )}

          {/* Current Plan */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{organization.plan}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {organization.plan === 'FREE' && 'Free tier with basic features'}
                    {organization.plan === 'PRO' && 'Pro plan with advanced features'}
                    {organization.plan === 'BUSINESS' && 'Business plan with enterprise features'}
                  </p>
                </div>
                {getStatusBadge(organization.subscriptionStatus)}
              </div>

              {organization.subscriptionStatus && organization.subscriptionStatus !== 'canceled' && (
                <div className="pt-4 border-t border-gray-200 space-y-2 text-sm">
                  {organization.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next billing date:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(organization.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                  {organization.cancelAtPeriodEnd && (
                    <div className="flex items-center text-yellow-600">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Subscription will cancel at period end</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Billing Actions */}
          <BillingActions organizationId={id} currentPlan={organization.plan} />

          {/* Entitlements Table */}
          <EntitlementsTable usage={usage} />
        </div>
      </main>
    </AppShell>
  )
}
