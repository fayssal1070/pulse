'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DemoBannerProps {
  organizationId: string
}

export default function DemoBanner({ organizationId }: DemoBannerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset the demo data? This will delete all cost records, alert rules, and budget.')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/organizations/${organizationId}/demo/reset`, {
        method: 'POST',
      })

      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to reset demo data')
      }
    } catch {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-yellow-700">
            <span className="font-semibold">Demo Mode:</span> You are viewing demonstration data. This is not real cost information.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={loading}
          className="ml-4 px-4 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Demo'}
        </button>
      </div>
    </div>
  )
}

