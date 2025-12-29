'use client'

import { useState, useEffect } from 'react'

interface TelegramIntegrationStatus {
  configured: boolean
  last4: string | null
  createdAt: string | null
  updatedAt: string | null
}

export default function TelegramIntegrationForm({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<TelegramIntegrationStatus | null>(null)
  const [botToken, setBotToken] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
  }, [orgId])

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/admin/integrations/telegram')
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setStatus(data)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetToken = async () => {
    if (!botToken.trim()) {
      setError('Bot token is required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/integrations/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: botToken.trim() }),
      })

      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setStatus({ ...status!, configured: true, last4: data.last4, updatedAt: new Date().toISOString() })
        setBotToken('')
        setShowTokenInput(false)
        alert('Telegram bot token configured successfully!')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveToken = async () => {
    if (!confirm('Are you sure you want to remove the Telegram bot token? This will disable Telegram notifications.')) {
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/integrations/telegram', {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setStatus({ ...status!, configured: false, last4: null, updatedAt: new Date().toISOString() })
        alert('Telegram bot token removed successfully')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading...</p>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Telegram Bot Integration</h3>
      <p className="text-sm text-gray-500">
        Configure a Telegram bot to send alert notifications. The bot token will be encrypted and stored securely.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Status */}
      <div className="bg-gray-50 rounded-md p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Status</p>
            <p className="text-sm text-gray-500 mt-1">
              {status?.configured ? (
                <>Configured (last 4: {status.last4 || 'N/A'})</>
              ) : (
                'Not configured'
              )}
            </p>
            {status?.updatedAt && (
              <p className="text-xs text-gray-400 mt-1">
                Last updated: {new Date(status.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Token Input */}
      {showTokenInput && (
        <div className="border border-gray-200 rounded-md p-4 space-y-4">
          <div>
            <label htmlFor="botToken" className="block text-sm font-medium text-gray-700 mb-2">
              Telegram Bot Token
            </label>
            <input
              type="password"
              id="botToken"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              Get your bot token from @BotFather on Telegram. Format: <code className="bg-gray-100 px-1 rounded">123456789:ABCdefGHIjklMNOpqrsTUVwxyz</code>
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSetToken}
              disabled={saving || !botToken.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Token'}
            </button>
            <button
              onClick={() => {
                setShowTokenInput(false)
                setBotToken('')
                setError(null)
              }}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!showTokenInput && (
        <div className="flex space-x-2">
          {!status?.configured ? (
            <button
              onClick={() => setShowTokenInput(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Configure Bot Token
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowTokenInput(true)}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Update Token
              </button>
              <button
                onClick={handleRemoveToken}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Remove Token
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

