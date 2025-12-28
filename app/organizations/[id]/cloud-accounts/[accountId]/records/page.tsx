import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById, getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import AppShell from '@/components/app-shell'
import { isAdmin } from '@/lib/admin-helpers'

export default async function CloudAccountRecordsPage({
  params,
}: {
  params: Promise<{ id: string; accountId: string }>
}) {
  const user = await requireAuth()
  const { id, accountId } = await params
  const organization = await getOrganizationById(id, user.id)

  if (!organization) {
    redirect('/dashboard')
  }

  // Verify cloud account belongs to organization
  const cloudAccount = await prisma.cloudAccount.findFirst({
    where: {
      id: accountId,
      orgId: id,
    },
    select: {
      id: true,
      accountName: true,
      provider: true,
    },
  })

  if (!cloudAccount) {
    redirect(`/organizations/${id}/cloud-accounts`)
  }

  // Get last 30 CostRecords for this organization (filtered by provider if needed)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const costRecords = await prisma.costRecord.findMany({
    where: {
      orgId: id,
      provider: cloudAccount.provider, // Filter by provider
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: 'desc' },
    take: 30,
    select: {
      id: true,
      date: true,
      service: true,
      amountEUR: true,
      currency: true,
    },
  })

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

  return (
    <AppShell
      organizations={organizations}
      activeOrgId={activeOrg?.id || null}
      hasActiveAWS={hasActiveAWS}
      commitSha={process.env.VERCEL_GIT_COMMIT_SHA}
      env={process.env.VERCEL_ENV}
      isAdmin={isAdminUser}
    >
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Imported Records - {cloudAccount.accountName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Last 30 cost records for {cloudAccount.provider} (last 30 days)
            </p>
          </div>

          {costRecords.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">No cost records found for this account.</p>
              <p className="text-sm text-gray-400">
                Records will appear here after syncing or importing cost data.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (EUR)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {costRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.service}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {record.currency === 'EUR' 
                            ? `${record.amountEUR.toFixed(2)} EUR`
                            : `${(record.amountEUR / 0.92).toFixed(2)} ${record.currency} (${record.amountEUR.toFixed(2)} EUR)`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-sm font-medium text-gray-900">
                        Total ({costRecords.length} records)
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                        {(() => {
                          const totalEUR = costRecords.reduce((sum, r) => sum + r.amountEUR, 0)
                          const currencies = [...new Set(costRecords.map(r => r.currency))]
                          if (currencies.length === 1 && currencies[0] === 'EUR') {
                            return `${totalEUR.toFixed(2)} EUR`
                          } else if (currencies.length === 1 && currencies[0] !== 'EUR') {
                            const nativeAmount = totalEUR / 0.92
                            return `${nativeAmount.toFixed(2)} ${currencies[0]} (${totalEUR.toFixed(2)} EUR)`
                          } else {
                            return `${totalEUR.toFixed(2)} EUR`
                          }
                        })()}
                      </td>
                      <td className="px-6 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}

