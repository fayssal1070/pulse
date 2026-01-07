'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlanInfo, PlanInfo } from '@/lib/billing/plan-client'

export default function UsageCard() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlanInfo().then((info) => {
      setPlanInfo(info)
      setLoading(false)
    })
  }, [])

  if (loading || !planInfo || !planInfo.usage) {
    return null
  }

  const usage = planInfo.usage
  const percentage = usage.quotaPercentage
  const isOverQuota = usage.isOverQuota

  return (
    <div
      data-testid="usage-card"
      className="bg-white rounded-lg shadow p-4 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-gray-600">Usage This Month</p>
          <p className={`text-2xl font-bold ${isOverQuota ? 'text-red-600' : 'text-gray-900'}`}>
            €{usage.totalSpendEUR.toFixed(2)}
          </p>
          {isOverQuota && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
              Over quota
            </span>
          )}
        </div>
        {isOverQuota && (
          <Link
            href="/billing"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            Upgrade
          </Link>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${
            percentage >= 200
              ? 'bg-red-500'
              : percentage >= 100
              ? 'bg-orange-500'
              : percentage >= 80
              ? 'bg-yellow-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 200)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-600">
        <span>Quota: €{usage.includedSpendEUR.toFixed(2)}</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      
      {isOverQuota && (
        <p className="text-xs text-red-600 mt-2">
          Overage: €{usage.overageAmountEUR.toFixed(2)} (€{usage.overageSpendEUR.toFixed(2)} × {planInfo.entitlements.overagePricePerEUR.toFixed(2)}x)
        </p>
      )}
    </div>
  )
}

