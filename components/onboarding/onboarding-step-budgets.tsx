'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingStepBudgetsProps {
  organizationId: string
  onComplete: () => void
}

export default function OnboardingStepBudgets({
  organizationId,
  onComplete,
}: OnboardingStepBudgetsProps) {
  const router = useRouter()
  const [budgetType, setBudgetType] = useState<'APP' | 'ORG'>('APP')
  const [appId, setAppId] = useState('')
  const [amountEur, setAmountEur] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apps, setApps] = useState<Array<{ id: string; name: string }>>([])
  const [status, setStatus] = useState<{ hasAppBudget: boolean; hasOrgBudget: boolean }>({
    hasAppBudget: false,
    hasOrgBudget: false,
  })

  useEffect(() => {
    checkStatus()
    loadApps()
  }, [])

  const loadApps = async () => {
    try {
      const res = await fetch('/api/directory/apps')
      const data = await res.json()
      setApps(data.apps || [])
      if (data.apps?.length > 0 && !appId) {
        setAppId(data.apps[0].id)
      }
    } catch (err) {
      console.error('Error loading apps:', err)
    }
  }

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/budgets')
      const data = await res.json()
      const budgets = data.budgets || []
      const hasAppBudget = budgets.some((b: any) => b.scopeType === 'APP' && b.enabled)
      const hasOrgBudget = budgets.some((b: any) => b.scopeType === 'ORG' && b.enabled)
      setStatus({ hasAppBudget, hasOrgBudget })

      if (hasAppBudget || hasOrgBudget) {
        onComplete()
      }
    } catch (err) {
      console.error('Error checking status:', err)
    }
  }

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amountEur || parseFloat(amountEur) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (budgetType === 'APP' && !appId) {
      setError('Please select an app')
      return
    }

    setLoading(true)
    setError('')

    try {
      const budgetData: any = {
        name: budgetType === 'APP' ? `App Budget - ${apps.find((a) => a.id === appId)?.name}` : 'Organization Budget',
        scopeType: budgetType,
        period: 'MONTHLY',
        amountEur: parseFloat(amountEur),
        alertThresholdPct: 80,
        enabled: true,
      }

      if (budgetType === 'APP') {
        budgetData.scopeId = appId
      }

      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create budget')
      }

      await checkStatus()
      router.refresh()
      setAmountEur('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget')
    } finally {
      setLoading(false)
    }
  }

  const canContinue = status.hasAppBudget || status.hasOrgBudget

  return (
    <div data-testid="onboarding-step-2">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 2: Budgets</h2>
      <p className="text-gray-600 mb-6">
        Create an APP budget (prioritaire) or an ORG budget if you prefer organization-wide tracking.
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
              <span className="font-medium">APP Budget:</span>{' '}
              <span className={status.hasAppBudget ? 'text-green-600' : 'text-gray-600'}>
                {status.hasAppBudget ? '✓ Created' : 'Not created'}
              </span>
            </div>
            <div>
              <span className="font-medium">ORG Budget:</span>{' '}
              <span className={status.hasOrgBudget ? 'text-green-600' : 'text-gray-600'}>
                {status.hasOrgBudget ? '✓ Created' : 'Not created'}
              </span>
            </div>
          </div>
        </div>

        {/* Create Budget Form */}
        <form onSubmit={handleCreateBudget} className="border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Type
              </label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as 'APP' | 'ORG')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="APP">APP Budget (Prioritaire)</option>
                <option value="ORG">ORG Budget</option>
              </select>
            </div>

            {budgetType === 'APP' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select App
                </label>
                <select
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select an app...</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Budget Amount (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                placeholder="e.g., 1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !amountEur || (budgetType === 'APP' && !appId)}
              className="w-full px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Budget'}
            </button>
          </div>
        </form>
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

