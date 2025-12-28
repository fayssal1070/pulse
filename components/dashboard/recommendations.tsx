'use client'

import Link from 'next/link'
import { Recommendation } from '@/lib/dashboard/executive'

interface RecommendationsProps {
  recommendations: Recommendation[]
}

export default function Recommendations({ recommendations }: RecommendationsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-500 text-red-800'
      case 'WARN':
        return 'bg-yellow-50 border-yellow-500 text-yellow-800'
      default:
        return 'bg-blue-50 border-blue-500 text-blue-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨'
      case 'WARN':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions & Recommendations</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No recommendations at this time</p>
          <p className="text-sm mt-2">Everything looks good!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions & Recommendations</h3>
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-4 rounded-lg border-l-4 ${getSeverityColor(rec.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{getSeverityIcon(rec.severity)}</span>
                  <h4 className="font-semibold">{rec.title}</h4>
                </div>
                <p className="text-sm opacity-90 mt-1">{rec.description}</p>
              </div>
              <Link
                href={rec.cta.href}
                className="ml-4 px-4 py-2 text-sm font-medium bg-white rounded-md hover:bg-gray-50 transition-colors"
              >
                {rec.cta.label}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

