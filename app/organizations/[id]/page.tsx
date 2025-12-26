import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-helpers'
import { getOrganizationById } from '@/lib/organizations'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

async function getCosts(organizationId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return await prisma.costRecord.findMany({
    where: {
      orgId: organizationId,
      date: { gte: startDate },
    },
    orderBy: { date: 'desc' },
  })
}

type Cost = Awaited<ReturnType<typeof getCosts>>[0]

async function getTopServices(organizationId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const costs = await prisma.costRecord.findMany({
    where: {
      orgId: organizationId,
      date: { gte: startDate },
    },
  })

  type Cost = typeof costs[0]
  const serviceTotals = costs.reduce((acc: Record<string, number>, cost: Cost) => {
    const key = `${cost.provider}:${cost.service}`
    acc[key] = (acc[key] || 0) + cost.amountEUR
    return acc
  }, {} as Record<string, number>)

  return Object.entries(serviceTotals)
    .map(([key, total]) => {
      const [provider, service] = key.split(':')
      return { provider, service, total: total as number }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

export default async function OrganizationPage({
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

  const costs7Days = await getCosts(id, 7)
  const costs30Days = await getCosts(id, 30)
  const topServices = await getTopServices(id, 30)

  const total7Days = costs7Days.reduce((sum: number, cost: Cost) => sum + cost.amountEUR, 0)
  const total30Days = costs30Days.reduce((sum: number, cost: Cost) => sum + cost.amountEUR, 0)

  const alerts = await prisma.alertRule.findMany({
    where: { orgId: id },
    orderBy: { createdAt: 'desc' },
  })

  type Alert = typeof alerts[0]

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
              <span className="text-gray-700">{organization.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/api/auth/logout"
                className="text-gray-700 hover:text-gray-900"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">{organization.name}</h2>
            <div className="space-x-2">
              <Link
                href={`/organizations/${id}/cloud-accounts`}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Cloud Accounts
              </Link>
              <Link
                href={`/organizations/${id}/import`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Import Costs
              </Link>
              <Link
                href={`/organizations/${id}/alerts`}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Manage Alerts
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Last 7 days</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {total7Days.toFixed(2)} EUR
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last 30 days</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {total30Days.toFixed(2)} EUR
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h3>
              <div className="space-y-2">
                {topServices.length === 0 ? (
                  <p className="text-gray-500 text-sm">No costs yet</p>
                ) : (
                  topServices.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-sm text-gray-700">
                        {item.provider} / {item.service}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {item.total.toFixed(2)} EUR
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h3>
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No alerts configured</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert: Alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded ${
                      alert.lastTriggeredAt ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">Alert Rule</p>
                        <p className="text-sm text-gray-500">
                          {alert.type === 'MONTHLY_BUDGET'
                            ? `Monthly budget: ${alert.thresholdEUR.toFixed(2)} EUR`
                            : `Daily spike: ${alert.spikePercent ? `${alert.spikePercent}%` : ''} ${alert.thresholdEUR > 0 ? `or ${alert.thresholdEUR.toFixed(2)} EUR` : ''}`}
                        </p>
                      </div>
                      <div className="text-right">
                        {alert.lastTriggeredAt ? (
                          <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">
                            TRIGGERED
                          </span>
                        ) : alert.enabled ? (
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded">
                            DISABLED
                          </span>
                        )}
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

