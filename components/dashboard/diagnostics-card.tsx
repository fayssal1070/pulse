'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CronStatus {
  type: string
  status: string
  startedAt: string
  finishedAt: string | null
  error: string | null
}

export default function DiagnosticsCard() {
  const [cronStatuses, setCronStatuses] = useState<CronStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCronStatus() {
      try {
        const res = await fetch('/api/admin/health')
        if (res.ok) {
          const data = await res.json()
          const statuses: CronStatus[] = []
          if (data.cron?.RUN_ALERTS) {
            statuses.push({
              type: 'RUN_ALERTS',
              status: data.cron.RUN_ALERTS.status,
              startedAt: data.cron.RUN_ALERTS.startedAt,
              finishedAt: data.cron.RUN_ALERTS.finishedAt,
              error: data.cron.RUN_ALERTS.error,
            })
          }
          if (data.cron?.SYNC_AWS_CUR) {
            statuses.push({
              type: 'SYNC_AWS_CUR',
              status: data.cron.SYNC_AWS_CUR.status,
              startedAt: data.cron.SYNC_AWS_CUR.startedAt,
              finishedAt: data.cron.SYNC_AWS_CUR.finishedAt,
              error: data.cron.SYNC_AWS_CUR.error,
            })
          }
          if (data.cron?.APPLY_RETENTION) {
            statuses.push({
              type: 'APPLY_RETENTION',
              status: data.cron.APPLY_RETENTION.status,
              startedAt: data.cron.APPLY_RETENTION.startedAt,
              finishedAt: data.cron.APPLY_RETENTION.finishedAt,
              error: data.cron.APPLY_RETENTION.error,
            })
          }
          setCronStatuses(statuses)
        }
      } catch (error) {
        console.error('Error fetching cron status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCronStatus()
    // Refresh every 60 seconds
    const interval = setInterval(fetchCronStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getStatusColor = (status: string) => {
    if (status === 'SUCCESS') return 'text-green-600'
    if (status === 'FAIL') return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Diagnostics</h3>
        <p className="text-xs text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Diagnostics</h3>
        <Link href="/admin/health" className="text-xs text-blue-600 hover:text-blue-700">
          View Details →
        </Link>
      </div>
      <div className="space-y-2">
        {cronStatuses.length === 0 ? (
          <p className="text-xs text-gray-500">No cron runs recorded</p>
        ) : (
          cronStatuses.map((cron) => (
            <div key={cron.type} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {cron.type === 'RUN_ALERTS' ? 'Alerts' : cron.type === 'SYNC_AWS_CUR' ? 'CUR Sync' : 'Retention'}
              </span>
              <div className="flex items-center space-x-2">
                <span className={getStatusColor(cron.status)}>{cron.status}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{formatDate(cron.startedAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

