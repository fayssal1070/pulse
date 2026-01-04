'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingStepAlertRulesProps {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStepAlertRules({
  organizationId,
  onComplete,
}: OnboardingStepAlertRulesProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<{ hasDailySpike: boolean; hasCurStale: boolean }>({
    hasDailySpike: false,
    hasCurStale: false,
  })

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/alerts/rules')
      const data = await res.json()
      const rules = data.rules || []
      const hasDailySpike = rules.some((r: any) => r.type === 'DAILY_SPIKE' && r.enabled)
      const hasCurStale = rules.some((r: any) => r.type === 'CUR_STALE' && r.enabled)
      setStatus({ hasDailySpike, hasCurStale })

      if (hasDailySpike && hasCurStale) {
        onComplete()
      }
    } catch (err) {
      console.error('Error checking status:', err)
    }
  }

  const handleCreateDefaultRules = async () => {
    setLoading(true)
    setError('')

    try {
      // Create DAILY_SPIKE rule
      if (!status.hasDailySpike) {
        const spikeRes = await fetch('/api/alerts/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Daily Spike Alert',
            type: 'DAILY_SPIKE',
            enabled: true,
            spikePercent: 50,
            lookbackDays: 7,
            cooldownHours: 24,
            notifyEmail: false,
          }),
        })

        if (!spikeRes.ok) {
          const data = await spikeRes.json()
          throw new Error(data.error || 'Failed to create DAILY_SPIKE rule')
        }
      }

      // Create CUR_STALE rule
      if (!status.hasCurStale) {
        const staleRes = await fetch('/api/alerts/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'CUR Data Stale Alert',
            type: 'CUR_STALE',
            enabled: true,
            thresholdEUR: null, // CUR_STALE uses days threshold, not EUR
            cooldownHours: 24,
            notifyEmail: false,
          }),
        })

        if (!staleRes.ok) {
          const data = await staleRes.json()
          throw new Error(data.error || 'Failed to create CUR_STALE rule')
        }
      }

      await checkStatus()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert rules')
    } finally {
      setLoading(false)
    }
  }

  const canContinue = status.hasDailySpike && status.hasCurStale

  return (
    <div data-testid="onboarding-step-3">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 3: Alert Rules</h2>
      <p className="text-gray-600 mb-6">
        Create 2 default alert rules: DAILY_SPIKE (50% spike detection) and CUR_STALE (2 days threshold).
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">DAILY_SPIKE:</span>{' '}
              <span className={status.hasDailySpike ? 'text-green-600' : 'text-gray-600'}>
                {status.hasDailySpike ? '✓ Created (spikePercent=50, lookbackDays=7)' : 'Not created'}
              </span>
            </div>
            <div>
              <span className="font-medium">CUR_STALE:</span>{' '}
              <span className={status.hasCurStale ? 'text-green-600' : 'text-gray-600'}>
                {status.hasCurStale ? '✓ Created (threshold: 2 days)' : 'Not created'}
              </span>
            </div>
          </div>
        </div>

        {/* Create Default Rules Button */}
        <div className="border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create Default Alert Rules</h3>
          <p className="text-sm text-gray-600 mb-4">
            This will create both required alert rules with default settings.
          </p>
          <button
            onClick={handleCreateDefaultRules}
            disabled={loading || canContinue}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : canContinue ? 'Rules Created ✓' : 'Create Default Rules'}
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onComplete}
          disabled={!canContinue}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

