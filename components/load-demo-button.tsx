'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LoadDemoButtonProps {
  organizationId: string
}

export default function LoadDemoButton({ organizationId }: LoadDemoButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLoad = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/organizations/${organizationId}/demo/load`, {
        method: 'POST',
      })

      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to load demo data')
      }
    } catch {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Data Yet
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Get started by loading demonstration data to see how PULSE works.
        </p>
        <button
          onClick={handleLoad}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading Demo Data...' : 'Load Demo Data'}
        </button>
      </div>
    </div>
  )
}

