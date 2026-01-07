'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlanInfo, PlanInfo } from '@/lib/billing/plan-client'

export default function PlanCard() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlanInfo().then((info) => {
      setPlanInfo(info)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return null
  }

  if (!planInfo) {
    return null
  }

  const planColors: Record<string, string> = {
    STARTER: 'bg-gray-100 text-gray-800 border-gray-300',
    PRO: 'bg-blue-100 text-blue-800 border-blue-300',
    BUSINESS: 'bg-purple-100 text-purple-800 border-purple-300',
  }

  const planColor = planColors[planInfo.plan] || planColors.STARTER

  return (
    <div
      data-testid="plan-card"
      className="bg-white rounded-lg shadow p-4 border border-gray-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Current Plan</p>
          <p className={`mt-1 text-lg font-semibold ${planColor.includes('text-') ? planColor.split(' ')[1] : 'text-gray-800'}`}>
            {planInfo.plan}
          </p>
          {planInfo.status && (
            <p className="text-xs text-gray-500 mt-1">
              Status: <span className="capitalize">{planInfo.status}</span>
            </p>
          )}
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
        >
          {planInfo.plan === 'STARTER' ? 'Upgrade' : 'View Plans'}
        </Link>
      </div>
    </div>
  )
}

