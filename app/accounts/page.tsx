import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import LogoutButton from '@/components/logout-button'
import OrgSwitcher from '@/components/org-switcher'
import CloudAccountForm from '@/components/cloud-account-form'
import CloudAccountsList from '@/components/cloud-accounts-list'

export default async function AccountsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  if (!activeOrg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No active organization found.</p>
          <Link href="/organizations/new" className="text-blue-600 hover:text-blue-700">
            Create an organization
          </Link>
        </div>
      </div>
    )
  }

  const cloudAccounts = await prisma.cloudAccount.findMany({
    where: { orgId: activeOrg.id },
    orderBy: { createdAt: 'desc' },
  })

  const accountsByStatus = {
    active: cloudAccounts.filter(a => a.status === 'active').length,
    pending: cloudAccounts.filter(a => a.status === 'pending').length,
    disabled: cloudAccounts.filter(a => a.status === 'disabled').length,
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
              <span className="text-gray-700">Cloud Accounts</span>
            </div>
            <div className="flex items-center space-x-4">
              <OrgSwitcher organizations={organizations} activeOrgId={activeOrg.id} />
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Cloud Accounts</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage cloud accounts for {activeOrg.name}
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{cloudAccounts.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{accountsByStatus.active}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{accountsByStatus.pending}</p>
            </div>
          </div>

          {/* Add Account Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Cloud Account</h3>
            <CloudAccountForm organizationId={activeOrg.id} />
          </div>

          {/* Accounts List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Accounts</h3>
            <CloudAccountsList accounts={cloudAccounts} />
          </div>
        </div>
      </main>
    </div>
  )
}

