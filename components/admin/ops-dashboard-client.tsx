'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OverviewData {
  buildInfo: {
    commitSha: string
    commitShaShort: string
    env: string
    buildTimestamp: string
    vercelUrl: string | null
    deploymentId: string | null
  }
  lastCronRunAlerts: {
    id: string
    ranAt: string
    status: string
    orgsProcessed: number
    alertsTriggered: number
    sentEmail: number
    sentTelegram: number
    sentInApp: number
    durationMs: number | null
    errorCount: number
    errorSample: string | null
  } | null
  lastCronRunCur: {
    id: string
    ranAt: string
    status: string
    orgsProcessed: number
    durationMs: number | null
    errorCount: number
    errorSample: string | null
  } | null
  lastCurBatch: {
    id: string
    startedAt: string
    finishedAt: string | null
    status: string
    objectsProcessed: number
    rowsParsed: number
    eventsUpserted: number
    errorsCount: number
    sampleError: string | null
  } | null
  counts: {
    notificationsUnread: number
    budgetsCount: number
    alertRulesCount: number
  }
}

export default function OpsDashboardClient() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OverviewData | null>(null)
  const [runningAlerts, setRunningAlerts] = useState(false)
  const [runningCur, setRunningCur] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadOverview()
  }, [])

  const loadOverview = async () => {
    try {
      const res = await fetch('/api/admin/ops/overview')
      const json = await res.json()
      if (json.error) {
        console.error('Error loading overview:', json.error)
        return
      }
      setData(json)
    } catch (error) {
      console.error('Error loading overview:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRunAlerts = async () => {
    setRunningAlerts(true)
    try {
      const res = await fetch('/api/admin/ops/run-alerts-now', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        alert(`Error: ${json.error}`)
      } else {
        alert('Alerts dispatch triggered successfully!')
        // Reload after 2 seconds
        setTimeout(() => {
          loadOverview()
        }, 2000)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setRunningAlerts(false)
    }
  }

  const handleRunCur = async () => {
    setRunningCur(true)
    try {
      const res = await fetch('/api/admin/ops/run-cur-now', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        alert(`Error: ${json.error}`)
      } else {
        alert('CUR sync triggered successfully!')
        // Reload after 2 seconds
        setTimeout(() => {
          loadOverview()
        }, 2000)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setRunningCur(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <p className="text-red-600">Failed to load operations data</p>
        </div>
      </div>
    )
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0 space-y-6">
        {/* Deploy & Build */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Deploy & Build</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Environment:</span>
              <span className="ml-2 font-mono">{data.buildInfo.env}</span>
            </div>
            <div>
              <span className="text-gray-500">Commit:</span>
              <span className="ml-2 font-mono">{data.buildInfo.commitShaShort}</span>
            </div>
            <div>
              <span className="text-gray-500">Build Time:</span>
              <span className="ml-2">{formatDate(data.buildInfo.buildTimestamp)}</span>
            </div>
            {data.buildInfo.deploymentId && (
              <div>
                <span className="text-gray-500">Deployment ID:</span>
                <span className="ml-2 font-mono text-xs">{data.buildInfo.deploymentId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cron Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cron Health</h2>
          <div className="space-y-6">
            {/* run-alerts */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">run-alerts</h3>
                <button
                  onClick={handleRunAlerts}
                  disabled={runningAlerts}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {runningAlerts ? 'Running...' : 'Run now'}
                </button>
              </div>
              {data.lastCronRunAlerts ? (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">Last run:</span>
                    <span className="ml-2">{formatDate(data.lastCronRunAlerts.ranAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 font-semibold ${data.lastCronRunAlerts.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
                      {data.lastCronRunAlerts.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2">{formatDuration(data.lastCronRunAlerts.durationMs)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Counts:</span>
                    <span className="ml-2">
                      {data.lastCronRunAlerts.orgsProcessed} orgs, {data.lastCronRunAlerts.alertsTriggered} alerts,{' '}
                      {data.lastCronRunAlerts.sentEmail} email, {data.lastCronRunAlerts.sentTelegram} telegram,{' '}
                      {data.lastCronRunAlerts.sentInApp} in-app
                    </span>
                  </div>
                  {data.lastCronRunAlerts.errorCount > 0 && (
                    <div className="text-red-600">
                      <span className="text-gray-500">Errors:</span>
                      <span className="ml-2">{data.lastCronRunAlerts.errorCount}</span>
                      {data.lastCronRunAlerts.errorSample && (
                        <div className="mt-1 text-xs font-mono bg-red-50 p-2 rounded">
                          {data.lastCronRunAlerts.errorSample}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No runs yet</p>
              )}
            </div>

            {/* sync-aws-cur */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">sync-aws-cur</h3>
                <button
                  onClick={handleRunCur}
                  disabled={runningCur}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {runningCur ? 'Running...' : 'Run now'}
                </button>
              </div>
              {data.lastCronRunCur ? (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-500">Last run:</span>
                    <span className="ml-2">{formatDate(data.lastCronRunCur.ranAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 font-semibold ${data.lastCronRunCur.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
                      {data.lastCronRunCur.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2">{formatDuration(data.lastCronRunCur.durationMs)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Processed:</span>
                    <span className="ml-2">{data.lastCronRunCur.orgsProcessed} orgs</span>
                  </div>
                  {data.lastCronRunCur.errorCount > 0 && (
                    <div className="text-red-600">
                      <span className="text-gray-500">Errors:</span>
                      <span className="ml-2">{data.lastCronRunCur.errorCount}</span>
                      {data.lastCronRunCur.errorSample && (
                        <div className="mt-1 text-xs font-mono bg-red-50 p-2 rounded">
                          {data.lastCronRunCur.errorSample}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No runs yet</p>
              )}
            </div>
          </div>
        </div>

        {/* CUR Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">CUR Health</h2>
          {data.lastCurBatch ? (
            <div className="text-sm space-y-2">
              <div>
                <span className="text-gray-500">Last batch:</span>
                <span className="ml-2">{formatDate(data.lastCurBatch.startedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 font-semibold ${data.lastCurBatch.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {data.lastCurBatch.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Results:</span>
                <span className="ml-2">
                  {data.lastCurBatch.objectsProcessed} objects, {data.lastCurBatch.rowsParsed} rows,{' '}
                  {data.lastCurBatch.eventsUpserted} events
                </span>
              </div>
              {data.lastCurBatch.errorsCount > 0 && (
                <div className="text-red-600">
                  <span className="text-gray-500">Errors:</span>
                  <span className="ml-2">{data.lastCurBatch.errorsCount}</span>
                  {data.lastCurBatch.sampleError && (
                    <div className="mt-1 text-xs font-mono bg-red-50 p-2 rounded">
                      {data.lastCurBatch.sampleError}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No batches yet</p>
          )}
        </div>

        {/* Notifications Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Notifications Health</h2>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-gray-500">Unread notifications:</span>
              <span className="ml-2 font-semibold">{data.counts.notificationsUnread}</span>
              {data.counts.notificationsUnread > 0 && (
                <button
                  onClick={() => router.push('/notifications')}
                  className="ml-4 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  View
                </button>
              )}
            </div>
            <div>
              <span className="text-gray-500">Budgets:</span>
              <span className="ml-2">{data.counts.budgetsCount}</span>
            </div>
            <div>
              <span className="text-gray-500">Alert rules:</span>
              <span className="ml-2">{data.counts.alertRulesCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

