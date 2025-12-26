'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface EditAlertFormProps {
  organizationId: string
  alert: {
    id: string
    name: string
    type: string
    enabled: boolean
    thresholdEUR: number
    spikePercent: number | null
    lookbackDays: number
    cooldownHours: number
    notifyEmail: boolean
  }
}

export default function EditAlertForm({ organizationId, alert }: EditAlertFormProps) {
  const router = useRouter()
  const [name, setName] = useState(alert.name)
  const [type, setType] = useState<'MONTHLY_BUDGET' | 'DAILY_SPIKE'>(alert.type as 'MONTHLY_BUDGET' | 'DAILY_SPIKE')
  const [thresholdEUR, setThresholdEUR] = useState(alert.thresholdEUR.toString())
  const [spikePercent, setSpikePercent] = useState(alert.spikePercent?.toString() || '')
  const [lookbackDays, setLookbackDays] = useState(alert.lookbackDays.toString())
  const [cooldownHours, setCooldownHours] = useState(alert.cooldownHours.toString())
  const [enabled, setEnabled] = useState(alert.enabled)
  const [notifyEmail, setNotifyEmail] = useState(alert.notifyEmail)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/organizations/${organizationId}/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          thresholdEUR: parseFloat(thresholdEUR),
          spikePercent: type === 'DAILY_SPIKE' && spikePercent ? parseFloat(spikePercent) : null,
          lookbackDays: parseInt(lookbackDays) || 7,
          cooldownHours: parseInt(cooldownHours) || 24,
          enabled,
          notifyEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update alert')
        return
      }

      router.push(`/organizations/${organizationId}/alerts`)
      router.refresh()
    } catch {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Alert Name *
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

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Alert Type *
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="MONTHLY_BUDGET"
                checked={type === 'MONTHLY_BUDGET'}
                onChange={() => setType('MONTHLY_BUDGET')}
                className="mr-2"
              />
              <span>Monthly Budget</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="DAILY_SPIKE"
                checked={type === 'DAILY_SPIKE'}
                onChange={() => setType('DAILY_SPIKE')}
                className="mr-2"
              />
              <span>Daily Spike</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="thresholdEUR" className="block text-sm font-medium text-gray-700">
              Threshold (EUR) *
            </label>
            <input
              id="thresholdEUR"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={thresholdEUR}
              onChange={(e) => setThresholdEUR(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {type === 'DAILY_SPIKE' && (
            <div>
              <label htmlFor="spikePercent" className="block text-sm font-medium text-gray-700">
                Spike Percentage (%)
              </label>
              <input
                id="spikePercent"
                type="number"
                step="0.1"
                min="0.1"
                value={spikePercent}
                onChange={(e) => setSpikePercent(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {type === 'DAILY_SPIKE' && (
          <div>
            <label htmlFor="lookbackDays" className="block text-sm font-medium text-gray-700">
              Baseline Lookback (days)
            </label>
            <input
              id="lookbackDays"
              type="number"
              min="1"
              max="30"
              value={lookbackDays}
              onChange={(e) => setLookbackDays(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="cooldownHours" className="block text-sm font-medium text-gray-700">
            Cooldown Period (hours)
          </label>
          <input
            id="cooldownHours"
            type="number"
            min="1"
            value={cooldownHours}
            onChange={(e) => setCooldownHours(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Notify via email (when available)</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href={`/organizations/${organizationId}/alerts`}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Alert'}
          </button>
        </div>
      </form>
    </div>
  )
}

