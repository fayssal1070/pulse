import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AlertForm from './alert-form'
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
  })

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
              <span className="text-gray-700">Alerts</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Alerts</h2>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Alert</h3>
            <AlertForm organizationId={id} />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Alerts</h3>
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No alerts configured</p>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert: Alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded border ${
                      alert.triggered
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">Alert Rule</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Alert if total {alert.windowDays} days &gt; {alert.thresholdEUR} EUR
                        </p>
                        {alert.triggered && alert.triggeredAt && (
                          <p className="text-xs text-red-600 mt-1">
                            Triggered at: {new Date(alert.triggeredAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {alert.triggered ? (
                          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">
                            TRIGGERED
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                        <DeleteAlertButton alertId={alert.id} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

