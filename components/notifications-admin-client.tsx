'use client'

import { useState, useEffect } from 'react'

interface NotificationIntegrations {
  slack: { configured: boolean; last4: string | null }
  teams: { configured: boolean; last4: string | null }
  telegram: { configured: boolean; last4: string | null }
}

interface NotificationsAdminClientProps {
  organizationId: string
}

export default function NotificationsAdminClient({ organizationId }: NotificationsAdminClientProps) {
  const [integrations, setIntegrations] = useState<NotificationIntegrations | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('')

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      const res = await fetch('/api/admin/integrations/notifications')
      const data = await res.json()
      if (res.ok) {
        setIntegrations(data)
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
    }
  }

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message)
      setError(null)
    } else {
      setError(message)
      setSuccess(null)
    }
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 5000)
  }

  const handleConnect = async (channel: 'slack' | 'teams') => {
    const webhookUrl = channel === 'slack' ? slackWebhookUrl : teamsWebhookUrl
    if (!webhookUrl) {
      showMessage('error', `${channel === 'slack' ? 'Slack' : 'Teams'} webhook URL is required`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/integrations/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', channel, webhookUrl }),
      })

      const data = await res.json()
      if (res.ok) {
        showMessage('success', `${channel === 'slack' ? 'Slack' : 'Teams'} connected successfully`)
        setSlackWebhookUrl('')
        setTeamsWebhookUrl('')
        await loadIntegrations()
      } else {
        showMessage('error', data.error || 'Failed to connect')
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (channel: 'slack' | 'teams') => {
    if (!confirm(`Are you sure you want to disconnect ${channel === 'slack' ? 'Slack' : 'Teams'}?`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/integrations/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', channel }),
      })

      const data = await res.json()
      if (res.ok) {
        showMessage('success', `${channel === 'slack' ? 'Slack' : 'Teams'} disconnected`)
        await loadIntegrations()
      } else {
        showMessage('error', data.error || 'Failed to disconnect')
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async (channel: 'slack' | 'teams') => {
    setTesting(channel)
    try {
      const res = await fetch('/api/admin/integrations/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', channel }),
      })

      const data = await res.json()
      if (res.ok) {
        showMessage('success', `Test message sent to ${channel === 'slack' ? 'Slack' : 'Teams'}`)
      } else {
        showMessage('error', data.error || 'Test failed')
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Test failed')
    } finally {
      setTesting(null)
    }
  }

  if (!integrations) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">{success}</div>
      )}

      {/* Slack Integration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Slack</h2>
        {integrations.slack.configured ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connected</p>
                <p className="text-xs text-gray-500 font-mono">...{integrations.slack.last4}</p>
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="btn-slack-test"
                  onClick={() => handleTest('slack')}
                  disabled={testing === 'slack'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {testing === 'slack' ? 'Testing...' : 'Send Test'}
                </button>
                <button
                  data-testid="btn-slack-disconnect"
                  onClick={() => handleDisconnect('slack')}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slack Webhook URL
              </label>
              <input
                data-testid="input-slack-webhook"
                type="text"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              data-testid="btn-slack-connect"
              onClick={() => handleConnect('slack')}
              disabled={loading || !slackWebhookUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Connect Slack
            </button>
          </div>
        )}
      </div>

      {/* Teams Integration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Microsoft Teams</h2>
        {integrations.teams.configured ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connected</p>
                <p className="text-xs text-gray-500 font-mono">...{integrations.teams.last4}</p>
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="btn-teams-test"
                  onClick={() => handleTest('teams')}
                  disabled={testing === 'teams'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {testing === 'teams' ? 'Testing...' : 'Send Test'}
                </button>
                <button
                  data-testid="btn-teams-disconnect"
                  onClick={() => handleDisconnect('teams')}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teams Webhook URL
              </label>
              <input
                data-testid="input-teams-webhook"
                type="text"
                value={teamsWebhookUrl}
                onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                placeholder="https://outlook.office.com/webhook/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              data-testid="btn-teams-connect"
              onClick={() => handleConnect('teams')}
              disabled={loading || !teamsWebhookUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Connect Teams
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

