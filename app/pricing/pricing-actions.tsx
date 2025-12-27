'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PricingActionsProps {
  plan: 'FREE' | 'PRO' | 'BUSINESS'
  user: { id: string; email: string } | null
  activeOrg: { id: string; plan: string } | null
}

export default function PricingActions({ plan, user, activeOrg }: PricingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    if (!user) {
      router.push(`/login?redirect=/pricing`)
      return
    }

    if (!activeOrg) {
      router.push('/organizations/new')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrg.id, plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to create checkout session')
        return
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (plan === 'FREE') {
    return (
      <Link
        href="/demo"
        className="w-full px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-md hover:bg-gray-200 transition-colors text-center block"
      >
        Try Demo
      </Link>
    )
  }

  if (plan === 'BUSINESS') {
    return (
      <Link
        href="/contact"
        className="w-full px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-md hover:bg-gray-200 transition-colors text-center block"
      >
        Contact Sales
      </Link>
    )
  }

  // PRO plan
  if (!user) {
    return (
      <Link
        href="/login?redirect=/pricing"
        className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors text-center block"
      >
        Get Started
      </Link>
    )
  }

  if (!activeOrg) {
    return (
      <Link
        href="/organizations/new"
        className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors text-center block"
      >
        Create Organization
      </Link>
    )
  }

  if (activeOrg.plan === plan) {
    return (
      <Link
        href={`/organizations/${activeOrg.id}/billing`}
        className="w-full px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-md hover:bg-gray-200 transition-colors text-center block"
      >
        Current Plan
      </Link>
    )
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'Loading...' : activeOrg.plan === 'FREE' ? 'Upgrade to Pro' : 'Switch to Pro'}
    </button>
  )
}

