'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UsageSummary {
  totalMtdEUR: number
  momDeltaPercent: number
  topApp: { id: string; name: string; amountEUR: number } | null
  topProvider: { provider: string; amountEUR: number } | null
}

interface BillingPreviewClientProps {
  organizationId: string
}

/**
 * Simple billing preview with flat tier pricing
 * Option 1: Flat tiers based on usage
 */
function calculatePulseFee(usageEUR: number): { tier: string; feeEUR: number; description: string } {
  // Simple tier structure:
  // Starter: €0-100 usage -> 5% fee, capped at €10
  // Pro: €100-1000 usage -> 3% fee, capped at €50
  // Business: €1000+ usage -> 1.5% fee, no cap

  if (usageEUR < 100) {
    return {
      tier: 'Starter',
      feeEUR: Math.min(usageEUR * 0.05, 10),
      description: '5% of usage, capped at €10',
    }
  } else if (usageEUR < 1000) {
    return {
      tier: 'Pro',
      feeEUR: Math.min(usageEUR * 0.03, 50),
      description: '3% of usage, capped at €50',
    }
  } else {
    return {
      tier: 'Business',
      feeEUR: usageEUR * 0.015,
      description: '1.5% of usage, no cap',
    }
  }
}

export default function BillingPreviewClient({ organizationId }: BillingPreviewClientProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      const res = await fetch('/api/usage/summary')
      if (!res.ok) throw new Error('Failed to load usage summary')
      const data = await res.json()
      setSummary(data)
    } catch (err) {
      console.error('Failed to load summary:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading billing preview...</div>
  }

  if (!summary) {
    return <div className="text-center py-8 text-red-600">Failed to load usage data</div>
  }

  const fee = calculatePulseFee(summary.totalMtdEUR)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Billing Preview</h1>
        <p className="text-sm text-gray-600 mt-2">This is a preview, not an invoice.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Usage (Month to Date)</h2>
        <div className="mb-4" data-testid="billing-preview-usage">
          <p className="text-3xl font-bold text-gray-900">€{summary.totalMtdEUR.toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-1">
            {summary.momDeltaPercent > 0 ? '+' : ''}
            {summary.momDeltaPercent.toFixed(1)}% vs last month
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pulse Fee Estimate</h2>
        <div className="mb-4" data-testid="billing-preview-estimate">
          <div className="flex items-baseline mb-2">
            <p className="text-3xl font-bold text-gray-900">€{fee.feeEUR.toFixed(2)}</p>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">{fee.tier}</span>
          </div>
          <p className="text-sm text-gray-600">{fee.description}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            <strong>Total estimated:</strong> €{(summary.totalMtdEUR + fee.feeEUR).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This is a preview calculation. Actual billing may vary based on your subscription plan.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/usage"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          View Usage Details
        </Link>
        <Link
          href="/admin/subscription"
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
        >
          Change Plan
        </Link>
      </div>
    </div>
  )
}

