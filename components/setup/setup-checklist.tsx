'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SetupStatus {
  awsCur: {
    configured: boolean
    lastSyncAt: string | null
    healthy: boolean
  }
  aiGateway: {
    configured: boolean
    hasPolicies: boolean
    hasTestRequest: boolean
  }
  budgets: {
    created: boolean
    count: number
  }
  notifications: {
    configured: boolean
  }
  cron: {
    healthy: boolean
    lastRunAt: string | null
  }
}

export default function SetupChecklist() {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health/setup')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Status</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!status) {
    return null
  }

  const items = [
    {
      id: 'aws-cur',
      label: 'AWS CUR Configured',
      status: status.awsCur.configured && status.awsCur.healthy,
      action: status.awsCur.configured ? null : '/accounts',
      actionLabel: 'Configure AWS CUR',
    },
    {
      id: 'ai-gateway',
      label: 'AI Gateway Ready',
      status: status.aiGateway.configured && (status.aiGateway.hasPolicies || status.aiGateway.hasTestRequest),
      action: status.aiGateway.configured ? null : '/admin/ai',
      actionLabel: 'Configure AI Gateway',
    },
    {
      id: 'budgets',
      label: 'Budgets Created',
      status: status.budgets.created,
      action: status.budgets.created ? null : '/budgets/new',
      actionLabel: 'Create Budget',
    },
    {
      id: 'notifications',
      label: 'Notifications Configured',
      status: status.notifications.configured,
      action: status.notifications.configured ? null : '/settings/notifications',
      actionLabel: 'Configure Notifications',
    },
    {
      id: 'cron',
      label: 'Cron Healthy',
      status: status.cron.healthy,
      action: null,
      actionLabel: null,
    },
  ]

  const completedCount = items.filter((i) => i.status).length
  const allComplete = completedCount === items.length

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Setup Status</h3>
        <span className="text-sm text-gray-500">
          {completedCount} / {items.length} complete
        </span>
      </div>

      {allComplete ? (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <p className="text-sm text-green-800 font-medium">✓ All setup steps completed!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={item.status ? 'text-green-600' : 'text-gray-400'}>
                  {item.status ? '✓' : '○'}
                </span>
                <span className={`text-sm ${item.status ? 'text-gray-700' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </div>
              {item.action && (
                <Link
                  href={item.action}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {item.actionLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

