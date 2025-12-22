'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AlertForm() {
  const router = useRouter()
  const [thresholdEUR, setThresholdEUR] = useState('')
  const [windowDays, setWindowDays] = useState('7')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholdEUR: parseFloat(thresholdEUR),
          windowDays: parseInt(windowDays) || 7,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create alert rule')
        return
      }

      setThresholdEUR('')
      setWindowDays('7')
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
        <label htmlFor="thresholdEUR" className="block text-sm font-medium text-gray-700 mb-1">
          Threshold (EUR)
        </label>
        <input
          type="number"
          id="thresholdEUR"
          step="0.01"
          min="0"
          value={thresholdEUR}
          onChange={(e) => setThresholdEUR(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="100.00"
        />
      </div>

      <div>
        <label htmlFor="windowDays" className="block text-sm font-medium text-gray-700 mb-1">
          Window (days)
        </label>
        <input
          type="number"
          id="windowDays"
          min="1"
          value={windowDays}
          onChange={(e) => setWindowDays(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Alert Rule'}
      </button>
    </form>
  )
}

