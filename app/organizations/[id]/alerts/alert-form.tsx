'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AlertForm({ organizationId }: { organizationId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [thresholdEUR, setThresholdEUR] = useState('')
  const [periodDays, setPeriodDays] = useState('7')
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
          organizationId,
          name,
          thresholdEUR: parseFloat(thresholdEUR),
          periodDays: parseInt(periodDays),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create alert')
        return
      }

      setName('')
      setThresholdEUR('')
      setPeriodDays('7')
      router.refresh()
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Alert Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="thresholdEUR" className="block text-sm font-medium text-gray-700">
            Threshold (EUR)
          </label>
          <input
            id="thresholdEUR"
            type="number"
            step="0.01"
            required
            value={thresholdEUR}
            onChange={(e) => setThresholdEUR(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="periodDays" className="block text-sm font-medium text-gray-700">
            Period (days)
          </label>
          <input
            id="periodDays"
            type="number"
            required
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Alert'}
      </button>
    </form>
  )
}

