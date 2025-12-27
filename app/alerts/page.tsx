import { requireAuth } from '@/lib/auth-helpers'
import { getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import Link from 'next/link'

export default async function AlertsPage() {
  const user = await requireAuth()
  const organizations = await getUserOrganizations(user.id)
  const activeOrg = await getActiveOrganization(user.id)

  if (organizations.length === 0) {
    redirect('/organizations/new')
  }

  // Get all alerts from all organizations user has access to
  const orgIds = organizations.map((o) => o.id)
  const allAlerts = await prisma.alertRule.findMany({
    where: {
      orgId: { in: orgIds },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { alertEvents: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Group alerts by organization
  const alertsByOrg = allAlerts.reduce((acc, alert) => {
    const orgId = alert.orgId
    if (!acc[orgId]) {
      acc[orgId] = {
        org: alert.organization,
        alerts: [],
      }
    }
    acc[orgId].alerts.push(alert)
    return acc
  }, {} as Record<string, { org: { id: string; name: string }; alerts: typeof allAlerts }>)

  // Check if there's any active AWS account
  const hasActiveAWS = false // Will be computed if needed

  return (
    <AppShell organizations={organizations} activeOrgId={activeOrg?.id || null} hasActiveAWS={hasActiveAWS}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage cost alerts across all your organizations
              </p>
            </div>
            <Link
              href="/alerts/new"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              + Create Alert
            </Link>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{allAlerts.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {allAlerts.filter((a) => a.enabled).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Triggered (24h)</p>
              <p className="text-2xl font-bold text-red-600">
                {allAlerts.filter((a) => {
                  if (!a.lastTriggeredAt) return false
                  const hoursAgo = (Date.now() - new Date(a.lastTriggeredAt).getTime()) / (1000 * 60 * 60)
                  return hoursAgo <= 24
                }).length}
              </p>
            </div>
          </div>

          {/* Alerts grouped by organization */}
          {Object.keys(alertsByOrg).length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">No alerts configured.</p>
              <Link
                href="/alerts/new"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first alert →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(alertsByOrg).map(({ org, alerts }) => (
                <div key={org.id} className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                      <Link
                        href={`/organizations/${org.id}/alerts`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Manage →
                      </Link>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-4 rounded border ${
                            alert.enabled
                              ? 'bg-white border-gray-200'
                              : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="font-medium text-gray-900">{alert.name}</p>
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded ${
                                    alert.enabled
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {alert.enabled ? 'ENABLED' : 'DISABLED'}
                                </span>
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  {alert.type === 'MONTHLY_BUDGET' ? 'Monthly Budget' : 'Daily Spike'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                {alert.type === 'MONTHLY_BUDGET' ? (
                                  <p>
                                    Alert when spending reaches 50%, 80%, or 100% of{' '}
                                    <span className="font-medium">{alert.thresholdEUR.toFixed(2)} EUR</span>{' '}
                                    monthly budget
                                  </p>
                                ) : (
                                  <p>
                                    Alert when daily spend{' '}
                                    {alert.spikePercent && (
                                      <>
                                        spikes by <span className="font-medium">{alert.spikePercent}%</span> vs{' '}
                                        {alert.lookbackDays}-day baseline
                                      </>
                                    )}
                                    {alert.spikePercent && alert.thresholdEUR > 0 && ' or '}
                                    {alert.thresholdEUR > 0 && (
                                      <>
                                        exceeds <span className="font-medium">{alert.thresholdEUR.toFixed(2)} EUR</span>
                                      </>
                                    )}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  Cooldown: {alert.cooldownHours}h • Events: {alert._count.alertEvents}
                                  {alert.lastTriggeredAt && (
                                    <> • Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString()}</>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Link
                                href={`/organizations/${org.id}/alerts/${alert.id}/edit`}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
