'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingStepNotificationsProps {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStepNotifications({
  organizationId,
  onComplete,
}: OnboardingStepNotificationsProps) {
  const router = useRouter()
  const [inAppEnabled, setInAppEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasPreferences, setHasPreferences] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/settings/notifications')
      if (res.ok) {
        const data = await res.json()
        setHasPreferences(!!data.id)
        if (data.id) {
          setInAppEnabled(true) // In-App is always enabled if preferences exist
          setEmailEnabled(data.emailEnabled || false)
          setTelegramEnabled(data.telegramEnabled || false)
          setTelegramChatId(data.telegramChatId || '')
        }
      }
    } catch (err) {
      console.error('Error checking status:', err)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (telegramEnabled && !telegramChatId.trim()) {
      setError('Telegram Chat ID is required when Telegram is enabled')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled,
          telegramEnabled: telegramEnabled && telegramChatId.trim() ? telegramEnabled : false,
          telegramChatId: telegramEnabled && telegramChatId.trim() ? telegramChatId.trim() : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save preferences')
      }

      setHasPreferences(true)
      await checkStatus()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="onboarding-step-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 4: Notifications</h2>
      <p className="text-gray-600 mb-6">
        Configure your notification preferences. In-App notifications are always enabled.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            {/* In-App (always enabled) */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">In-App Notifications</label>
                <p className="text-xs text-gray-500 mt-1">Always enabled</p>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 font-medium">✓ Enabled</span>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="email-enabled" className="text-sm font-medium text-gray-900">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-500 mt-1">Receive alerts via email</p>
              </div>
              <input
                id="email-enabled"
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Telegram */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="telegram-enabled" className="text-sm font-medium text-gray-900">
                    Telegram Notifications
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Receive alerts via Telegram (if configured)</p>
                </div>
                <input
                  id="telegram-enabled"
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              {telegramEnabled && (
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Telegram Chat ID (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={!hasPreferences}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run end-to-end test →
          </button>
        </div>
      </form>
    </div>
  )
}

