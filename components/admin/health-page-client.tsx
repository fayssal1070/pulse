'use client'

import { useState, useEffect } from 'react'

interface HealthData {
  ok: boolean
  env: {
    nodeEnv: string
    vercelEnv: string | null
    commitSha: string | null
  }
  db: {
    ok: boolean
    latency: number | null
    host: string | null
    port: number | null
    dbname: string | null
    connectionType: string | null
    error?: string
  }
  migrations: {
    lastMigration: string | null
    appliedAt: string | null
    error?: string
  }
  cron: {
    RUN_ALERTS: {
      status: string
      startedAt: string
      finishedAt: string | null
      error: string | null
      meta: any
    } | null
    APPLY_RETENTION: {
      status: string
      startedAt: string
      finishedAt: string | null
      error: string | null
      meta: any
    } | null
    SYNC_AWS_CUR: {
      status: string
      startedAt: string
      finishedAt: string | null
      error: string | null
      meta: any
    } | null
    RETRY_NOTIFICATIONS: {
      status: string
      startedAt: string
      finishedAt: string | null
      error: string | null
      meta: any
    } | null
  }
  recentErrors: Array<{
    type: string
    startedAt: string
    finishedAt: string | null
    error: string | null
  }>
  notificationFailures?: {
    byChannel: Record<string, number>
    total: number
  }
}

export default function HealthPageClient() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/admin/health')
        if (!res.ok) {
          throw new Error('Failed to fetch health data')
        }
        const data = await res.json()
        setHealth(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const copyJson = () => {
    if (health) {
      navigator.clipboard.writeText(JSON.stringify(health, null, 2))
      alert('Health data copied to clipboard')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString()
  }

  if (loading) {
    return <div className="text-center py-8">Loading health data...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  if (!health) {
    return <div className="text-center py-8">No health data available</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
          <p className="text-sm text-gray-500 mt-1">Production diagnostics and monitoring</p>
        </div>
        <button
          onClick={copyJson}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Copy JSON
        </button>
      </div>

      {/* DB Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6" data-testid="health-db-status">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className={`text-lg font-semibold ${health.db.ok ? 'text-green-600' : 'text-red-600'}`}>
              {health.db.ok ? 'OK' : 'FAIL'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Latency</p>
            <p className="text-lg font-semibold text-gray-900">
              {health.db.latency !== null ? `${health.db.latency}ms` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Host</p>
            <p className="text-lg font-semibold text-gray-900">{health.db.host || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Connection</p>
            <p className="text-lg font-semibold text-gray-900">{health.db.connectionType || 'N/A'}</p>
          </div>
        </div>
        {health.db.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">{health.db.error}</p>
          </div>
        )}
      </div>

      {/* Migrations */}
      <div className="bg-white rounded-lg shadow p-6 mb-6" data-testid="health-migrations">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Migrations</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Last Migration</p>
            <p className="text-lg font-semibold text-gray-900">{health.migrations.lastMigration || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Applied At</p>
            <p className="text-lg font-semibold text-gray-900">{formatDate(health.migrations.appliedAt)}</p>
          </div>
        </div>
        {health.migrations.error && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">{health.migrations.error}</p>
          </div>
        )}
      </div>

      {/* Cron Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cron Jobs</h3>
        <div className="space-y-4">
          {/* RUN_ALERTS */}
          <div data-testid="health-cron-alerts">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">RUN_ALERTS</span>
              {health.cron.RUN_ALERTS && (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    health.cron.RUN_ALERTS.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {health.cron.RUN_ALERTS.status}
                </span>
              )}
            </div>
            {health.cron.RUN_ALERTS ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Last run: {formatDate(health.cron.RUN_ALERTS.startedAt)}</p>
                {health.cron.RUN_ALERTS.finishedAt && (
                  <p>Finished: {formatDate(health.cron.RUN_ALERTS.finishedAt)}</p>
                )}
                {health.cron.RUN_ALERTS.error && (
                  <p className="text-red-600">Error: {health.cron.RUN_ALERTS.error}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No runs recorded</p>
            )}
          </div>

          {/* APPLY_RETENTION */}
          <div data-testid="health-cron-retention">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">APPLY_RETENTION</span>
              {health.cron.APPLY_RETENTION && (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    health.cron.APPLY_RETENTION.status === 'SUCCESS'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {health.cron.APPLY_RETENTION.status}
                </span>
              )}
            </div>
            {health.cron.APPLY_RETENTION ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Last run: {formatDate(health.cron.APPLY_RETENTION.startedAt)}</p>
                {health.cron.APPLY_RETENTION.finishedAt && (
                  <p>Finished: {formatDate(health.cron.APPLY_RETENTION.finishedAt)}</p>
                )}
                {health.cron.APPLY_RETENTION.error && (
                  <p className="text-red-600">Error: {health.cron.APPLY_RETENTION.error}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No runs recorded</p>
            )}
          </div>

          {/* SYNC_AWS_CUR */}
          <div data-testid="health-cron-cur">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">SYNC_AWS_CUR</span>
              {health.cron.SYNC_AWS_CUR && (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    health.cron.SYNC_AWS_CUR.status === 'SUCCESS'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {health.cron.SYNC_AWS_CUR.status}
                </span>
              )}
            </div>
            {health.cron.SYNC_AWS_CUR ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Last run: {formatDate(health.cron.SYNC_AWS_CUR.startedAt)}</p>
                {health.cron.SYNC_AWS_CUR.finishedAt && (
                  <p>Finished: {formatDate(health.cron.SYNC_AWS_CUR.finishedAt)}</p>
                )}
                {health.cron.SYNC_AWS_CUR.error && (
                  <p className="text-red-600">Error: {health.cron.SYNC_AWS_CUR.error}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No runs recorded</p>
            )}
          </div>

          {/* RETRY_NOTIFICATIONS */}
          <div data-testid="health-cron-retry-notifications">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">RETRY_NOTIFICATIONS</span>
              {health.cron.RETRY_NOTIFICATIONS && (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    health.cron.RETRY_NOTIFICATIONS.status === 'SUCCESS'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {health.cron.RETRY_NOTIFICATIONS.status}
                </span>
              )}
            </div>
            {health.cron.RETRY_NOTIFICATIONS ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>Last run: {formatDate(health.cron.RETRY_NOTIFICATIONS.startedAt)}</p>
                {health.cron.RETRY_NOTIFICATIONS.finishedAt && (
                  <p>Finished: {formatDate(health.cron.RETRY_NOTIFICATIONS.finishedAt)}</p>
                )}
                {health.cron.RETRY_NOTIFICATIONS.error && (
                  <p className="text-red-600">Error: {health.cron.RETRY_NOTIFICATIONS.error}</p>
                )}
                {health.cron.RETRY_NOTIFICATIONS.meta && (
                  <p className="text-xs text-gray-500">
                    Processed: {health.cron.RETRY_NOTIFICATIONS.meta.total || 0} | 
                    Success: {health.cron.RETRY_NOTIFICATIONS.meta.success || 0} | 
                    Failed: {health.cron.RETRY_NOTIFICATIONS.meta.failed || 0}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No runs recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Notification Delivery Failures */}
      {health.notificationFailures && health.notificationFailures.total > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6" data-testid="health-notification-failures">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Delivery Failures (Last 20)
          </h3>
          <div className="mb-2">
            <p className="text-sm text-gray-600">
              Total failed deliveries: <span className="font-semibold text-red-600">{health.notificationFailures.total}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(health.notificationFailures.byChannel).map(([channel, count]) => (
              <div key={channel} className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-gray-500 uppercase">{channel}</p>
                <p className="text-lg font-semibold text-red-600">{count}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            View details in <a href="/admin/notifications" className="text-blue-600 underline">/admin/notifications</a>
          </p>
        </div>
      )}

      {/* Recent Errors */}
      {health.recentErrors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors (Last 10)</h3>
          <div className="space-y-2">
            {health.recentErrors.map((err, idx) => (
              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-red-900">{err.type}</span>
                  <span className="text-xs text-red-600">{formatDate(err.startedAt)}</span>
                </div>
                {err.error && <p className="text-sm text-red-700">{err.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Stats */}
      {health.apiKeys && (
        <div className="bg-white rounded-lg shadow p-6 mb-6" data-testid="health-api-keys">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-lg font-semibold text-green-600">{health.apiKeys.active}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Revoked</p>
              <p className="text-lg font-semibold text-red-600">{health.apiKeys.revoked}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Never Used</p>
              <p className="text-lg font-semibold text-yellow-600">{health.apiKeys.neverUsed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Oldest Usage</p>
              <p className="text-lg font-semibold text-gray-900">
                {health.apiKeys.lastUsedOldest ? formatDate(health.apiKeys.lastUsedOldest) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Newest Usage</p>
              <p className="text-lg font-semibold text-gray-900">
                {health.apiKeys.lastUsedNewest ? formatDate(health.apiKeys.lastUsedNewest) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Key Audits */}
      {health.recentKeyAudits && health.recentKeyAudits.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent API Key Audits (Last 20)</h3>
          <div className="space-y-2">
            {health.recentKeyAudits.map((audit) => (
              <div key={audit.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{audit.action}</span>
                  <span className="text-xs text-gray-600">{formatDate(audit.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500">Key ID: {audit.apiKeyId.substring(0, 8)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

