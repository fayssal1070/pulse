'use client'

import { useState, useEffect } from 'react'
import { Toast, useToast } from '@/components/toast'

interface NotificationPreference {
  id: string
  emailEnabled: boolean
  telegramEnabled: boolean
  telegramChatId: string | null
  slackEnabled?: boolean
  teamsEnabled?: boolean
  integrations?: {
    slackAvailable: boolean
    teamsAvailable: boolean
    telegramAvailable: boolean
  }
}

export default function NotificationSettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testingSlack, setTestingSlack] = useState(false)
  const [testingTeams, setTestingTeams] = useState(false)
  const [testingAlert, setTestingAlert] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [teamsEnabled, setTeamsEnabled] = useState(false)
  const [integrations, setIntegrations] = useState<{
    slackAvailable: boolean
    teamsAvailable: boolean
    telegramAvailable: boolean
  } | null>(null)
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('Error loading preferences:', data.error)
          return
        }
        setPrefs(data)
        setEmailEnabled(data.emailEnabled)
        setTelegramEnabled(data.telegramEnabled)
        setTelegramChatId(data.telegramChatId || '')
        setSlackEnabled(data.slackEnabled || false)
        setTeamsEnabled(data.teamsEnabled || false)
        if (data.integrations) {
          setIntegrations(data.integrations)
        }
      })
      .catch((error) => {
        console.error('Error loading preferences:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    if (telegramEnabled && !telegramChatId.trim()) {
      showToast('Telegram Chat ID is required when Telegram is enabled', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled,
          telegramEnabled,
          telegramChatId: telegramEnabled ? telegramChatId.trim() : null,
          slackEnabled,
          teamsEnabled,
        }),
      })

      const data = await response.json()
      if (data.error) {
        showToast(`Error: ${data.error}`, 'error')
      } else {
        setPrefs(data)
        showToast('Preferences saved successfully', 'success')
      }
    } catch (error: any) {
      console.error('Error saving preferences:', error)
      showToast(`Error: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    try {
      const response = await fetch('/api/settings/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (data.error) {
        showToast(`Error: ${data.error}`, 'error')
      } else {
        showToast('Test email sent successfully! Check your inbox.', 'success')
      }
    } catch (error: any) {
      console.error('Error sending test email:', error)
      showToast(`Error: ${error.message}`, 'error')
    } finally {
      setTestingEmail(false)
    }
  }

  const handleTestTelegram = async () => {
    setTestingTelegram(true)
    try {
      const response = await fetch('/api/settings/notifications/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (data.error) {
        showToast(`Error: ${data.error}`, 'error')
      } else {
        showToast('Test Telegram message sent successfully! Check your Telegram.', 'success')
      }
    } catch (error: any) {
      console.error('Error sending test Telegram:', error)
      showToast(`Error: ${error.message}`, 'error')
    } finally {
      setTestingTelegram(false)
    }
  }

  const handleTestSlack = async () => {
    setTestingSlack(true)
    try {
      const response = await fetch('/api/admin/integrations/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', channel: 'slack' }),
      })

      const data = await response.json()
      if (data.error) {
        showToast(`Error: ${data.error}`, 'error')
      } else {
        showToast('Test Slack message sent successfully! Check your Slack channel.', 'success')
      }
    } catch (error: any) {
      console.error('Error sending test Slack:', error)
      showToast(`Error: ${error.message}`, 'error')
    } finally {
      setTestingSlack(false)
    }
  }

  const handleTestTeams = async () => {
    setTestingTeams(true)
    try {
      const response = await fetch('/api/admin/integrations/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', channel: 'teams' }),
      })

      const data = await response.json()
      if (data.error) {
        showToast(`Error: ${data.error}`, 'error')
      } else {
        showToast('Test Teams message sent successfully! Check your Teams channel.', 'success')
      }
    } catch (error: any) {
      console.error('Error sending test Teams:', error)
      showToast(`Error: ${error.message}`, 'error')
    } finally {
      setTestingTeams(false)
    }
  }

  const handleTestAlert = async () => {
    setTestingAlert(true)
    try {
      const response = await fetch('/api/settings/notifications/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (data.error) {
        showToast(`Error: ${data.error}`, 'error')
      } else {
        const channels = []
        if (data.results.inApp) channels.push('in-app')
        if (data.results.email) channels.push('email')
        if (data.results.telegram) channels.push('Telegram')
        showToast(
          `Test alert sent successfully! Check: ${channels.join(', ')}${data.results.errors.length > 0 ? ` (${data.results.errors.length} errors)` : ''}`,
          'success'
        )
      }
    } catch (error: any) {
      console.error('Error sending test alert:', error)
      showToast(`Error: ${error.message}`, 'error')
    } finally {
      setTestingAlert(false)
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
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure how you receive alerts and notifications
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Email Notifications */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Receive alert notifications via email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {testingEmail ? 'Sending...' : 'Send test email'}
                </button>
              </div>
            </div>

            {/* Telegram Notifications */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Telegram Notifications</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Receive alert notifications via Telegram
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {telegramEnabled && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="telegramChatId" className="block text-sm font-medium text-gray-700 mb-2">
                      Telegram Chat ID *
                    </label>
                    <input
                      type="text"
                      id="telegramChatId"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      To get your Chat ID: Start a conversation with your Telegram bot, then send /start. 
                      Your Chat ID will be shown in the bot's response, or use a bot like @userinfobot to get it.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={handleTestTelegram}
                      disabled={testingTelegram || !telegramChatId.trim()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {testingTelegram ? 'Sending...' : 'Send test Telegram'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Slack Notifications */}
            {integrations?.slackAvailable && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Slack Notifications</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Receive alert notifications via Slack
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slackEnabled}
                      onChange={(e) => setSlackEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleTestSlack}
                    disabled={testingSlack}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {testingSlack ? 'Sending...' : 'Send test Slack'}
                  </button>
                </div>
              </div>
            )}

            {/* Teams Notifications */}
            {integrations?.teamsAvailable && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Microsoft Teams Notifications</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Receive alert notifications via Microsoft Teams
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teamsEnabled}
                      onChange={(e) => setTeamsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleTestTeams}
                    disabled={testingTeams}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {testingTeams ? 'Sending...' : 'Send test Teams'}
                  </button>
                </div>
              </div>
            )}

            {/* Info messages for unavailable integrations */}
            {(!integrations?.slackAvailable || !integrations?.teamsAvailable) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  {!integrations?.slackAvailable && !integrations?.teamsAvailable && (
                    <>Slack and Teams notifications require admin configuration. Ask your admin to connect Slack/Teams in the{' '}
                      <a href="/admin/integrations/notifications" className="underline">integrations settings</a>.</>
                  )}
                  {!integrations?.slackAvailable && integrations?.teamsAvailable && (
                    <>Slack notifications require admin configuration. Ask your admin to connect Slack in the{' '}
                      <a href="/admin/integrations/notifications" className="underline">integrations settings</a>.</>
                  )}
                  {integrations?.slackAvailable && !integrations?.teamsAvailable && (
                    <>Teams notifications require admin configuration. Ask your admin to connect Teams in the{' '}
                      <a href="/admin/integrations/notifications" className="underline">integrations settings</a>.</>
                  )}
                </p>
              </div>
            )}

            {/* Test Alert Button */}
            <div className="pt-4 border-t">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Alert</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Send a test alert to verify all notification channels (in-app, email, Telegram) based on your preferences.
                </p>
                <button
                  onClick={handleTestAlert}
                  disabled={testingAlert}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingAlert ? 'Sending...' : 'Send test alert (in-app/email/telegram)'}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
