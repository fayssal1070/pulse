'use client'

import { useState } from 'react'
import { DailyTrendPoint } from '@/lib/dashboard/executive'

interface TrendChartProps {
  data: DailyTrendPoint[]
}

export default function TrendChart({ data }: TrendChartProps) {
  const [filter, setFilter] = useState<'total' | 'aws' | 'ai'>('total')

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Daily Cost Trend (30 days)</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => 
    filter === 'total' ? d.total :
    filter === 'aws' ? d.aws : d.ai
  ))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Daily Cost Trend (30 days)</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('total')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'total'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Total
          </button>
          <button
            onClick={() => setFilter('aws')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'aws'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            AWS
          </button>
          <button
            onClick={() => setFilter('ai')}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === 'ai'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            AI
          </button>
        </div>
      </div>
      <div className="h-64 relative">
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = maxValue * ratio
            const y = 100 - (ratio * 100)
            return (
              <g key={ratio}>
                <line
                  x1="0"
                  y1={`${y}%`}
                  x2="100%"
                  y2={`${y}%`}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x="0"
                  y={`${y}%`}
                  fontSize="10"
                  fill="#6b7280"
                  dy="0.35em"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            )
          })}
          {/* Chart area */}
          <g transform="translate(40, 0)">
            {data.map((point, idx) => {
              const value = filter === 'total' ? point.total : filter === 'aws' ? point.aws : point.ai
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0
              const x = (idx / (data.length - 1 || 1)) * (100 - 5) // Leave some margin
              const barWidth = (100 / data.length) * 0.8
              const color = filter === 'total' ? '#3b82f6' : filter === 'aws' ? '#f97316' : '#9333ea'
              
              return (
                <g key={point.date}>
                  <rect
                    x={`${x}%`}
                    y={`${100 - height}%`}
                    width={`${barWidth}%`}
                    height={`${height}%`}
                    fill={color}
                    opacity="0.7"
                    className="hover:opacity-100 transition-opacity"
                  />
                  {idx % 5 === 0 && (
                    <text
                      x={`${x + barWidth / 2}%`}
                      y="100%"
                      fontSize="9"
                      fill="#6b7280"
                      textAnchor="middle"
                      dy="1em"
                    >
                      {formatDate(point.date)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <div className="mt-4 text-sm text-gray-500 text-center">
        {formatCurrency(
          data.reduce((sum, p) => sum + (filter === 'total' ? p.total : filter === 'aws' ? p.aws : p.ai), 0)
        )} total in period
      </div>
    </div>
  )
}

