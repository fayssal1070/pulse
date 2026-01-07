'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface BillingPageClientProps {
  organizationId: string
  canceled?: boolean
}

export default function BillingPageClient({ organizationId, canceled }: BillingPageClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgData, setOrgData] = useState<any>(null)

  useEffect(() => {
    fetchOrgData()
  }, [organizationId])

  async function fetchOrgData() {
    try {
      const res = await fetch(`/api/organizations/${organizationId}`)
      if (!res.ok) throw new Error('Failed to fetch organization')
      const data = await res.json()
      setOrgData(data.organization)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleCheckout(plan: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: 'monthly' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const plan = orgData?.plan || 'STARTER'
  const status = orgData?.subscriptionStatus || null
  const periodEnd = orgData?.currentPeriodEnd
  const cancelAtPeriodEnd = orgData?.cancelAtPeriodEnd || false

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900" data-testid="billing-page-title">
          Billing & Subscription
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your subscription and billing information
        </p>
      </div>

      {canceled && (
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">Checkout was canceled.</p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Plan</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Plan:</span>
            <span className="ml-2 text-sm font-semibold text-gray-900" data-testid="billing-plan">
              {plan}
            </span>
          </div>

          {status && (
            <div>
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <span className="ml-2 text-sm font-semibold text-gray-900" data-testid="billing-status">
                {status}
              </span>
            </div>
          )}

          {periodEnd && (
            <div>
              <span className="text-sm font-medium text-gray-500">Renewal Date:</span>
              <span className="ml-2 text-sm text-gray-900">
                {new Date(periodEnd).toLocaleDateString()}
              </span>
            </div>
          )}

          {cancelAtPeriodEnd && (
            <div className="rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                Your subscription will be canceled at the end of the current period.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
        <div className="space-y-3">
          <div>
            <button
              onClick={() => {
                const planSelect = window.prompt('Select plan:\n1. STARTER\n2. PRO\n3. BUSINESS')
                if (planSelect) {
                  const planMap: Record<string, string> = {
                    '1': 'STARTER',
                    '2': 'PRO',
                    '3': 'BUSINESS',
                  }
                  const selectedPlan = planMap[planSelect.trim()]
                  if (selectedPlan) {
                    handleCheckout(selectedPlan)
                  }
                }
              }}
              disabled={loading}
              data-testid="billing-checkout"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upgrade / Change Plan'}
            </button>
          </div>

          {orgData?.stripeCustomerId && (
            <div>
              <button
                onClick={handlePortal}
                disabled={loading}
                data-testid="billing-portal"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Manage Billing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

