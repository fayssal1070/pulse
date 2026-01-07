'use client'

import { useEffect, useState } from 'react'

interface ConnectionInfo {
  databaseUrl: {
    host: string | null
    port: string | null
    urlMasked: string
  } | null
  directUrl: {
    host: string | null
    port: string | null
    urlMasked: string
  } | null
}

interface DbConnectionResponse {
  ok: boolean
  latencyMs: number
  error?: {
    code: string
    message: string
  }
  connectionInfo: ConnectionInfo
  timestamp: string
}

export function DebugDbConnectionClient() {
  const [data, setData] = useState<DbConnectionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const res = await fetch('/api/debug/db-connection')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch connection info')
      } finally {
        setLoading(false)
      }
    }

    fetchConnectionInfo()
    // Refresh every 5 seconds
    const interval = setInterval(fetchConnectionInfo, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="text-gray-500">Loading connection info...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (!data) {
    return <div className="text-gray-500">No data</div>
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className={`p-4 rounded-lg ${data.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${data.ok ? 'text-green-600' : 'text-red-600'}`}>
            {data.ok ? '✅' : '❌'}
          </span>
          <div>
            <div className="font-semibold">{data.ok ? 'Connection OK' : 'Connection Failed'}</div>
            {data.latencyMs && (
              <div className="text-sm text-gray-600">Latency: {data.latencyMs}ms</div>
            )}
          </div>
        </div>
        {data.error && (
          <div className="mt-2 text-sm">
            <div className="font-mono text-red-700">
              <strong>Code:</strong> {data.error.code}
            </div>
            <div className="font-mono text-red-700 mt-1">
              <strong>Message:</strong> {data.error.message}
            </div>
          </div>
        )}
      </div>

      {/* Connection Info */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Connection URLs</h2>
        <div className="space-y-3">
          {/* DATABASE_URL */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">DATABASE_URL</div>
            {data.connectionInfo.databaseUrl ? (
              <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                <div>Host: {data.connectionInfo.databaseUrl.host || 'N/A'}</div>
                <div>Port: {data.connectionInfo.databaseUrl.port || 'N/A'}</div>
                <div className="text-gray-600 mt-1">{data.connectionInfo.databaseUrl.urlMasked}</div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Not configured</div>
            )}
          </div>

          {/* DIRECT_URL */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">DIRECT_URL</div>
            {data.connectionInfo.directUrl ? (
              <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                <div>Host: {data.connectionInfo.directUrl.host || 'N/A'}</div>
                <div>Port: {data.connectionInfo.directUrl.port || 'N/A'}</div>
                <div className="text-gray-600 mt-1">{data.connectionInfo.directUrl.urlMasked}</div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Not configured</div>
            )}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500">
        Last updated: {data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
      </div>
    </div>
  )
}




