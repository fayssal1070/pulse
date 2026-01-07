'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchJson } from '@/lib/http/fetch-json'

interface SeatsInfo {
  used: number
  limit: number
  available: number
  enforcement: boolean
}

export default function SeatsCard() {
  const [seatsInfo, setSeatsInfo] = useState<SeatsInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson<SeatsInfo>('/api/billing/seats')
      .then((info) => {
        setSeatsInfo(info)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading || !seatsInfo) {
    return null
  }

  const isAtLimit = seatsInfo.available <= 0
  const percentage = seatsInfo.limit > 0 ? (seatsInfo.used / seatsInfo.limit) * 100 : 0

  return (
    <div
      data-testid="seats-card"
      className="bg-white rounded-lg shadow p-4 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-gray-600">Team Seats</p>
          <p className="text-2xl font-bold text-gray-900">
            {seatsInfo.used} / {seatsInfo.limit}
          </p>
          {isAtLimit && (
            <p className="text-xs text-red-600 mt-1">Seat limit reached</p>
          )}
        </div>
        {isAtLimit && (
          <Link
            href="/billing"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            Upgrade
          </Link>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            isAtLimit ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {seatsInfo.available > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {seatsInfo.available} seat{seatsInfo.available !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  )
}

