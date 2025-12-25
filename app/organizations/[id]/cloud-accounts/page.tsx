import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import CloudAccountSyncButton from '@/components/cloud-account-sync-button'

export default async function CloudAccountsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params
  const organization = await getOrganizationById(id, user.id)

  if (!organization) {
    redirect('/dashboard')
  }

  const cloudAccounts = await prisma.cloudAccount.findMany({
    where: { orgId: id },
    orderBy: { createdAt: 'desc' },
  })

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

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
              <Link
                href={`/organizations/${id}`}
                className="text-gray-700 hover:text-gray-900"
              >
                {organization.name}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-700">Cloud Accounts</span>
            </div>
            <Link
              href={`/organizations/${id}`}
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Back
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Cloud Accounts</h2>
            <Link
              href={`/organizations/${id}/cloud-accounts/connect/aws`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Connect AWS
            </Link>
          </div>

          {cloudAccounts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">No cloud accounts connected yet.</p>
              <Link
                href={`/organizations/${id}/cloud-accounts/connect/aws`}
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Connect Your First AWS Account
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cloudAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {account.accountName}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            account.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : account.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : account.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {account.status.toUpperCase()}
                        </span>
                        {account.connectionType && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {account.connectionType}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Provider:</span> {account.provider}
                        </p>
                        {account.connectionType === 'COST_EXPLORER' && (
                          <p>
                            <span className="font-medium">Auto-sync:</span>{' '}
                            <span className="text-green-600">once daily</span>
                            <span className="text-xs text-gray-500 ml-2">
                              (Cost Explorer updates every 24h)
                            </span>
                          </p>
                        )}
                        {account.accountIdentifier && (
                          <p>
                            <span className="font-medium">Account ID:</span>{' '}
                            {account.accountIdentifier}
                          </p>
                        )}
                        {account.roleArn && (
                          <p className="font-mono text-xs">
                            <span className="font-medium">Role ARN:</span> {account.roleArn}
                          </p>
                        )}
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p>
                            <span className="font-medium">Status:</span>{' '}
                            <span
                              className={
                                account.status === 'active'
                                  ? 'text-green-600'
                                  : account.status === 'error'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }
                            >
                              {account.status.toUpperCase()}
                            </span>
                          </p>
                          {account.lastSyncedAt ? (
                            <p>
                              <span className="font-medium">Last synced:</span>{' '}
                              {formatDate(account.lastSyncedAt)}
                            </p>
                          ) : (
                            <p className="text-gray-500">Never synced</p>
                          )}
                          {account.lastSyncError && (
                            <p className="text-red-600 mt-1">
                              <span className="font-medium">Last error:</span>{' '}
                              <span className="text-xs">{account.lastSyncError}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col space-y-2">
                      {account.connectionType === 'COST_EXPLORER' && account.provider === 'AWS' && (
                        <CloudAccountSyncButton cloudAccountId={account.id} />
                      )}
                      <Link
                        href={`/organizations/${id}/cloud-accounts/${account.id}/records`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Imported Records →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

