'use client'

import { useState } from 'react'

interface OnboardingStep3Props {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStep3({ organizationId, onComplete }: OnboardingStep3Props) {
  const [budgetMonthlyEUR, setBudgetMonthlyEUR] = useState('')
  const [alertThresholdEUR, setAlertThresholdEUR] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create budget
      if (budgetMonthlyEUR) {
        const budgetRes = await fetch(`/api/organizations/${organizationId}/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ budgetMonthlyEUR: parseFloat(budgetMonthlyEUR) }),
        })

        if (!budgetRes.ok) {
          const data = await budgetRes.json()
          throw new Error(data.error || 'Failed to set budget')
        }
      }

      // Create alert
      if (alertThresholdEUR) {
        const alertRes = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thresholdEUR: parseFloat(alertThresholdEUR),
            windowDays: 7,
          }),
        })

        if (!alertRes.ok) {
          const data = await alertRes.json()
          throw new Error(data.error || 'Failed to create alert')
        }
      }

      // Mark onboarding as complete
      const completeRes = await fetch(`/api/organizations/${organizationId}/onboarding/complete`, {
        method: 'POST',
      })

      if (!completeRes.ok) {
        throw new Error('Failed to complete onboarding')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 3: Set Budget & Alerts</h2>
      <p className="text-gray-600 mb-6">
        Configure your monthly budget and set up alerts to monitor your cloud costs.
      </p>

      <form onSubmit={handleComplete} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Monthly Budget */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Budget (Optional)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Budget (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={budgetMonthlyEUR}
              onChange={(e) => setBudgetMonthlyEUR(e.target.value)}
              placeholder="e.g., 1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Set a monthly spending limit to track your budget.
            </p>
          </div>
        </div>

        {/* Alert Threshold */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Threshold (Optional)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert When Spending Exceeds (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={alertThresholdEUR}
              onChange={(e) => setAlertThresholdEUR(e.target.value)}
              placeholder="e.g., 500"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Get notified when your spending exceeds this amount in a 7-day period.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Completing Setup...' : 'Complete Setup & Go to Dashboard'}
        </button>
      </form>
    </div>
  )
}

