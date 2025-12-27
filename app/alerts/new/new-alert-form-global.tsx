'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  role: string
}

interface NewAlertFormGlobalProps {
  organizations: Organization[]
  defaultOrgId: string | null
}

export default function NewAlertFormGlobal({ organizations, defaultOrgId }: NewAlertFormGlobalProps) {
  const router = useRouter()
  const [selectedOrgId, setSelectedOrgId] = useState<string>(defaultOrgId || organizations[0]?.id || '')
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
    if (!selectedOrgId) {
      setError('Please select an organization first')
      return
    }

    try {
      if (type === 'MONTHLY_BUDGET') {
        const res = await fetch(`/api/organizations/${selectedOrgId}/alerts/preview/monthly`)
        const data = await res.json()
        setPreview({ spentMTD: data.spentMTD || 0 })
      } else {
        const res = await fetch(`/api/organizations/${selectedOrgId}/alerts/preview/daily-spike?lookbackDays=${lookbackDays}`)
        const data = await res.json()
        setPreview({
          todayAmount: data.todayAmount || 0,
          baselineAverage: data.baselineAverage || 0,
          spikePercent: data.spikePercent || 0,
        })
      }
    } catch (error) {
      console.error('Preview error:', error)
      setError('Failed to load preview')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedOrgId) {
      setError('Please select an organization')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}/alerts`, {
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

      router.push('/alerts')
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

        {/* Organization selector */}
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
            Organization *
          </label>
          <select
            id="organization"
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value)
              setPreview(null)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select an organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Alert Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Monthly Budget Alert"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Alert Type *
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as 'MONTHLY_BUDGET' | 'DAILY_SPIKE')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="MONTHLY_BUDGET">Monthly Budget</option>
            <option value="DAILY_SPIKE">Daily Spike</option>
          </select>
        </div>

        {type === 'MONTHLY_BUDGET' ? (
          <>
            <div>
              <label htmlFor="thresholdEUR" className="block text-sm font-medium text-gray-700">
                Monthly Budget (EUR) *
              </label>
              <input
                id="thresholdEUR"
                type="number"
                step="0.01"
                min="0"
                value={thresholdEUR}
                onChange={(e) => setThresholdEUR(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="1000.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Alerts will trigger at 50%, 80%, and 100% of this budget
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="spikePercent" className="block text-sm font-medium text-gray-700">
                Spike Percentage (%) *
              </label>
              <input
                id="spikePercent"
                type="number"
                step="0.1"
                min="0"
                value={spikePercent}
                onChange={(e) => setSpikePercent(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Alert when daily spend increases by this percentage vs baseline
              </p>
            </div>
            <div>
              <label htmlFor="lookbackDays" className="block text-sm font-medium text-gray-700">
                Lookback Days
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
                Number of days to use for baseline calculation (default: 7)
              </p>
            </div>
            <div>
              <label htmlFor="thresholdEUR" className="block text-sm font-medium text-gray-700">
                Fixed Threshold (EUR) (Optional)
              </label>
              <input
                id="thresholdEUR"
                type="number"
                step="0.01"
                min="0"
                value={thresholdEUR}
                onChange={(e) => setThresholdEUR(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="100.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Also trigger if daily spend exceeds this amount
              </p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="cooldownHours" className="block text-sm font-medium text-gray-700">
            Cooldown (hours)
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
            Minimum time between alert triggers (default: 24 hours)
          </p>
        </div>

        <div className="flex items-center">
          <input
            id="enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
            Enable alert immediately
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="notifyEmail"
            type="checkbox"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="notifyEmail" className="ml-2 block text-sm text-gray-700">
            Send email notifications (if configured)
          </label>
        </div>

        {/* Preview section */}
        {selectedOrgId && (
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
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                {type === 'MONTHLY_BUDGET' && preview.spentMTD !== undefined && (
                  <div>
                    <span className="text-gray-600">Current month-to-date spend: </span>
                    <span className="font-medium">{preview.spentMTD.toFixed(2)} EUR</span>
                  </div>
                )}
                {type === 'DAILY_SPIKE' && (
                  <>
                    <div>
                      <span className="text-gray-600">Today's spend: </span>
                      <span className="font-medium">{preview.todayAmount?.toFixed(2) || '0.00'} EUR</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Baseline average ({lookbackDays} days): </span>
                      <span className="font-medium">{preview.baselineAverage?.toFixed(2) || '0.00'} EUR</span>
                    </div>
                    {preview.spikePercent !== undefined && (
                      <div>
                        <span className="text-gray-600">Current spike: </span>
                        <span className="font-medium">{preview.spikePercent.toFixed(1)}%</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Link
            href="/alerts"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !selectedOrgId}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </form>
    </div>
  )
}

