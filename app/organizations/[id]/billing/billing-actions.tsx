'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BillingActionsProps {
  organizationId: string
  currentPlan: string
}

export default function BillingActions({ organizationId, currentPlan }: BillingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'upgrade' | 'portal' | null>(null)
  const [error, setError] = useState('')

  const handleUpgrade = async (plan: 'PRO' | 'BUSINESS') => {
    setLoading('upgrade')
    setError('')

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organizationId, plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create checkout session')
        return
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handlePortal = async () => {
    setLoading('portal')
    setError('')

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organizationId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create portal session')
        return
      }

      // Redirect to Stripe Portal
      if (data.portalUrl) {
        window.location.href = data.portalUrl
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Subscription</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {currentPlan === 'FREE' && (
          <>
            <button
              onClick={() => handleUpgrade('PRO')}
              disabled={loading !== null}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading === 'upgrade' ? 'Loading...' : 'Upgrade to Pro'}
            </button>
            <button
              onClick={() => handleUpgrade('BUSINESS')}
              disabled={loading !== null}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {loading === 'upgrade' ? 'Loading...' : 'Upgrade to Business'}
            </button>
          </>
        )}

        {(currentPlan === 'PRO' || currentPlan === 'BUSINESS') && (
          <>
            {currentPlan === 'PRO' && (
              <button
                onClick={() => handleUpgrade('BUSINESS')}
                disabled={loading !== null}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {loading === 'upgrade' ? 'Loading...' : 'Upgrade to Business'}
              </button>
            )}
            <button
              onClick={handlePortal}
              disabled={loading !== null}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading === 'portal' ? 'Loading...' : 'Manage Billing'}
            </button>
          </>
        )}

        <Link
          href="/pricing"
          className="block w-full text-center px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View all plans →
        </Link>
      </div>
    </div>
  )
}



