'use client'

import { useState, useEffect } from 'react'

interface Webhook {
  id: string
  url: string
  enabled: boolean
  events: string[]
  createdAt: string
  updatedAt: string
}

interface WebhookDelivery {
  id: string
  webhookId: string
  eventType: string
  status: string
  attempt: number
  httpStatus: number | null
  error: string | null
  requestId: string | null
  deliveredAt: string
  createdAt: string
  durationMs: number | null
}

interface WebhookDeliveryDetail extends WebhookDelivery {
  payload: any
  webhook?: {
    id: string
    url: string
    events: string[]
  }
}

interface WebhooksAdminClientProps {
  organizationId: string
  initialWebhooks: Webhook[]
}

const AVAILABLE_EVENTS = ['cost_event.created', 'alert_event.triggered', 'ai_request.completed'] as const

type Tab = 'webhooks' | 'deliveries'

export default function WebhooksAdminClient({ organizationId, initialWebhooks }: WebhooksAdminClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('webhooks')
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryDetail | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formUrl, setFormUrl] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>(['ai_request.completed'])
  const [formEnabled, setFormEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Delivery filters
  const [deliveryFilters, setDeliveryFilters] = useState({
    webhookId: '',
    eventType: '',
    status: '',
    limit: 100,
    offset: 0,
  })
  const [deliveryTotal, setDeliveryTotal] = useState(0)

  useEffect(() => {
    if (activeTab === 'deliveries') {
      loadDeliveries()
    }
  }, [activeTab, deliveryFilters])

  const loadDeliveries = async () => {
    setLoadingDeliveries(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (deliveryFilters.webhookId) params.append('webhookId', deliveryFilters.webhookId)
      if (deliveryFilters.eventType) params.append('eventType', deliveryFilters.eventType)
      if (deliveryFilters.status) params.append('status', deliveryFilters.status)
      params.append('limit', deliveryFilters.limit.toString())
      params.append('offset', deliveryFilters.offset.toString())

      const res = await fetch(`/api/admin/webhooks/deliveries?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load deliveries')
      }

      setDeliveries(data.deliveries || [])
      setDeliveryTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load deliveries')
    } finally {
      setLoadingDeliveries(false)
    }
  }

  const loadDeliveryDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/webhooks/deliveries/${id}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load delivery detail')
      }

      setSelectedDelivery(data.delivery)
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery detail')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formUrl,
          events: formEvents,
          enabled: formEnabled,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create webhook')
      }

      setWebhooks([data.webhook, ...webhooks])
      setShowForm(false)
      setFormUrl('')
      setFormEvents(['ai_request.completed'])
      setFormEnabled(true)
    } catch (err: any) {
      setError(err.message || 'Failed to create webhook')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete webhook')
      }

      setWebhooks(webhooks.filter((w) => w.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete webhook')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update webhook')
      }

      setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, enabled: !enabled } : w)))
    } catch (err: any) {
      setError(err.message || 'Failed to update webhook')
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/webhooks/${id}/test`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send test event')
      }

      alert('Test event sent successfully!')
      // Reload deliveries if on deliveries tab
      if (activeTab === 'deliveries') {
        loadDeliveries()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test event')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (ms: number | null) => {
    if (ms === null) return 'N/A'
    return `${ms}ms`
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Webhooks
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`${
              activeTab === 'deliveries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Deliveries
          </button>
        </nav>
      </div>

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Configure webhooks to receive events via HTTP POST.</p>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
              data-testid="btn-create-webhook"
            >
              {showForm ? 'Cancel' : 'Create Webhook'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white shadow rounded-lg p-6" data-testid="webhook-create-form">
              <h2 className="text-lg font-semibold mb-4">Create Webhook</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL</label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="https://example.com/webhook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
                  <div className="space-y-2">
                    {AVAILABLE_EVENTS.map((event) => (
                      <label key={event} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formEvents.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormEvents([...formEvents, event])
                            } else {
                              setFormEvents(formEvents.filter((ev) => ev !== event))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <label className="ml-2 text-sm text-gray-700">Enabled</label>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading || formEvents.length === 0}
                >
                  Create
                </button>
              </form>
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Events</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No webhooks configured
                    </td>
                  </tr>
                ) : (
                  webhooks.map((webhook) => (
                    <tr key={webhook.id} data-testid={`webhook-${webhook.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{webhook.url}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <span
                              key={event}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggle(webhook.id, webhook.enabled)}
                          className={`px-2 py-1 rounded text-xs ${
                            webhook.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                          disabled={loading}
                        >
                          {webhook.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleTest(webhook.id)}
                          className="text-blue-600 hover:text-blue-800"
                          disabled={loading}
                          data-testid={`btn-test-${webhook.id}`}
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleDelete(webhook.id)}
                          className="text-red-600 hover:text-red-800"
                          disabled={loading}
                          data-testid={`btn-delete-${webhook.id}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Webhook Security</h3>
            <p className="text-sm text-gray-600 mb-2">
              Webhooks are signed with HMAC SHA256. Verify the signature using the{' '}
              <code className="bg-gray-200 px-1 rounded">x-pulse-signature</code> header and your webhook secret.
            </p>
            <p className="text-sm text-gray-600">
              Signature format: <code className="bg-gray-200 px-1 rounded">HMAC_SHA256(secret, timestamp + "." + payload)</code>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Headers: <code className="bg-gray-200 px-1 rounded">x-pulse-event</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">x-pulse-id</code>,{' '}
              <code className="bg-gray-200 px-1 rounded">x-pulse-timestamp</code>
            </p>
          </div>
        </>
      )}

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <>
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook</label>
                <select
                  value={deliveryFilters.webhookId}
                  onChange={(e) => setDeliveryFilters({ ...deliveryFilters, webhookId: e.target.value, offset: 0 })}
                  className="block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  {webhooks.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.url}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={deliveryFilters.eventType}
                  onChange={(e) => setDeliveryFilters({ ...deliveryFilters, eventType: e.target.value, offset: 0 })}
                  className="block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  {AVAILABLE_EVENTS.map((event) => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={deliveryFilters.status}
                  onChange={(e) => setDeliveryFilters({ ...deliveryFilters, status: e.target.value, offset: 0 })}
                  className="block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAIL">Failed</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadDeliveries}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={loadingDeliveries}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {deliveries.length} of {deliveryTotal} deliveries
              </p>
            </div>
            {loadingDeliveries ? (
              <div className="px-6 py-4 text-center text-gray-500">Loading deliveries...</div>
            ) : deliveries.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">No deliveries found</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HTTP Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(delivery.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.eventType}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            delivery.status === 'SUCCESS'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.attempt}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {delivery.httpStatus || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(delivery.durationMs)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={delivery.error || ''}>
                          {delivery.error || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => loadDeliveryDetail(delivery.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Pagination */}
            {deliveryTotal > deliveryFilters.limit && (
              <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() =>
                    setDeliveryFilters({ ...deliveryFilters, offset: Math.max(0, deliveryFilters.offset - deliveryFilters.limit) })
                  }
                  disabled={deliveryFilters.offset === 0}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {Math.floor(deliveryFilters.offset / deliveryFilters.limit) + 1} of{' '}
                  {Math.ceil(deliveryTotal / deliveryFilters.limit)}
                </span>
                <button
                  onClick={() =>
                    setDeliveryFilters({ ...deliveryFilters, offset: deliveryFilters.offset + deliveryFilters.limit })
                  }
                  disabled={deliveryFilters.offset + deliveryFilters.limit >= deliveryTotal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Delivery Detail Modal */}
          {selectedDelivery && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Delivery Detail</h3>
                  <button
                    onClick={() => setSelectedDelivery(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Request ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedDelivery.requestId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDelivery.eventType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDelivery.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attempt</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDelivery.attempt}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">HTTP Status</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDelivery.httpStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDuration(selectedDelivery.durationMs)}</p>
                  </div>
                  {selectedDelivery.error && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Error</label>
                      <p className="mt-1 text-sm text-red-600">{selectedDelivery.error}</p>
                    </div>
                  )}
                  {selectedDelivery.payload && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payload</label>
                      <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-auto">
                        {JSON.stringify(selectedDelivery.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedDelivery.webhook && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Webhook</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{selectedDelivery.webhook.url}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

