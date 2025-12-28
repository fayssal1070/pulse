'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SyncCurButtonProps {
  orgId: string
}

export default function SyncCurButton({ orgId }: SyncCurButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/aws/cur/sync-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'CUR sync failed')
      }

      const data = await res.json()
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to sync CUR')
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Syncing CUR...' : 'Sync CUR Now'}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded shadow-lg z-10 whitespace-nowrap max-w-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs text-green-600 bg-green-50 rounded shadow-lg z-10 whitespace-nowrap">
          ✓ CUR sync started
        </div>
      )}
    </div>
  )
}

