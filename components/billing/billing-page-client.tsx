'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPlanInfo, PlanInfo } from '@/lib/billing/plan-client'

interface BillingPageClientProps {
  organizationId: string
  canceled?: boolean
}

export default function BillingPageClient({ organizationId, canceled }: BillingPageClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgData, setOrgData] = useState<any>(null)
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)

  useEffect(() => {
    fetchOrgData()
    fetchPlanInfo()
  }, [organizationId])

  async function fetchPlanInfo() {
    try {
      const info = await getPlanInfo()
      setPlanInfo(info)
    } catch (err) {
      // Silent fail
    }
  }

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

      {/* Usage & Quota Section (PR30/PR31) */}
      {planInfo?.usage && (
        <div className="bg-white shadow rounded-lg p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Usage & Billing</h2>
          <p className="text-sm text-gray-600 mb-4">
            <strong>No surprise billing.</strong> You see your usage live, updated in real-time.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Included Quota</p>
              <p className="text-2xl font-bold text-gray-900">€{planInfo.usage.includedSpendEUR.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">per month</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Usage</p>
              <p className={`text-2xl font-bold ${planInfo.usage.isOverQuota ? 'text-red-600' : 'text-gray-900'}`}>
                €{planInfo.usage.totalSpendEUR.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {planInfo.usage.quotaPercentage.toFixed(1)}% of quota
              </p>
            </div>
            {planInfo.usage.isOverQuota ? (
              <div>
                <p className="text-sm text-gray-600">Estimated Overage</p>
                <p className="text-2xl font-bold text-orange-600">€{planInfo.usage.overageAmountEUR.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {planInfo.usage.overageSpendEUR.toFixed(2)}€ × {planInfo.entitlements.overagePricePerEUR.toFixed(2)}x
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-green-600">
                  €{(planInfo.usage.includedSpendEUR - planInfo.usage.totalSpendEUR).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  planInfo.usage.quotaPercentage >= 200
                    ? 'bg-red-500'
                    : planInfo.usage.quotaPercentage >= 100
                    ? 'bg-orange-500'
                    : planInfo.usage.quotaPercentage >= 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(planInfo.usage.quotaPercentage, 200)}%` }}
              />
            </div>
          </div>
          
          {planInfo.entitlements.allowOverage && planInfo.usage.isOverQuota && (
            <p className="text-xs text-gray-600 mt-3 italic">
              Usage beyond your included quota is automatically billed at the end of each month — no service interruptions.
            </p>
          )}
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
                router.push('/pricing')
              }}
              data-testid="billing-checkout"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View Pricing & Upgrade
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

