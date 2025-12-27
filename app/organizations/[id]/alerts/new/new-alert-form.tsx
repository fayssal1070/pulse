'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentMonthCosts, getDailySpikePreview } from './alert-preview'

interface NewAlertFormProps {
  organizationId: string
}

export default function NewAlertForm({ organizationId }: NewAlertFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState<'MONTHLY_BUDGET' | 'DAILY_SPIKE'>('MONTHLY_BUDGET')
  const [thresholdEUR, setThresholdEUR] = useState('')
  const [spikePercent, setSpikePercent] = useState('')
  const [lookbackDays, setLookbackDays] = useState('7')
  const [cooldownHours, setCooldownHours] = useState('24')
  const [enabled, setEnabled] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ spentMTD?: number; todayAmount?: number; baselineAverage?: number; spikePercent?: number } | null>(null)

  const handleTypeChange = (newType: 'MONTHLY_BUDGET' | 'DAILY_SPIKE') => {
    setType(newType)
    setPreview(null)
  }

  const handlePreview = async () => {
    try {
      if (type === 'MONTHLY_BUDGET') {
        const spentMTD = await getCurrentMonthCosts(organizationId)
        setPreview({ spentMTD })
      } else {
        const data = await getDailySpikePreview(organizationId, parseInt(lookbackDays) || 7)
        setPreview(data)
      }
    } catch (error) {
      console.error('Preview error:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/organizations/${organizationId}/alerts`, {
        method: 'POST',
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
        if (data.code === 'LIMIT_REACHED') {
          setError(`${data.error} Please upgrade your plan to add more alerts.`)
        } else {
          setError(data.error || 'Failed to create alert')
        }
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
            placeholder="e.g., Monthly Budget Alert"
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
                onChange={() => handleTypeChange('MONTHLY_BUDGET')}
                className="mr-2"
              />
              <span>Monthly Budget - Alert when spending reaches 50%, 80%, or 100% of monthly threshold</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="DAILY_SPIKE"
                checked={type === 'DAILY_SPIKE'}
                onChange={() => handleTypeChange('DAILY_SPIKE')}
                className="mr-2"
              />
              <span>Daily Spike - Alert when daily spending spikes above baseline or threshold</span>
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
              placeholder={type === 'MONTHLY_BUDGET' ? 'e.g., 1000' : 'e.g., 50'}
            />
            <p className="mt-1 text-xs text-gray-500">
              {type === 'MONTHLY_BUDGET'
                ? 'Monthly budget limit'
                : 'Fixed daily threshold (optional if using spike %)'}
            </p>
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
                placeholder="e.g., 50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Alert if daily spend increases by this % vs baseline
              </p>
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
            <p className="mt-1 text-xs text-gray-500">
              Number of days to calculate baseline average (default: 7)
            </p>
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
          <p className="mt-1 text-xs text-gray-500">
            Minimum hours between alert triggers (default: 24)
          </p>
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

        {/* Preview Panel */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Preview</h3>
            <button
              type="button"
              onClick={handlePreview}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Refresh Preview
            </button>
          </div>
          {preview && (
            <div className="bg-gray-50 rounded p-3 text-sm">
              {type === 'MONTHLY_BUDGET' && preview.spentMTD !== undefined && (
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">Current Month-to-Date:</span>{' '}
                    {preview.spentMTD.toFixed(2)} EUR
                  </p>
                  {thresholdEUR && (
                    <p className="text-gray-700 mt-1">
                      <span className="font-medium">Budget:</span> {parseFloat(thresholdEUR).toFixed(2)} EUR
                      {' '}
                      <span className="text-gray-500">
                        ({((preview.spentMTD / parseFloat(thresholdEUR)) * 100).toFixed(1)}%)
                      </span>
                    </p>
                  )}
                </div>
              )}
              {type === 'DAILY_SPIKE' && preview.todayAmount !== undefined && (
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">Today:</span> {preview.todayAmount.toFixed(2)} EUR
                  </p>
                  {preview.baselineAverage !== undefined && (
                    <p className="text-gray-700 mt-1">
                      <span className="font-medium">Baseline ({lookbackDays} days):</span>{' '}
                      {preview.baselineAverage.toFixed(2)} EUR
                    </p>
                  )}
                  {preview.spikePercent !== undefined && preview.baselineAverage !== undefined && preview.baselineAverage > 0 && (
                    <p className="text-gray-700 mt-1">
                      <span className="font-medium">Spike:</span>{' '}
                      {preview.spikePercent > 0 ? '+' : ''}
                      {preview.spikePercent.toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
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
            {loading ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </form>
    </div>
  )
}

