'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface UsageSummary {
  totalMtdEUR: number
  momDeltaPercent: number
  topApp: { id: string; name: string; amountEUR: number } | null
  topProvider: { provider: string; amountEUR: number } | null
}

export default function AISpendCard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage/summary')
      .then((res) => res.json())
      .then((data) => {
        setSummary(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || !summary) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">AI Spend this month</h3>
        <Link
          href="/usage"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          View usage →
        </Link>
      </div>
      <div className="flex items-baseline">
        <p className="text-2xl font-bold text-gray-900">€{summary.totalMtdEUR.toFixed(2)}</p>
        <div className="ml-3 flex items-center">
          {summary.momDeltaPercent >= 0 ? (
            <TrendingUp className="w-4 h-4 text-red-600 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-green-600 mr-1" />
          )}
          <span className={`text-sm font-medium ${summary.momDeltaPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {summary.momDeltaPercent > 0 ? '+' : ''}
            {summary.momDeltaPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

