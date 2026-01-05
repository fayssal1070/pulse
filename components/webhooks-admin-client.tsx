'use client'

import { useState } from 'react'

interface Webhook {
  id: string
  url: string
  enabled: boolean
  events: string[]
  createdAt: string
  updatedAt: string
}

interface WebhooksAdminClientProps {
  organizationId: string
  initialWebhooks: Webhook[]
}

const AVAILABLE_EVENTS = ['cost_event.created', 'alert_event.triggered', 'ai_request.completed'] as const

export default function WebhooksAdminClient({ organizationId, initialWebhooks }: WebhooksAdminClientProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(initialWebhooks)
  const [showForm, setShowForm] = useState(false)
  const [formUrl, setFormUrl] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>(['ai_request.completed'])
  const [formEnabled, setFormEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send test event')
      }

      alert('Test event sent successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to send test event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

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
                          setFormEvents(formEvents.filter((e) => e !== event))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="formEnabled"
                checked={formEnabled}
                onChange={(e) => setFormEnabled(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="formEnabled" className="text-sm font-medium text-gray-700">
                Enabled
              </label>
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
        <p className="text-sm text-gray-600">
          Webhooks are signed with HMAC SHA256. Verify the signature using the{' '}
          <code className="bg-gray-200 px-1 rounded">x-pulse-signature</code> header and your webhook secret.
        </p>
      </div>
    </div>
  )
}

