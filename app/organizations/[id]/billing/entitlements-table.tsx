'use client'

import Link from 'next/link'

interface EntitlementsTableProps {
  usage: {
    cloudAccounts: number
    alerts: number
    members: number
    entitlements: {
      maxCloudAccounts: number
      maxAlerts: number
      maxMembers: number
    }
  }
}

export default function EntitlementsTable({ usage }: EntitlementsTableProps) {
  const getUsagePercentage = (current: number, max: number) => {
    if (max === 0) return 0
    return Math.min((current / max) * 100, 100)
  }

  const getUsageColor = (current: number, max: number) => {
    const percentage = getUsagePercentage(current, max)
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const isAtLimit = (current: number, max: number) => current >= max

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage & Limits</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Used
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Limit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                Cloud Accounts
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {usage.cloudAccounts}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {usage.entitlements.maxCloudAccounts === 0 ? 'Unlimited' : usage.entitlements.maxCloudAccounts}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {usage.entitlements.maxCloudAccounts > 0 && (
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(usage.cloudAccounts, usage.entitlements.maxCloudAccounts)}`}
                        style={{
                          width: `${getUsagePercentage(usage.cloudAccounts, usage.entitlements.maxCloudAccounts)}%`,
                        }}
                      />
                    </div>
                    {isAtLimit(usage.cloudAccounts, usage.entitlements.maxCloudAccounts) ? (
                      <span className="text-xs text-red-600 font-medium">Limit reached</span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {usage.entitlements.maxCloudAccounts - usage.cloudAccounts} remaining
                      </span>
                    )}
                  </div>
                )}
                {usage.entitlements.maxCloudAccounts === 0 && (
                  <span className="text-xs text-green-600 font-medium">Unlimited</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                Alerts
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {usage.alerts}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {usage.entitlements.maxAlerts === 0 ? 'Unlimited' : usage.entitlements.maxAlerts}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {usage.entitlements.maxAlerts > 0 && (
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(usage.alerts, usage.entitlements.maxAlerts)}`}
                        style={{
                          width: `${getUsagePercentage(usage.alerts, usage.entitlements.maxAlerts)}%`,
                        }}
                      />
                    </div>
                    {isAtLimit(usage.alerts, usage.entitlements.maxAlerts) ? (
                      <span className="text-xs text-red-600 font-medium">Limit reached</span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {usage.entitlements.maxAlerts - usage.alerts} remaining
                      </span>
                    )}
                  </div>
                )}
                {usage.entitlements.maxAlerts === 0 && (
                  <span className="text-xs text-green-600 font-medium">Unlimited</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                Team Members
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {usage.members}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {usage.entitlements.maxMembers === 0 ? 'Unlimited' : usage.entitlements.maxMembers}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {usage.entitlements.maxMembers > 0 && (
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(usage.members, usage.entitlements.maxMembers)}`}
                        style={{
                          width: `${getUsagePercentage(usage.members, usage.entitlements.maxMembers)}%`,
                        }}
                      />
                    </div>
                    {isAtLimit(usage.members, usage.entitlements.maxMembers) ? (
                      <span className="text-xs text-red-600 font-medium">Limit reached</span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {usage.entitlements.maxMembers - usage.members} remaining
                      </span>
                    )}
                  </div>
                )}
                {usage.entitlements.maxMembers === 0 && (
                  <span className="text-xs text-green-600 font-medium">Unlimited</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {(isAtLimit(usage.cloudAccounts, usage.entitlements.maxCloudAccounts) ||
        isAtLimit(usage.alerts, usage.entitlements.maxAlerts) ||
        isAtLimit(usage.members, usage.entitlements.maxMembers)) && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Limit reached.</span> Upgrade your plan to add more resources.
          </p>
          <Link
            href="/pricing"
            className="mt-2 inline-block text-sm font-medium text-yellow-900 hover:text-yellow-700"
          >
            View plans →
          </Link>
        </div>
      )}
    </div>
  )
}






