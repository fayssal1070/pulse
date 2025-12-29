'use client'

import { useState, useEffect } from 'react'

interface CronRunLog {
  id: string
  ranAt: string
  status: 'OK' | 'ERROR'
  orgsProcessed: number
  alertsTriggered: number
  sentEmail: number
  sentTelegram: number
  sentInApp: number
  errorCount: number
  errorSample: string | null
}

interface CronStatus {
  cronName: string
  lastRun: CronRunLog | null
  nextExpectedRunHint: string | null
}

export default function CronStatusClient() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<CronStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/cron/status')
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setStatus(data)
        setError(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Cron Operations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor cron job execution and proof logs
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {status && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Cron: {status.cronName}
              </h3>

              {status.lastRun ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        status.lastRun.status === 'OK'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {status.lastRun.status}
                    </span>
                  </div>

                  {/* Execution Time */}
                  <div>
                    <span className="text-sm font-medium text-gray-700">Last Run:</span>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(status.lastRun.ranAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Next Expected Run */}
                  {status.nextExpectedRunHint && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Next Expected Run:</span>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(status.nextExpectedRunHint).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Orgs Processed</p>
                      <p className="text-2xl font-bold text-gray-900">{status.lastRun.orgsProcessed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Alerts Triggered</p>
                      <p className="text-2xl font-bold text-gray-900">{status.lastRun.alertsTriggered}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Email Sent</p>
                      <p className="text-2xl font-bold text-gray-900">{status.lastRun.sentEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Telegram Sent</p>
                      <p className="text-2xl font-bold text-gray-900">{status.lastRun.sentTelegram}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">In-App Sent</p>
                      <p className="text-2xl font-bold text-gray-900">{status.lastRun.sentInApp}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Errors</p>
                      <p className={`text-2xl font-bold ${status.lastRun.errorCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {status.lastRun.errorCount}
                      </p>
                    </div>
                  </div>

                  {/* Error Sample */}
                  {status.lastRun.errorSample && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Error Sample:</p>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800 font-mono">{status.lastRun.errorSample}</p>
                      </div>
                    </div>
                  )}

                  {/* Log ID (proof) */}
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500">Log ID (proof):</p>
                    <p className="text-xs font-mono text-gray-700">{status.lastRun.id}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No cron runs recorded yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    The cron will create a log entry on its next execution
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

