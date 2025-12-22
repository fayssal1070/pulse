'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Organization = {
  id: string
  name: string
  telegramChatId: string | null
  telegramBotToken: string | null
}

export default function TelegramForm({ organization }: { organization: Organization }) {
  const router = useRouter()
  const [botToken, setBotToken] = useState(organization.telegramBotToken || '')
  const [chatId, setChatId] = useState(organization.telegramChatId || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setBotToken(organization.telegramBotToken || '')
    setChatId(organization.telegramChatId || '')
    setSuccess(false)
  }, [organization.id, organization.telegramBotToken, organization.telegramChatId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch(`/api/organizations/${organization.id}/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken: botToken.trim() || null,
          telegramChatId: chatId.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update Telegram configuration')
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="botToken" className="block text-sm font-medium text-gray-700 mb-2">
          Telegram Bot Token
        </label>
        <input
          type="text"
          id="botToken"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
        />
        <p className="mt-1 text-sm text-gray-500">
          Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">@BotFather</a>
        </p>
      </div>

      <div>
        <label htmlFor="chatId" className="block text-sm font-medium text-gray-700 mb-2">
          Telegram Chat ID
        </label>
        <input
          type="text"
          id="chatId"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="123456789"
        />
        <p className="mt-1 text-sm text-gray-500">
          Get your chat ID by messaging <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">@userinfobot</a> or your bot
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
          Telegram configuration updated successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save Configuration'}
      </button>
    </form>
  )
}

