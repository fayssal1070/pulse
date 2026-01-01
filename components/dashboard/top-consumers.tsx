'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopConsumer } from '@/lib/cost-events/types'

interface TopConsumersProps {
  users: TopConsumer[]
  teams: TopConsumer[]
  projects: TopConsumer[]
  apps: TopConsumer[]
  clients: TopConsumer[]
}

export default function TopConsumers({ users, teams, projects, apps, clients }: TopConsumersProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'user' | 'team' | 'project' | 'app' | 'client'>('user')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getData = () => {
    switch (activeTab) {
      case 'user': return users
      case 'team': return teams
      case 'project': return projects
      case 'app': return apps
      case 'client': return clients
    }
  }

  const data = getData()

  const handleRowClick = (consumer: TopConsumer, tab: typeof activeTab) => {
    const params = new URLSearchParams()
    params.set('dateRange', 'mtd')
    params.set('provider', 'ALL')
    
    if (tab === 'user') {
      params.set('dimension', 'users')
      params.set('userId', consumer.id)
    } else if (tab === 'team') {
      params.set('dimension', 'teams')
      params.set('teamId', consumer.id)
    } else if (tab === 'project') {
      params.set('dimension', 'projects')
      params.set('projectId', consumer.id)
    } else if (tab === 'app') {
      params.set('dimension', 'apps')
      params.set('appId', consumer.id)
    } else if (tab === 'client') {
      params.set('dimension', 'clients')
      params.set('clientId', consumer.id)
    }
    
    router.push(`/costs?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Consumers (MTD)</h3>
      
      {/* Tabs */}
      <div className="flex space-x-2 mb-4 border-b border-gray-200">
        {(['user', 'team', 'project', 'app', 'client'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}s
          </button>
        ))}
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {activeTab} data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost MTD
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((consumer) => (
                <tr
                  key={consumer.id}
                  onClick={() => handleRowClick(consumer, activeTab)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {consumer.name || consumer.id || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(consumer.amountEur)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                    {consumer.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

