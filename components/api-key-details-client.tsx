'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ApiKeyDetails {
  key: {
    id: string
    label: string | null
    keyPrefix: string
    status: string
    enabled: boolean
    lastUsedAt: string | null
    expiresAt: string | null
    createdAt: string
    defaultApp?: { name: string } | null
    defaultProject?: { name: string } | null
    defaultClient?: { name: string } | null
    defaultTeam?: { name: string } | null
  }
  stats: {
    spendMTD: number
    spendLast24h: number
    requestsLast24h: number
    topModels: Array<{ model: string; count: number }>
    topApps: Array<{ id: string; name: string; count: number }>
    topProjects: Array<{ id: string; name: string; count: number }>
    topClients: Array<{ id: string; name: string; count: number }>
  }
  recentAudits: Array<{
    id: string
    action: string
    actorUserId: string
    createdAt: string
    meta: any
  }>
}

interface ApiKeyDetailsClientProps {
  organizationId: string
  keyId: string
}

export default function ApiKeyDetailsClient({ organizationId, keyId }: ApiKeyDetailsClientProps) {
  const [details, setDetails] = useState<ApiKeyDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDetails()
  }, [keyId])

  const loadDetails = async () => {
    try {
      const res = await fetch(`/api/admin/api-keys/${keyId}`)
      if (!res.ok) throw new Error('Failed to load key details')
      const data = await res.json()
      setDetails(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading API key details...</div>
  }

  if (error || !details) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error || 'Failed to load key details'}</p>
        <Link href="/admin/api-keys" className="text-blue-600 underline mt-2 inline-block">
          ← Back to API Keys
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/api-keys"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          data-testid="back-to-keys-link"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to API Keys
        </Link>
        <h1 className="text-3xl font-bold text-gray-900" data-testid="api-key-details-title">
          {details.key.label || 'Unnamed Key'}
        </h1>
        <p className="text-gray-600 mt-1 font-mono">{details.key.keyPrefix}...</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Spend (MTD)</h3>
          <p className="text-2xl font-semibold text-gray-900">€{details.stats.spendMTD.toFixed(4)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Spend (Last 24h)</h3>
          <p className="text-2xl font-semibold text-gray-900">€{details.stats.spendLast24h.toFixed(4)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Requests (Last 24h)</h3>
          <p className="text-2xl font-semibold text-gray-900">{details.stats.requestsLast24h}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Top Models */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Models (Last 24h)</h3>
          {details.stats.topModels.length === 0 ? (
            <p className="text-gray-500 text-sm">No requests in the last 24 hours</p>
          ) : (
            <ul className="space-y-2">
              {details.stats.topModels.map((item) => (
                <li key={item.model} className="flex justify-between">
                  <span className="font-mono text-sm">{item.model}</span>
                  <span className="text-gray-600">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Apps */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Apps (Last 24h)</h3>
          {details.stats.topApps.length === 0 ? (
            <p className="text-gray-500 text-sm">No app attribution in the last 24 hours</p>
          ) : (
            <ul className="space-y-2">
              {details.stats.topApps.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span className="text-sm">{item.name}</span>
                  <span className="text-gray-600">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Audits */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Audits</h3>
        {details.recentAudits.length === 0 ? (
          <p className="text-gray-500 text-sm">No audit logs</p>
        ) : (
          <div className="space-y-2">
            {details.recentAudits.map((audit) => (
              <div key={audit.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium text-gray-900">{audit.action}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {new Date(audit.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


