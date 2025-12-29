'use client'

import { useState, useEffect } from 'react'
import { Toast, useToast } from '@/components/toast'

interface NotificationPreference {
  id: string
  emailEnabled: boolean
  telegramEnabled: boolean
  telegramChatId: string | null
}

export default function NotificationSettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
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
