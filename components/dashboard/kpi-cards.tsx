'use client'

import { ExecutiveKPIs } from '@/lib/dashboard/executive'

interface KPICardsProps {
  kpis: ExecutiveKPIs
}

export default function KPICards({ kpis }: KPICardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
      {/* AI Cost Today */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">AI Cost Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(kpis.aiCostToday)}
            </p>
          </div>
          <div className="text-3xl">🤖</div>
        </div>
        {!kpis.hasData && (
          <p className="text-xs text-gray-400 mt-2">No data yet</p>
        )}
      </div>

      {/* AI Cost MTD */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">AI Cost MTD</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(kpis.aiCostMTD)}
            </p>
          </div>
          <div className="text-3xl">📊</div>
        </div>
        {!kpis.hasData && (
          <p className="text-xs text-gray-400 mt-2">No data yet</p>
        )}
      </div>

      {/* AWS Cost MTD */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">AWS Cost MTD</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(kpis.awsCostMTD)}
            </p>
          </div>
          <div className="text-3xl">☁️</div>
        </div>
        {!kpis.hasData && (
          <p className="text-xs text-gray-400 mt-2">No data yet</p>
        )}
      </div>

      {/* Total MTD */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total MTD</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(kpis.totalMTD)}
            </p>
          </div>
          <div className="text-3xl">💰</div>
        </div>
        {!kpis.hasData && (
          <p className="text-xs text-gray-400 mt-2">No data yet</p>
        )}
      </div>

      {/* MoM Delta */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">MoM Change</p>
            <p className={`text-2xl font-bold mt-1 ${
              kpis.momDelta >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatPercent(kpis.momDeltaPercent)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(Math.abs(kpis.momDelta))}
            </p>
          </div>
          <div className="text-3xl">
            {kpis.momDelta >= 0 ? '📈' : '📉'}
          </div>
        </div>
        {!kpis.hasData && (
          <p className="text-xs text-gray-400 mt-2">No data yet</p>
        )}
      </div>
    </div>
  )
}

