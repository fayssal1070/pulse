'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ActiveAlert {
  id: string
  budgetId: string
  budgetName: string
  scopeType: string
  scopeId: string | null
  scopeName: string
  currentSpend: number
  limit: number
  percentage: number
  status: 'OK' | 'WARNING' | 'CRITICAL'
  period: 'MONTHLY' | 'DAILY'
}

interface AlertsPanelProps {
  initialAlerts?: ActiveAlert[]
}

export default function AlertsPanel({ initialAlerts = [] }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<ActiveAlert[]>(initialAlerts)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch active alerts from API
    const fetchAlerts = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/alerts/active')
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.alerts || [])
        }
      } catch (error) {
        console.error('Error fetching alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Active Budget Alerts</h3>
        <Link
          href="/alerts/new"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Create Alert
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <p>Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No active budget alerts</p>
          <p className="text-sm mt-2">All budgets are within limits</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.status === 'CRITICAL'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-semibold ${
                      alert.status === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {alert.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {alert.scopeType} • {alert.period}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-medium">{alert.scopeName}</span>
                  </p>
                  <div className="mt-2 flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">
                      Current: {formatCurrency(alert.currentSpend)}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">
                      Limit: {formatCurrency(alert.limit)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="font-semibold text-gray-900">
                      {alert.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

