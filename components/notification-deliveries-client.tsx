'use client'

import { useState, useEffect } from 'react'

interface NotificationDelivery {
  id: string
  channel: string
  status: string
  attempt: number
  lastError: string | null
  createdAt: string
  updatedAt: string
  nextRetryAt: string | null
}

interface NotificationsDeliveriesClientProps {
  organizationId: string
}

export default function NotificationDeliveriesClient({ organizationId }: NotificationsDeliveriesClientProps) {
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [channelFilter, setChannelFilter] = useState<string>('')

  useEffect(() => {
    loadDeliveries()
  }, [statusFilter, channelFilter])

  const loadDeliveries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (channelFilter) params.set('channel', channelFilter)

      const res = await fetch(`/api/admin/notifications/deliveries?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setDeliveries(data.deliveries || [])
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SENT: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      RETRYING: 'bg-blue-100 text-blue-800',
      FAILED: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="SENT">Sent</option>
              <option value="RETRYING">Retrying</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="EMAIL">Email</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="SLACK">Slack</option>
              <option value="TEAMS">Teams</option>
              <option value="INAPP">In-App</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : deliveries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No deliveries found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{delivery.channel}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(delivery.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.attempt}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(delivery.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {delivery.lastError ? (
                      <span className="text-red-600" title={delivery.lastError}>
                        {delivery.lastError.substring(0, 100)}
                        {delivery.lastError.length > 100 ? '...' : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

