import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById, getUserOrganizations } from '@/lib/organizations'
import { getActiveOrganization } from '@/lib/active-org'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AppShell from '@/components/app-shell'
import { isAdmin } from '@/lib/admin-helpers'
import ToggleAlertButton from './toggle-alert-button'
import DeleteAlertButton from './delete-button'

type Alert = Awaited<ReturnType<typeof prisma.alertRule.findMany>>[0]

export default async function AlertsPage({
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

  const alerts = await prisma.alertRule.findMany({
    where: { orgId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { alertEvents: true },
      },
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
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Alerts</h2>
              <p className="text-sm text-gray-500 mt-1">
                Set up alerts to monitor your cloud costs
              </p>
            </div>
            <Link
              href={`/organizations/${id}/alerts/new`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Create Alert
            </Link>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Alerts</h3>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm mb-4">No alerts configured</p>
                <Link
                  href={`/organizations/${id}/alerts/new`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Create your first alert →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert: Alert & { _count: { alertEvents: number } }) => (
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
                              {alert.thresholdEUR ? (
                                <span className="font-medium">{alert.thresholdEUR.toFixed(2)} EUR</span>
                              ) : (
                                <span className="font-medium">budget</span>
                              )}{' '}
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
                              {alert.spikePercent && alert.thresholdEUR && alert.thresholdEUR > 0 && ' or '}
                              {alert.thresholdEUR && alert.thresholdEUR > 0 && (
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
                        <ToggleAlertButton
                          alertId={alert.id}
                          organizationId={id}
                          enabled={alert.enabled}
                        />
                        <Link
                          href={`/organizations/${id}/alerts/${alert.id}/edit`}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                        <DeleteAlertButton alertId={alert.id} organizationId={id} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  )
}

