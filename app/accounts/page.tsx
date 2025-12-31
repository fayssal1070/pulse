import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { requireActiveOrgOrRedirect } from '@/lib/organizations/require-active-org'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import SyncNowButton from '@/components/sync-now-button'
import SyncCurButton from '@/components/sync-cur-button'
import Link from 'next/link'
import FormattedDate from '@/components/formatted-date'
import { isAdmin } from '@/lib/admin-helpers'

export default async function AccountsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await requireActiveOrgOrRedirect(user.id, { nextPath: '/accounts' })
  const isAdminUser = await isAdmin()

  if (organizations.length === 0) {
    redirect('/organizations/new')
  }

  // Get all cloud accounts from all organizations user has access to
  const orgIds = organizations.map((o) => o.id)
  const allAccounts = await prisma.cloudAccount.findMany({
    where: {
      orgId: { in: orgIds },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          awsCurEnabled: true,
        },
      },
    },
  })

  // Get CUR status for active org
  const latestBatch = await prisma.ingestionBatch.findFirst({
    where: {
      orgId: activeOrg.id,
      source: 'AWS_CUR',
    },
    orderBy: { startedAt: 'desc' },
  })
  const curAccount = await prisma.cloudAccount.findFirst({
    where: {
      orgId: activeOrg.id,
      provider: 'AWS',
      connectionType: 'CUR',
    },
    select: {
      lastCurSyncAt: true,
      lastCurSyncError: true,
    },
  })
  
  // Fetch org with CUR fields to check if enabled
  const orgWithCur = await prisma.organization.findUnique({
    where: { id: activeOrg.id },
    select: { awsCurEnabled: true },
  })
  
  const curStatus = {
    enabled: !!orgWithCur?.awsCurEnabled,
    lastBatch: latestBatch,
    lastSyncedAt: curAccount?.lastCurSyncAt,
    lastError: curAccount?.lastCurSyncError,
  }

  // Group accounts by organization
  const accountsByOrg = allAccounts.reduce((acc, account) => {
    const orgId = account.orgId
    if (!acc[orgId]) {
      acc[orgId] = {
        org: account.organization,
        accounts: [],
      }
    }
    acc[orgId].accounts.push(account)
    return acc
  }, {} as Record<string, { org: { id: string; name: string }; accounts: typeof allAccounts }>)

  // Check if there's any active AWS account
  const hasActiveAWS = allAccounts.some(
    (acc) => acc.provider === 'AWS' && acc.connectionType === 'COST_EXPLORER' && acc.status === 'active'
  )

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      disabled: { label: 'Disabled', className: 'bg-gray-100 text-gray-800' },
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
      activeOrgId={activeOrg.id} 
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cloud Accounts</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage cloud accounts across all your organizations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {isAdminUser && (
                <SyncCurButton orgId={activeOrg.id} />
              )}
              <Link
                href={`/organizations/${activeOrg.id}/cloud-accounts/connect/aws`}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                + Connect AWS
              </Link>
            </div>
          </div>

          {/* CUR Status */}
          {curStatus && curStatus.enabled && (
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">AWS CUR Sync Status</h3>
                  {curStatus.lastSyncedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last synced: <FormattedDate date={curStatus.lastSyncedAt} />
                    </p>
                  )}
                  {curStatus.lastBatch && (
                    <p className="text-xs text-gray-500">
                      Last batch: {curStatus.lastBatch.batchId} ({curStatus.lastBatch.status}) -{' '}
                      {curStatus.lastBatch.eventsUpserted} events
                    </p>
                  )}
                  {curStatus.lastError && (
                    <p className="text-xs text-red-600 mt-1">Error: {curStatus.lastError}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{allAccounts.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {allAccounts.filter((a) => a.status === 'active').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {allAccounts.filter((a) => a.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Organizations</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(accountsByOrg).length}</p>
            </div>
          </div>

          {/* Accounts grouped by organization */}
          {Object.keys(accountsByOrg).length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">No cloud accounts found.</p>
              <Link
                href={`/organizations/${activeOrg.id}/cloud-accounts/connect/aws`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Connect your first AWS account →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(accountsByOrg).map(({ org, accounts }) => (
                <div key={org.id} className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                      <Link
                        href={`/organizations/${org.id}/cloud-accounts`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Manage →
                      </Link>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Provider
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Synced
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {accounts.map((account) => (
                          <tr key={account.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{account.accountName}</div>
                              {account.accountIdentifier && (
                                <div className="text-xs text-gray-500">{account.accountIdentifier}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{account.provider}</div>
                              {account.connectionType && (
                                <div className="text-xs text-gray-500">{account.connectionType}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(account.status)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {account.lastSyncedAt ? (
                                <FormattedDate
                                  date={account.lastSyncedAt}
                                  locale="en-US"
                                  options={{
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }}
                                />
                              ) : (
                                'Never'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              {account.provider === 'AWS' &&
                                account.connectionType === 'COST_EXPLORER' &&
                                account.status === 'active' && (
                                  <SyncNowButton accountId={account.id} orgId={org.id} />
                                )}
                              <Link
                                href={`/organizations/${org.id}/cloud-accounts/${account.id}/records`}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                View Records
                              </Link>
                              <Link
                                href={`/organizations/${org.id}/cloud-accounts`}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Manage
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
