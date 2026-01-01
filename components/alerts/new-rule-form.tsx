'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RuleType = 'DAILY_SPIKE' | 'TOP_CONSUMER_SHARE' | 'CUR_STALE' | 'NO_BUDGETS' | 'BUDGET_STATUS'

export default function NewRuleForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<RuleType>('DAILY_SPIKE')
  const [enabled, setEnabled] = useState(true)
  const [thresholdEUR, setThresholdEUR] = useState('')
  const [spikePercent, setSpikePercent] = useState('')
  const [topSharePercent, setTopSharePercent] = useState('')
  const [lookbackDays, setLookbackDays] = useState('7')
  const [providerFilter, setProviderFilter] = useState('')
  const [cooldownHours, setCooldownHours] = useState('24')
  const [notifyEmail, setNotifyEmail] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const body: any = {
        name,
        type,
        enabled,
        lookbackDays: parseInt(lookbackDays) || 7,
        cooldownHours: parseInt(cooldownHours) || 24,
        notifyEmail,
      }

      // Type-specific fields
      if (type === 'DAILY_SPIKE') {
        if (!spikePercent) {
          setError('Spike percent is required for Daily Spike')
          setLoading(false)
          return
        }
        body.spikePercent = parseFloat(spikePercent)
        if (thresholdEUR) body.thresholdEUR = parseFloat(thresholdEUR)
      } else if (type === 'TOP_CONSUMER_SHARE') {
        if (!topSharePercent) {
          setError('Top share percent is required for Top Consumer Share')
          setLoading(false)
          return
        }
        body.topSharePercent = parseFloat(topSharePercent)
      }

      if (providerFilter) {
        body.providerFilter = providerFilter
      }

      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create rule')
      }

      router.push('/alerts')
    } catch (err: any) {
      setError(err.message || 'Failed to create alert rule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6" data-testid="alerts-new-rule-form">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rule Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            data-testid="alerts-rule-name"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RuleType)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            data-testid="alerts-rule-type"
          >
            <option value="DAILY_SPIKE">Daily Spike</option>
            <option value="TOP_CONSUMER_SHARE">Top Consumer Share</option>
            <option value="CUR_STALE">CUR Stale</option>
            <option value="NO_BUDGETS">No Budgets</option>
            <option value="BUDGET_STATUS">Budget Status</option>
          </select>
        </div>

        {/* DAILY_SPIKE fields */}
        {type === 'DAILY_SPIKE' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spike Percent <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={spikePercent}
                onChange={(e) => setSpikePercent(e.target.value)}
                required
                min="1"
                max="1000"
                placeholder="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                data-testid="alerts-rule-spike-percent"
              />
              <p className="text-xs text-gray-500 mt-1">Alert when daily cost spikes by this % vs baseline</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lookback Days</label>
              <input
                type="number"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(e.target.value)}
                min="1"
                max="90"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                data-testid="alerts-rule-lookback-days"
              />
              <p className="text-xs text-gray-500 mt-1">Number of days to calculate baseline average</p>
            </div>
          </>
        )}

        {/* TOP_CONSUMER_SHARE fields */}
        {type === 'TOP_CONSUMER_SHARE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Top Share Percent <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={topSharePercent}
              onChange={(e) => setTopSharePercent(e.target.value)}
              required
              min="1"
              max="100"
              placeholder="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              data-testid="alerts-rule-top-share-percent"
            />
            <p className="text-xs text-gray-500 mt-1">Alert when top consumer exceeds this % of MTD costs</p>
          </div>
        )}

        {/* Provider Filter */}
        {type !== 'NO_BUDGETS' && type !== 'CUR_STALE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider Filter</label>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              data-testid="alerts-rule-provider-filter"
            >
              <option value="">All Providers</option>
              <option value="AWS">AWS</option>
              <option value="AI">AI</option>
              <option value="TOTAL">Total</option>
            </select>
          </div>
        )}

        {/* Cooldown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cooldown Hours</label>
          <input
            type="number"
            value={cooldownHours}
            onChange={(e) => setCooldownHours(e.target.value)}
            min="1"
            max="168"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            data-testid="alerts-rule-cooldown"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum hours between alerts (prevents spam)</p>
        </div>

        {/* Enabled */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            data-testid="alerts-rule-enabled"
          />
          <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
            Enable this rule
          </label>
        </div>

        {/* Notify Email */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="notifyEmail"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            data-testid="alerts-rule-notify-email"
          />
          <label htmlFor="notifyEmail" className="ml-2 text-sm text-gray-700">
            Send email notifications (also respects user preferences)
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="alerts-rule-submit"
          >
            {loading ? 'Creating...' : 'Create Rule'}
          </button>
        </div>
      </div>
    </form>
  )
}

